import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  message,
  InputNumber,
  Select,
  Row,
  Col,
  Alert,
} from "antd";
import { WhatsAppOutlined } from "@ant-design/icons";
import { createWhatsappOrder } from "../../services/dispatch.service";
import { useQueryClient } from "@tanstack/react-query";

const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Map API / network errors to a clear dispatcher-facing message. */
function resolveErrorMessage(err: any): string {
  // Ant Design form validation — no toast needed
  if (err?.errorFields) return "";

  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data ?? err?.raw;
  const serverMsg =
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.message === "string" && data.message) ||
    (typeof err?.message === "string" && err.message) ||
    "";

  // Zod / validation details from backend
  if (data?.details && Array.isArray(data.details)) {
    const fields = data.details
      .map((d: any) => d?.message || d?.path?.join(".") || String(d))
      .filter(Boolean)
      .slice(0, 4);
    if (fields.length) return fields.join("; ");
  }

  if (status === 409 || /already exists/i.test(serverMsg)) {
    return "Order number already exists. Please use a different order number.";
  }
  if (status === 400) {
    return serverMsg || "Invalid order details. Check required fields and try again.";
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to create WhatsApp orders.";
  }
  if (status === 404) {
    return "WhatsApp order endpoint not found. The backend may need to be updated.";
  }
  if (status === 413) {
    return "Request is too large. Shorten the message excerpt and try again.";
  }
  if (status >= 500) {
    return "Server error while creating the order. Please try again in a moment.";
  }
  if (!err?.response && (err?.code === "ERR_NETWORK" || /network/i.test(serverMsg))) {
    return "Network error. Check your connection and try again.";
  }
  if (/timeout/i.test(serverMsg)) {
    return "Request timed out. Please try again.";
  }

  return serverMsg || "Failed to create WhatsApp order. Please try again.";
}

/**
 * Dispatcher UI for orders that arrived via WhatsApp.
 * Posts to POST /orders/whatsapp — order number is required and stored permanently.
 */
const CreateWhatsAppOrderModal: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
      setSubmitting(false);
    }
  }, [open]);

  const reset = () => {
    form.resetFields();
    setFormError(null);
  };

  const handleClose = () => {
    if (submitting) {
      message.warning("Please wait — the order is still being created.");
      return;
    }
    onClose();
    reset();
  };

  const handleCreate = async () => {
    setFormError(null);

    let values: any;
    try {
      values = await form.validateFields();
    } catch (validationErr: any) {
      // Highlight first invalid field; show summary alert
      const fields = validationErr?.errorFields || [];
      const summary =
        fields.length > 0
          ? `Please fix ${fields.length} field${fields.length > 1 ? "s" : ""}: ${fields
              .map((f: any) => f.errors?.[0])
              .filter(Boolean)
              .slice(0, 3)
              .join("; ")}`
          : "Please complete all required fields.";
      setFormError(summary);
      return;
    }

    const orderNumber = String(values.orderNumber || "").trim();
    if (!orderNumber) {
      setFormError("Order number is required.");
      form.setFields([{ name: "orderNumber", errors: ["Order number is required"] }]);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        orderNumber,
        externalId: orderNumber,
        customerName: String(values.customerName || "").trim(),
        phone: String(values.phone || "").trim(),
        address: String(values.address || "").trim(),
        destination: values.destination ? String(values.destination).trim() : undefined,
        amount: values.amount ?? 0,
        paymentType: values.paymentType || "COD",
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
        notes: values.notes ? String(values.notes).trim() : undefined,
        waSenderPhone: values.waSenderPhone
          ? String(values.waSenderPhone).trim()
          : undefined,
        waMessageExcerpt: values.waMessageExcerpt
          ? String(values.waMessageExcerpt).trim()
          : undefined,
      };

      const created = await createWhatsappOrder(payload);
      const order = created?.data ?? created;
      const saved = order?.orderNumber || order?.externalId || orderNumber;

      if (!created?.ok && created?.ok !== undefined && !order?.id) {
        throw {
          response: { status: 400, data: created },
          message: created?.error || "Unexpected response from server",
        };
      }

      message.success(`WhatsApp order created — ${saved}`);
      qc.invalidateQueries({ queryKey: ["dispatchOrders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["ordersPage"] });
      qc.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      onClose();
      reset();
    } catch (err: any) {
      const msg = resolveErrorMessage(err);
      if (!msg) return; // form validation already handled

      setFormError(msg);
      message.error(msg);

      // Focus order number field on duplicate
      const status = err?.response?.status ?? err?.status;
      if (status === 409 || /already exists/i.test(msg)) {
        form.setFields([
          {
            name: "orderNumber",
            errors: ["This order number is already in use"],
          },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <WhatsAppOutlined style={{ color: "#25D366", marginRight: 8 }} />
          Create WhatsApp Order
        </span>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnClose
      maskClosable={!submitting}
      keyboard={!submitting}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Transcribe an order that came in on WhatsApp"
        description="Enter the order number from the merchant chat. It is stored permanently and never auto-generated."
      />

      {formError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setFormError(null)}
          style={{ marginBottom: 12 }}
          message="Could not create order"
          description={formError}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ paymentType: "COD", amount: 0 }}
        onValuesChange={() => {
          if (formError) setFormError(null);
        }}
        disabled={submitting}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="orderNumber"
              label="Order Number"
              rules={[
                { required: true, message: "Order number is required" },
                {
                  validator: async (_, value) => {
                    if (value && !String(value).trim()) {
                      throw new Error("Order number cannot be blank");
                    }
                  },
                },
              ]}
              validateStatus={formError && /order number/i.test(formError) ? "error" : undefined}
            >
              <Input placeholder="e.g. WA-88421 or ORD-10025" maxLength={64} allowClear />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="waSenderPhone"
              label="WhatsApp Sender Phone"
              tooltip="Phone number of the WhatsApp chat (merchant or customer)"
              rules={[
                {
                  pattern: /^[+\d\s()-]*$/,
                  message: "Enter a valid phone number",
                },
              ]}
            >
              <Input placeholder="e.g. 2547xx xxx xxx" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="customerName"
              label="Customer Name"
              rules={[
                { required: true, message: "Customer name is required" },
                { min: 2, message: "Name is too short" },
              ]}
            >
              <Input placeholder="Customer full name" maxLength={120} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Customer Phone"
              rules={[
                { required: true, message: "Phone is required" },
                { min: 6, message: "Enter a valid phone number" },
              ]}
            >
              <Input placeholder="07xx xxx xxx" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="Pickup Location"
          rules={[{ required: true, message: "Pickup address is required" }]}
        >
          <Input placeholder="Pickup address" maxLength={300} />
        </Form.Item>

        <Form.Item name="destination" label="Destination">
          <Input placeholder="Delivery destination" maxLength={300} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Amount (KSh)"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "Amount cannot be negative",
                },
              ]}
            >
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="paymentType" label="Payment Type">
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

        <Form.Item
          name="waMessageExcerpt"
          label="WhatsApp Message Excerpt"
          tooltip="Paste a short excerpt from the chat for reference"
          rules={[{ max: 2000, message: "Message excerpt is too long (max 2000 characters)" }]}
        >
          <TextArea
            rows={2}
            maxLength={2000}
            showCount
            placeholder="Optional — paste relevant chat text"
          />
        </Form.Item>

        <Form.Item name="notes" label="Internal Notes">
          <TextArea rows={2} maxLength={1000} placeholder="Dispatcher notes" />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleCreate}
            style={{ background: "#25D366", borderColor: "#25D366" }}
            icon={<WhatsAppOutlined />}
          >
            {submitting ? "Creating…" : "Create WhatsApp Order"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateWhatsAppOrderModal;
