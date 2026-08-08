import React, { useState } from "react";
import { Card, Table, Button, Space, message, Tag, Modal } from "antd";
import { UndoOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import { getOrderDisplayNumber } from "../utils/orderNumber";

const DeletedOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["deletedOrders"],
    queryFn: async () => {
      const res = await client.get("/orders", { params: { onlyDeleted: "true", limit: 100 } });
      return res.data;
    },
  });

  const orders: any[] = Array.isArray(data) ? data : data?.items || data?.data || [];

  const restore = (order: any) => {
    Modal.confirm({
      title: "Restore this order?",
      content: `Order ${getOrderDisplayNumber(order)} will reappear on Orders and Dispatch.`,
      okText: "Restore",
      onOk: async () => {
        setRestoringId(order.id);
        try {
          await client.post(`/orders/${order.id}/restore`);
          message.success("Order restored");
          queryClient.invalidateQueries({ queryKey: ["deletedOrders"] });
          queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.message || "Failed to restore");
        } finally {
          setRestoringId(null);
        }
      },
    });
  };

  const columns = [
    {
      title: "Order No.",
      key: "orderNumber",
      render: (_: any, r: any) => getOrderDisplayNumber(r),
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName" },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      render: (d: string) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<UndoOutlined />}
          loading={restoringId === record.id}
          onClick={() => restore(record)}
        >
          Restore
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Deleted Orders"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={orders}
        columns={columns}
        pagination={{ pageSize: 25 }}
        locale={{ emptyText: "No deleted orders" }}
      />
    </Card>
  );
};

export default DeletedOrders;
