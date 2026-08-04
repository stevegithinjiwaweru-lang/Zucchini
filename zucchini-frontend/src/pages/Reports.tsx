import React, { useState } from "react";
import { Card, Button, message } from "antd";
import client from "../api/client";

// Fetch all orders for export. The Merchant model has been phased out
// (Zucchini now runs as a single-merchant operation, see backend
// orders.controller.ts), so this used to filter orders down to whichever
// ones were linked to a merchant literally named "Zucchini" — a merchant
// record that's no longer joined onto orders at all, so that filter always
// matched zero rows and every export came back empty. Reports now just
// export every order.
const fetchOrders = async () => {
  const { data } = await client.get("/orders", { params: { limit: 200 } });
  return Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // EXPORT CSV
  const exportCSV = async () => {
    try {
      setLoading(true);

      const orders = await fetchOrders();

      const headers = ["Order No.", "Order ID", "Customer", "Phone", "Address", "Amount", "Status"];

      const rows = orders.map((o: any) => [
        o.externalId || "",
        o.id,
        o.customerName,
        o.phone,
        o.address,
        o.amount,
        o.status,
      ]);

      const csvContent = [headers, ...rows].map((row) => row.map((c: any) => String(c ?? "")).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `zucchini-orders-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("CSV exported successfully");
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

      const orders = await fetchOrders();

      const win = window.open("", "_blank");
      if (!win) return;

      win.document.write("<h1>Zucchini Orders Report</h1>");
      win.document.write("<table border='1' cellpadding='5'>");
      win.document.write(
        "<tr><th>Order No.</th><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr>"
      );

      orders.forEach((o: any) => {
        win?.document.write(`
          <tr>
            <td>${o.externalId || ""}</td>
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

      message.success("PDF ready for printing");
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
            Export CSV
          </Button>

          <Button onClick={exportPDF} loading={loading}>
            Export PDF
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
