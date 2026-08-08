import React, { useState } from "react";
import { Form, Input, Button, Upload, Card, message, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

const ZUCCHINI_NAMES = new Set(["zucchini", "zuchinni"]);

const fetchMerchants = async () => {
  let data: any = [];
  try { data = (await client.get("/merchants")).data; } catch { data = []; }
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
};

export default function DispatchOrderUpload() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: merchants = [] } = useQuery({ queryKey: ["merchants"], queryFn: fetchMerchants });

  // Find Zucchini merchant if it exists; if not, we allow creating orders without
  // a merchantId so the app continues to function after the Merchant model is removed.
  const zucchini = (merchants || []).find((m: any) => ZUCCHINI_NAMES.has((m?.name || "").toLowerCase()));

  const handleCreate = async (values: any) => {
    const orderNumber = values.orderNumber
      ? String(values.orderNumber).trim()
      : values.externalId
        ? String(values.externalId).trim()
        : "";
    if (!orderNumber) {
      message.error("Please enter an order number");
      return;
    }
    const payload: any = {
      customerName: values.customerName,
      phone: values.phone,
      address: values.address,
      amount: Number(values.amount || 0),
      paymentType: values.paymentType || "COD",
      lat: values.lat ? Number(values.lat) : undefined,
      lng: values.lng ? Number(values.lng) : undefined,
      // Your own order number — required by the backend, never auto-generated.
      orderNumber,
      externalId: orderNumber,
    };

    // Only include merchantId if zucchini integration is present
    if (zucchini && zucchini.id) payload.merchantId = zucchini.id;

    try {
      const { data } = await client.post("/orders", payload);
      const order = data?.data ?? data;
      message.success("Order created: " + (order?.orderNumber ?? order?.externalId ?? orderNumber));
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || "Failed to create order");
    }
  };

  const handleCsv = async (file: any) => {
    const fd = new FormData();
    fd.append("file", file);
    if (zucchini && zucchini.id) fd.append("merchantId", zucchini.id);

    try {
      setUploading(true);
      const res = await client.post("/orders/upload-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const count = res.data?.imported ?? res.data?.count ?? 0;
      message.success(`CSV imported: ${count} orders`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || "CSV upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card title="Create / Upload Zucchini Orders" style={{ marginBottom: 16 }}>
      {!zucchini && (
        <div style={{ color: "#faad14", marginBottom: 12 }}>
          Zucchini merchant not found. Orders will be created without a merchant association.
        </div>
      )}
      <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 12 }}>
        CSV must include an order number column (<code>externalId</code> or <code>orderNumber</code>) plus customerName, phone, and address/pickup. Each order number is stored permanently — never auto-generated.
      </div>

      <Form form={form} layout="vertical" onFinish={handleCreate}>
        <Form.Item
          name="orderNumber"
          label="Order Number"
          rules={[{ required: true, message: "Please enter an order number" }]}
        >
          <Input placeholder="Your own order reference number" />
        </Form.Item>
        <Form.Item name="customerName" label="Customer name" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address" rules={[{ required: true }]}> 
          <Input />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Create Order
            </Button>
            <Upload
              beforeUpload={(file) => {
                handleCsv(file);
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload CSV
              </Button>
            </Upload>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
