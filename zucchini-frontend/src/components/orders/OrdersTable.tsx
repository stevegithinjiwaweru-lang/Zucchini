import React, { useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Spin,
  Tooltip,
} from "antd";
import {
  UserAddOutlined,
  SwapOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { UserAddOutlined as UserAddIcon, SwapOutlined as SwapIcon } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import client from "../../../api/client";
import { deleteOrder } from "../../../services/dispatch.service";
import AssignRiderModal from "../dispatch/AssignRiderModal";
import AssignRiderModalLocal from "../dispatch/AssignRiderModal";
import { getOrderDisplayNumber } from "../../utils/orderNumber";

const LOCKED_STATUSES = new Set(["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"]);
function isOrderNumberEditable(order: any) {
  if (!order) return true;
  if (order.riderId || order.rider?.id) return false;
  return !LOCKED_STATUSES.has(order.status);
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "blue",
  ASSIGNED: "orange",
  PICKED_UP: "cyan",
  IN_TRANSIT: "purple",
  DELIVERED: "green",
  FAILED: "red",
  RETURNED: "default",
  RETURNED: "default",
};

interface OrdersTableProps {
  filters?: Record<string, any>;
  onSelectionChange?: (ids: string[]) => void;
  selectedRowKeys?: string[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({ filters = {}, onSelectionChange, selectedRowKeys = [] }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState(null as any);
  const [isReassign, setIsReassign] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editOpen2, setEditOpen2] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editLoading, setEditingLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  const queryFilters = useMemo(() => ({ ...filters, search, page: 1 }), [filters, search]);

  const { data, isLoading } = useQuery(["ordersPage", queryFilters], async () => {
    const res = await client.get("/orders", { params: queryFilters });
    return res.data;
  });

  const rows = Array.isArray(data?.data) ? data.data : [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
    queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const openAssign = (order: any, reassign = false) => {
    setAssignOrderId(order.id);
    setAssignOpen(true);
    setIsReassign(reassign);
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    form.setFieldsValue({
      externalId: getOrderDisplayNumber(order),
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      destination: order.destination,
      amount: order.amount,
      paymentType: order.paymentType,
      notes: order.notes,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await form.validateFields() as any;
      setEditingLoading(true);
      const payload = {
        externalId: values.externalId,
        customerName: values.customerName,
        phone: values.phone,
        address: values.address,
        destination: values.destination,
        amount: values.amount,
        paymentType: values.paymentType,
        notes: values.notes,
      };

      const r = editingOrder
        ? await client.put(`/orders/${editingOrder.id}`, payload)
        : await client.post("/orders", payload);

      // ... handle response
      refresh();
      setEditOpen(false);
    } finally {
      setEditingLoading(false);
    }
  };

  const columns = [
    {
      title: "Order No.",
      key: "orderNumber",
      width: 140,
      render: (v: any) => (
        <a href={`orders/${v.id}`}>{getOrderDisplayNumber(v)}</a>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      ellipsis: true,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Pickup",
      dataIndex: "address",
      key: "address",
      ellipsis: true,
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLORS[s] || "default"}>{s}</Tag>,
    },
    {
      title: "Rider",
      key: "rider",
      width: 120,
      render: (_: any, record: any) => (record.rider ? (<div>{record.rider?.name || "Assigned"}</div>) : (<div>No Rider Assigned</div>)),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (d: string) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      fixed: "right" as const,
      render: (_: any, record: any) => {
        const hasRider = !!(record.riderId || record.rider?.id);
        return (
          <Space size={4} wrap>
            {hasRider ? (
              <div>
                <div><strong>{hasRider ? (record.rider?.name || "Assigned") : ""}</strong></div>
              </div>
            ) : (
              <div>
                <Tooltip title="Assign rider">
                  <Button size="small" icon={<UserAddOutlined />} onClick={() => openAssign(record, false)}>Assign</Button>
                </Tooltip>
                <Tooltip title="Reassign rider">
                  <Button size="small" icon={<SwapOutlined />} onClick={() => openAssign(record, true)}>Reassign</Button>
                </Tooltip>
              </div>
            )}
            <Tooltip title="Edit order">
              <Button size="small" style={{ background: "#52c41a", borderColor: "#52c41a", color: "#fff" }} icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
            </Tooltip>
            <Tooltip title="Delete order">
              <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>Delete</Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  if (isLoading && !rows.length) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Spin size="large" />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={{ isLoading }}
        scroll={{ x: 1200 }}
        pagination={{
          current: queryFilters.page,
          pageSize: queryFilters.pageSize,
          total: data?.total,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            // parent may control filters; local search still works
          },
        }}
        rowSelection={{
          onChange: (selectedKeys) => onSelectionChange && onSelectionChange(selectedKeys as string[]),
        }}
      />

      <AssignRiderModal
        open={assignOpen}
        orderId={assignOrderId}
        onClose={() => {
          setAssignOpen(false);
          setAssignOrderId(null);
        }}
        onAssigned={() => {
          setAssignOpen(false);
          refresh();
        }}
      />

      <Modal
        title="Edit Order"
        open={editOpen}
        onOk={handleEdit}
        confirmLoading={editLoading}
        onCancel={() => setEditOpen(false)}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="externalId"
            label="External ID (Order Number)"
            rules={[{ required: true, message: "External ID is required for manual orders" }]}
          >
            <Input placeholder="EX-2026-0001" disabled={!(editingOrder && !isOrderNumberEditable(editingOrder))} />
          </Form.Item>

          <Form.Item name="customerName" label="Customer">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Pickup">
            <Input />
          </Form.Item>
          <Form.Item name="destination" label="Destination">
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Order Value">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrdersTable;
