import React, { useState } from "react";
import { Card, Button, message } from "antd";
import client from "../api/client";

// Accept common spellings used in seed/docs
const ZUCCHINI_NAMES = new Set(["zucchini", "zuchinni"]);

const fetchOrders = async () => {
  const { data } = await client.get("/orders");
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.orders) ? data.orders : data || [];
};

const fetchMerchants = async () => {
  const { data } = await client.get("/merchants");
  return Array.isArray(data?.items) ? data.items : data || [];
};

const isZucchiniOrder = (o: any, merchantNameById: Map<string, string>) => {
  const nameFromOrder = (o?.merchant?.name || "").toLowerCase();
  if (nameFromOrder && ZUCCHINI_NAMES.has(nameFromOrder)) return true;
  const nameFromId = merchantNameById.get(o?.merchantId || "") || "";
  return ZUCCHINI_NAMES.has(nameFromId);
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // EXPORT CSV
  const exportCSV = async () => {
    try {
      setLoading(true);

      const [orders, merchants] = await Promise.all([fetchOrders(), fetchMerchants()]);

      const merchantNameById = new Map<string, string>();
      for (const m of merchants) merchantNameById.set(m.id, (m.name || "").toLowerCase());

      const filtered = orders.filter((o: any) => isZucchiniOrder(o, merchantNameById));

      const headers = ["Order ID", "Customer", "Phone", "Address", "Amount", "Status"];

      const rows = filtered.map((o: any) => [o.id, o.customerName, o.phone, o.address, o.amount, o.status]);

      const csvContent = [headers, ...rows].map((row) => row.map((c: any) => String(c ?? "")).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `zucchini-orders-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("CSV exported successfully (Zucchini-only)");
    } catch (err) {
      console.error(err);
      message.error("Failed to export CSV");
    } finally {
      setLoading(false);
    }
  };

  // EXPORT PDF (simple frontend version)
  const exportPDF = async () => {
    try {
      setLoading(true);

      const [orders, merchants] = await Promise.all([fetchOrders(), fetchMerchants()]);

      const merchantNameById = new Map<string, string>();
      for (const m of merchants) merchantNameById.set(m.id, (m.name || "").toLowerCase());

      const filtered = orders.filter((o: any) => isZucchiniOrder(o, merchantNameById));

      const win = window.open("", "_blank");
      if (!win) return;

      win.document.write("<h1>Zucchini Orders Report</h1>");
      win.document.write("<table border='1' cellpadding='5'>");
      win.document.write("<tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr>");

      filtered.forEach((o: any) => {
        win?.document.write(`
          <tr>
            <td>${o.id}</td>
            <td>${o.customerName}</td>
            <td>${o.amount}</td>
            <td>${o.status}</td>
          </tr>
        `);
      });

      win.document.write("</table>");
      win.document.close();
      win.print();

      message.success("PDF ready for printing (Zucchini-only)");
    } catch (err) {
      console.error(err);
      message.error("Failed to export PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Reports</h2>

      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={exportCSV} loading={loading}>
            Export CSV (Zucchini)
          </Button>

          <Button onClick={exportPDF} loading={loading}>
            Export PDF (Zucchini)
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
