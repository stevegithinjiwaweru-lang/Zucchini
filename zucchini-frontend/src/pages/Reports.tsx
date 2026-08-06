import React, { useState } from "react";
import { Card, Button, Space, Select, DatePicker, message, Row, Col } from "antd";
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from "@ant-design/icons";
import client from "../api/client";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const fetchOrders = async (params: Record<string, any> = {}) => {
  const { data } = await client.get("/orders", { params: { limit: 500, ...params } });
  return Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];
};

const orderNo = (o: any) => o.orderNumber || o.externalId || "";

const toCsv = (headers: string[], rows: any[][]) => {
  const escape = (c: any) => {
    const s = String(c ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
};

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

type ReportType = "daily" | "completed" | "cancelled" | "all" | "rider";

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const buildParams = () => {
    const params: Record<string, any> = {};
    if (reportType === "completed") params.status = "DELIVERED";
    if (reportType === "cancelled") params.status = "FAILED";
    if (reportType === "daily" || range) {
      const from = range?.[0] || dayjs().startOf("day");
      const to = range?.[1] || dayjs().endOf("day");
      params.dateFrom = from.format("YYYY-MM-DD");
      params.dateTo = to.format("YYYY-MM-DD");
    }
    return params;
  };

  const load = async () => fetchOrders(buildParams());

  const exportCSV = async () => {
    try {
      setLoading(true);
      const orders = await load();
      const headers = [
        "Order No.",
        "Customer",
        "Phone",
        "Pickup",
        "Destination",
        "Amount",
        "Status",
        "Rider",
        "Created At",
        "Delivered At",
      ];
      const rows = orders.map((o: any) => [
        orderNo(o),
        o.customerName,
        o.customerPhone || o.phone,
        o.pickupLocation || o.address,
        o.destination,
        o.amount,
        o.status,
        o.rider?.name || "",
        o.createdAt,
        o.deliveredAt || "",
      ]);
      downloadBlob(toCsv(headers, rows), `zucchini-${reportType}-${Date.now()}.csv`, "text/csv;charset=utf-8;");
      message.success("CSV exported");
    } catch (err) {
      console.error(err);
      message.error("Failed to export CSV");
    } finally {
      setLoading(false);
    }
  };

  /** Excel-compatible TSV (opens cleanly in Excel without extra libs) */
  const exportExcel = async () => {
    try {
      setLoading(true);
      const orders = await load();
      const headers = [
        "Order No.",
        "Customer",
        "Phone",
        "Pickup",
        "Destination",
        "Amount",
        "Status",
        "Rider",
        "Created At",
        "Delivered At",
      ];
      const rows = orders.map((o: any) => [
        orderNo(o),
        o.customerName,
        o.customerPhone || o.phone,
        o.pickupLocation || o.address,
        o.destination,
        o.amount,
        o.status,
        o.rider?.name || "",
        o.createdAt,
        o.deliveredAt || "",
      ]);
      const tsv = [headers, ...rows].map((r) => r.map((c) => String(c ?? "").replace(/\t/g, " ")).join("\t")).join("\n");
      downloadBlob("\ufeff" + tsv, `zucchini-${reportType}-${Date.now()}.xls`, "application/vnd.ms-excel");
      message.success("Excel file exported");
    } catch (err) {
      console.error(err);
      message.error("Failed to export Excel");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      setLoading(true);
      const orders = await load();
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<html><head><title>Zucchini Report</title>
        <style>body{font-family:sans-serif} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px;font-size:12px} th{background:#f5f5f5}</style>
        </head><body>`);
      win.document.write(`<h1>Zucchini Orders Report — ${reportType}</h1>`);
      win.document.write("<table><tr><th>Order No.</th><th>Customer</th><th>Phone</th><th>Status</th><th>Rider</th><th>Amount</th></tr>");
      orders.forEach((o: any) => {
        win.document.write(`<tr>
          <td>${orderNo(o)}</td>
          <td>${o.customerName || ""}</td>
          <td>${o.customerPhone || o.phone || ""}</td>
          <td>${o.status || ""}</td>
          <td>${o.rider?.name || ""}</td>
          <td>${o.amount ?? ""}</td>
        </tr>`);
      });
      win.document.write("</table></body></html>");
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
    <Card title="Reports">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            value={reportType}
            onChange={setReportType}
            style={{ minWidth: 200 }}
            options={[
              { value: "daily", label: "Daily Orders" },
              { value: "completed", label: "Completed Orders" },
              { value: "cancelled", label: "Cancelled / Failed" },
              { value: "all", label: "All Orders" },
              { value: "rider", label: "Rider Performance (all)" },
            ]}
          />
        </Col>
        <Col>
          <RangePicker
            value={range as any}
            onChange={(v) => setRange(v as any)}
            allowClear
          />
        </Col>
      </Row>

      <Space wrap>
        <Button type="primary" icon={<FileTextOutlined />} loading={loading} onClick={exportCSV}>
          Export CSV
        </Button>
        <Button icon={<FileExcelOutlined />} loading={loading} onClick={exportExcel}>
          Export Excel
        </Button>
        <Button icon={<FilePdfOutlined />} loading={loading} onClick={exportPDF}>
          Export PDF
        </Button>
      </Space>
    </Card>
  );
};

export default Reports;
