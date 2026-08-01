import React, { useState } from "react";
import { Form, Input, Button, Upload, Card, message, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

const ZUCCHINI_NAMES = new Set(["zucchini", "zuchinni"]);

const fetchMerchants = async () => {
  const { data } = await client.get("/merchants");
  return Array.isArray(data?.items) ? data.items : [];
};

export default function DispatchOrderUpload() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: merchants = [] } = useQuery({ queryKey: ["merchants"], queryFn: fetchMerchants });

  const zucchini = (merchants || []).find((m: any) => ZUCCHINI_NAMES.has((m?.name || "").toLowerCase()));

  const handleCreate = async (values: any) => {
    if (!zucchini) return message.error("Zucchini merchant not found");

    const payload = {
      merchantId: zucchini.id,
      customerName: values.customerName,
      phone: values.phone,
      address: values.address,
      amount: Number(values.amount || 0),
      paymentType: values.paymentType || "COD",
      lat: values.lat ? Number(values.lat) : undefined,
      lng: values.lng ? Number(values.lng) : undefined,
    };

    try {
      const { data } = await client.post("/orders", payload);
      message.success("Order created: " + (data?.order?.id ?? "(no id)"));
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.error || err?.message || "Failed to create order");
    }
  };

  const handleCsv = async (file: any) => {
    if (!zucchini) return message.error("Zucchini merchant not found");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("merchantId", zucchini.id);

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
      message.error(err?.response?.data?.error || err?.message || "CSV upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card title="Create / Upload Zucchini Orders" style={{ marginBottom: 16 }}>
      {!zucchini && (
        <div style={{ color: "#ff4d4f", marginBottom: 12 }}>
          Zucchini merchant not found. Please ensure the Zucchini integration exists in Merchants.
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={handleCreate}>
        <Form.Item name="customerName" label="Customer name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address" rules={[{ required: true }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="amount" label="Amount (KSh)">
          <Input type="number" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" disabled={!zucchini}>
              Create Order
            </Button>
            <Upload
              maxCount={1}
              accept=".csv"
              beforeUpload={(file) => {
                handleCsv(file);
                return false;
              }}
              showUploadList={false}
              disabled={!zucchini}
            >
              <Button icon={<UploadOutlined />} loading={uploading} disabled={!zucchini}>
                Upload CSV (WhatsApp orders)
              </Button>
            </Upload>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
