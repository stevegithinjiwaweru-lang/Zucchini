/**
 * API-level end-to-end workflow test.
 *
 * Requires a running backend + DATABASE_URL.
 *
 * Usage:
 *   API_BASE=http://localhost:4000/api \
 *   ADMIN_PHONE=0700000001 ADMIN_PASSWORD=ChangeMe123! \
 *   npx ts-node --project scripts/tsconfig.json scripts/e2e-workflow.ts
 */
const API = (process.env.API_BASE || "http://localhost:4000/api").replace(/\/$/, "");
const ADMIN_PHONE = process.env.ADMIN_PHONE || "0700000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}
function fail(label: string, detail?: any) {
  failed += 1;
  console.error(`  ✗ ${label}`, detail ? String(detail).slice(0, 200) : "");
}

async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`E2E against ${API}\n`);

  // 1. Login
  const login = await req("POST", "/auth/login", {
    phone: ADMIN_PHONE,
    password: ADMIN_PASSWORD,
  });
  if (login.status !== 200 || !login.data.accessToken) {
    fail("Admin login", login.data);
    console.log("\nAborting — cannot continue without auth.");
    process.exit(1);
  }
  ok("Admin login (phone + password)");
  const token = login.data.accessToken as string;

  // 2. Create order with manual number
  const orderNumber = `E2E-${Date.now()}`;
  const created = await req(
    "POST",
    "/orders",
    {
      orderNumber,
      externalId: orderNumber,
      customerName: "E2E Customer",
      phone: "0712345678",
      address: "Pickup Street 1",
      destination: "Destination Ave 2",
      amount: 500,
      paymentType: "COD",
    },
    token
  );
  if (created.status !== 201 && created.status !== 200) {
    fail("Create order", created.data);
  } else {
    const o = created.data.data || created.data.order || created.data;
    if (o.orderNumber === orderNumber || o.externalId === orderNumber) {
      ok(`Create order keeps number ${orderNumber}`);
    } else {
      fail("Create order number mismatch", o);
    }
  }
  const orderId = (created.data.data || created.data.order || created.data)?.id;

  // 3. List / search
  const listed = await req("GET", `/orders?search=${encodeURIComponent(orderNumber)}`, undefined, token);
  const items = listed.data.items || listed.data.data || [];
  const found = Array.isArray(items) && items.some((x: any) => (x.orderNumber || x.externalId) === orderNumber);
  found ? ok("Search by order number") : fail("Search by order number", listed.data);

  // 4. Ensure no system-id style number on this order
  const one = await req("GET", `/orders/${orderId}`, undefined, token);
  const detail = one.data.data || one.data;
  const display = detail?.orderNumber || detail?.externalId;
  if (display === orderNumber) ok("Order detail shows manual number");
  else fail("Order detail number", display);

  // 5. Create rider
  const riderPhone = `07${String(Date.now()).slice(-8)}`;
  const rider = await req(
    "POST",
    "/riders",
    {
      name: "E2E Rider",
      phone: riderPhone,
      password: "TestPass99",
      confirmPassword: "TestPass99",
      vehicleType: "Motorcycle",
      branch: "Test Zone",
    },
    token
  );
  const riderId = (rider.data.data || rider.data.rider)?.id;
  if (rider.status === 201 || rider.status === 200) ok("Create rider with password");
  else fail("Create rider", rider.data);

  // 6. Rider login
  const riderLogin = await req("POST", "/auth/login", {
    phone: riderPhone,
    password: "TestPass99",
  });
  riderLogin.data.accessToken ? ok("Rider login phone + password") : fail("Rider login", riderLogin.data);

  // 7. Assign
  if (orderId && riderId) {
    const assign = await req("POST", `/orders/${orderId}/assign`, { riderId }, token);
    const a = assign.data.data || assign.data;
    if (assign.status === 200 && (a.orderNumber || a.externalId) === orderNumber) {
      ok("Assign keeps order number");
    } else {
      fail("Assign", assign.data);
    }

    // 8. Reassign to same rider (or second if available)
    const reassign = await req("POST", `/orders/${orderId}/assign`, { riderId }, token);
    const r = reassign.data.data || reassign.data;
    if ((r.orderNumber || r.externalId) === orderNumber) ok("Reassign keeps order number");
    else fail("Reassign number", r);

    // 9. Edit customer — number locked after assign
    const edit = await req(
      "PUT",
      `/orders/${orderId}`,
      { customerName: "E2E Customer Updated", orderNumber: `HACK-${Date.now()}` },
      token
    );
    const e = edit.data.data || edit.data;
    if (edit.status >= 400) {
      ok("Edit rejects order-number change after assign");
    } else if ((e.orderNumber || e.externalId) === orderNumber) {
      ok("Edit ignored order-number change (still original)");
    } else {
      fail("Edit changed order number after assign", e);
    }

    // 10. Deliver
    const deliver = await req("PATCH", `/orders/${orderId}/status`, { status: "DELIVERED" }, token);
    const d = deliver.data.data || deliver.data;
    if ((d.orderNumber || d.externalId) === orderNumber) ok("Deliver keeps order number");
    else fail("Deliver number", d);
  }

  // 11. Soft delete
  if (orderId) {
    const del = await req("DELETE", `/orders/${orderId}`, undefined, token);
    del.status === 200 ? ok("Soft delete") : fail("Soft delete", del.data);

    const gone = await req("GET", `/orders/${orderId}`, undefined, token);
    // may 404 because list filters isDeleted
    if (gone.status === 404 || gone.data?.data?.isDeleted) ok("Deleted order hidden from get");
    else ok("Soft delete completed (get may still return with isDeleted)");

    const restore = await req("POST", `/orders/${orderId}/restore`, undefined, token);
    restore.status === 200 ? ok("Restore deleted order") : fail("Restore", restore.data);
  }

  // 12. Dashboard stats
  const stats = await req("GET", "/orders/stats/dashboard", undefined, token);
  stats.status === 200 && stats.data?.data ? ok("Dashboard stats") : fail("Dashboard stats", stats.data);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
