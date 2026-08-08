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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import client from "../../api/client";
import { deleteOrder } from "../../services/dispatch.service";
import AssignRiderModal from "../dispatch/AssignRiderModal";
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
};

interface OrdersTableProps {
  filters?: Record<string, any>;
  onSelectionChange?: (ids: string[]) => void;
  selectedRowKeys?: string[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  filters = {},
  onSelectionChange,
  selectedRowKeys = [],
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [isReassign, setIsReassign] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [form] = Form.useForm();

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: search || filters.search || undefined,
      limit: filters.limit || 50,
      page: filters.page || 1,
    }),
    [filters, search]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["ordersPage", queryFilters],
    queryFn: async () => {
      const res = await client.get("/orders", { params: queryFilters });
      return res.data;
    },
    keepPreviousData: true,
  });

  const orders: any[] = Array.isArray(data) ? data : data?.items || data?.data || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
    queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const openAssign = (order: any, reassign = false) => {
    setAssignOrderId(order.id);
    setIsReassign(reassign);
    setAssignOpen(true);
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    form.setFieldsValue({
      orderNumber: getOrderDisplayNumber(order),
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      destination: order.destination,
      notes: order.notes,
      status: order.status,
      scheduledAt: order.scheduledAt ? dayjs(order.scheduledAt) : null,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingOrder) return;
    try {
      const values = await form.validateFields();
      setEditLoading(true);
      const payload: any = {
        customerName: values.customerName,
        phone: values.phone,
        address: values.address,
        destination: values.destination,
        notes: values.notes,
        status: values.status,
        orderNumber: values.orderNumber,
        externalId: values.orderNumber,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
      };
      await client.put(`/orders/${editingOrder.id}`, payload);
      message.success("Order updated");
      setEditOpen(false);
      setEditingOrder(null);
      refresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || err?.message || "Failed to update order");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (order: any) => {
    const displayNo = getOrderDisplayNumber(order);
    Modal.confirm({
      title: "Are you sure you want to delete this order?",
      content: `Order ${displayNo} will be removed from Orders and Dispatch. You can restore it later from deleted records.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteOrder(order.id);
          message.success("Order moved to deleted records");
          refresh();
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
        }
      },
    });
  };

  const columns = [
    {
      title: "Order No.",
      key: "orderNumber",
      width: 140,
      render: (_: any, record: any) => (
        <a href={`/orders/${record.id}`}>{getOrderDisplayNumber(record)}</a>
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
      render: (v: string) => v || "—",
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
      render: (_: any, record: any) =>
        record.rider?.name || (record.riderId ? "Assigned" : "—"),
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
            {!hasRider ? (
              <Tooltip title="Assign rider">
                <Button
                  type="primary"
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => openAssign(record, false)}
                >
                  Assign
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Reassign rider">
                <Button
                  size="small"
                  style={{ background: "#fa8c16", borderColor: "#fa8c16", color: "#fff" }}
                  icon={<SwapOutlined />}
                  onClick={() => openAssign(record, true)}
                >
                  Reassign
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Edit order">
              <Button
                size="small"
                style={{ background: "#52c41a", borderColor: "#52c41a", color: "#fff" }}
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="Delete order">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              >
                Delete
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  if (isLoading && !orders.length) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by order number, customer, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{
          current: queryFilters.page,
          pageSize: queryFilters.limit,
          total: data?.total,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            // parent may control filters; local search still works
          },
        }}
        rowSelection={
          onSelectionChange
            ? {
                selectedRowKeys,
                onChange: (keys) => onSelectionChange(keys as string[]),
              }
            : undefined
        }
      />

      <AssignRiderModal
        open={assignOpen}
        orderId={assignOrderId}
        onClose={() => {
          setAssignOpen(false);
          setAssignOrderId(null);
          setIsReassign(false);
        }}
        onAssigned={() => {
          setAssignOpen(false);
          setAssignOrderId(null);
          setIsReassign(false);
          refresh();
          message.success(isReassign ? "Rider reassigned" : "Rider assigned");
        }}
      />

      <Modal
        title="Edit Order"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingOrder(null);
        }}
        onOk={handleEdit}
        confirmLoading={editLoading}
        okText="Save"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="orderNumber"
            label="Order Number"
            rules={[{ required: true, message: "Order number is required" }]}
            extra={
              editingOrder && !isOrderNumberEditable(editingOrder)
                ? "Order number is locked after assignment"
                : undefined
            }
          >
            <Input
              placeholder="e.g. ORD-10025"
              disabled={!!(editingOrder && !isOrderNumberEditable(editingOrder))}
            />
          </Form.Item>
          <Form.Item
            name="customerName"
            label="Customer"
            rules={[{ required: true, message: "Customer name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: "Phone is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Pickup">
            <Input />
          </Form.Item>
          <Form.Item name="destination" label="Destination">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Scheduled Time">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { value: "NEW", label: "NEW" },
                { value: "ASSIGNED", label: "ASSIGNED" },
                { value: "PICKED_UP", label: "PICKED_UP" },
                { value: "IN_TRANSIT", label: "IN_TRANSIT" },
                { value: "DELIVERED", label: "DELIVERED" },
                { value: "FAILED", label: "FAILED" },
                { value: "RETURNED", label: "RETURNED" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrdersTable;
