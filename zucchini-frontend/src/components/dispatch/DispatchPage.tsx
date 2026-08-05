import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Spin, Empty, Table, Button, Dropdown, Modal, message } from "antd";
import { DownOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import DispatchFilters from "./DispatchFilters";
import AssignRiderModal from "./AssignRiderModal";
import DispatchToolbar from "./DispatchToolbar";
import CreateOrderModal from "./CreateOrderModal";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { fetchPendingDispatchOrders, deleteOrder } from "../../services/dispatch.service";
import { getSocket } from "../../services/socket";
import client from "../../api/client";

import StatusTag from "../common/StatusTag";
import { ensureArray } from "../../utils/normalize";
import "./dispatch.css";

const DispatchPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<any>({
    page: 1,
    limit: 25,
    sort: "-createdAt",
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetOrder, setAssignTargetOrder] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dispatchOrders", filters],
    queryFn: () => fetchPendingDispatchOrders(filters),
    keepPreviousData: true,
    initialData: [],
    select: (d) => ensureArray(d),
  });

  useEffect(() => {
    const socket = getSocket();

    if (!socket) return;

    const refreshDispatch = () => {
      queryClient.invalidateQueries({
        queryKey: ["dispatchOrders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    };

    socket.on("order:assigned", refreshDispatch);
    socket.on("order:unassigned", refreshDispatch);
    socket.on("order:status:update", refreshDispatch);

    return () => {
      socket.off("order:assigned", refreshDispatch);
      socket.off("order:unassigned", refreshDispatch);
      socket.off("order:status:update", refreshDispatch);
    };
  }, [queryClient]);

  const orders = useMemo(() => ensureArray(data), [data]);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Delete order",
      content: "Are you sure you want to permanently delete this order? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await client.delete(`/orders/${id}`);
          message.success("Order deleted");
          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
        }
      },
    });
  };

  const columns = [
    {
      title: "Order No.",
      dataIndex: "orderNumber",
      key: "orderNumber",
      // System order no. on top; the dispatcher's own order number (set when
      // the order was created) shown below it.
      render: (orderNumber: string, record: any) =>
        record?.id ? (
          <a href={`/orders/${record.id}`}>
            <div style={{ fontWeight: 600 }}>{orderNumber || record.externalId || (record.id ? record.id.slice(0, 8).toUpperCase() : "—")}</div>
            {record.externalId && (
              <div style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>{record.externalId}</div>
            )}
          </a>
        ) : (
          "-"
        ),
      width: 150,
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "Pickup",
      dataIndex: "address",
      key: "pickup",
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
    },
    {
      title: "Distance",
      dataIndex: "distance",
      key: "distance",
      render: (d: number) => (d ? `${d} km` : "—"),
    },
  ];

  return (
    <Card className="dispatch-page">
      <DispatchToolbar selectedCount={selectedRowKeys.length} onBulkAssign={() => setAssignModalOpen(true)} onRefresh={() => refetch()} onCreateOrder={() => setCreateOrderOpen(true)} />

      <Row gutter={12} style={{ marginTop: 12, marginBottom: 12 }}>
        <Col span={24}>
          <DispatchFilters filters={filters} onChange={(patch: any) => setFilters((f: any) => ({ ...f, ...patch }))} />
        </Col>
      </Row>

      <Row>
        <Col span={24}>
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            loading={isLoading}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              onChange: (page: number, pageSize?: number) => setFilters((f: any) => ({ ...f, page, limit: pageSize || f.limit })),
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
            }}
            scroll={{ x: 1200 }}
          />
          {!isLoading && orders.length === 0 && <Empty description="No pending dispatch orders" />}
        </Col>
      </Row>

      <AssignRiderModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} orderId={assignTargetOrder} onAssigned={() => { queryClient.invalidateQueries(["dispatchOrders"]); queryClient.invalidateQueries(["orders"]); }} />

      <CreateOrderModal open={createOrderOpen} onClose={() => setCreateOrderOpen(false)} />
    </Card>
  );
};

export default DispatchPage;
