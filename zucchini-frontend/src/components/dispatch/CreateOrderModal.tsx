import React, { useState } from "react";
import { Modal, Form, Input, DatePicker, Button, message, InputNumber, Select, Row, Col } from "antd";
import { createOrder } from "../../services/dispatch.service";
import { useQueryClient } from "@tanstack/react-query";
import LocationPicker, { LocationValue } from "./LocationPicker";

const CreateOrderModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState<LocationValue | null>(null);
  const [destination, setDestination] = useState<LocationValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    form.resetFields();
    setPickup(null);
    setDestination(null);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();

      if (!pickup) {
        message.error("Please select a pickup location on the map");
        return;
      }
      if (!destination) {
        message.error("Please select a destination on the map");
        return;
      }

      setSubmitting(true);

      const payload = {
        customerName: values.customerName,
        phone: values.phone,
        address: pickup.address,
        destination: destination.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        amount: values.amount || 0,
        paymentType: values.paymentType || "COD",
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
        notes: values.notes,
        externalId: values.externalId ? String(values.externalId).trim() : undefined,
      };

      await createOrder(payload);
      message.success("Order created");
      qc.invalidateQueries(["dispatchOrders"]);
      qc.invalidateQueries(["orders"]);
      onClose();
      reset();
    } catch (err: any) {
      // server returns 409 with message when externalId duplicates — this will be shown to the user
      message.error(err?.response?.data?.error || err?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create Order"
      open={open}
      onCancel={() => {
        onClose();
        reset();
      }}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* New: Order number (optional) */}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="externalId" label="Order number (optional)">
              <Input placeholder="e.g. INV-1002 or your reference number" />
            </Form.Item>
          </Col>
        </Row>

        <LocationPicker label="Pickup Location" value={pickup} onChange={setPickup} />
        <LocationPicker label="Destination" value={destination} onChange={setDestination} />

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="amount" label="Amount (KSh)" initialValue={0}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="paymentType" label="Payment Type" initialValue="COD">
              <Select
                options={[
                  { value: "COD", label: "Cash on Delivery" },
                  { value: "PREPAID", label: "Prepaid" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="scheduledAt" label="Scheduled Time">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateOrderModal;
