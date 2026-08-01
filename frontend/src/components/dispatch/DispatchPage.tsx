import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Spin, Empty, Table, Button, message } from "antd";
import DispatchFilters from "./DispatchFilters";
import AssignRiderModal from "./AssignRiderModal";
import DispatchToolbar from "./DispatchToolbar";
import CreateOrderModal from "./CreateOrderModal";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchPendingDispatchOrders } from "../../services/dispatch.service";
import { getSocket } from "../../services/socket";
import StatusTag from "../common/StatusTag";
import "./dispatch.css";

const DispatchPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<any>({ page: 1, limit: 25, sort: "-createdAt" });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetOrder, setAssignTargetOrder] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dispatchOrders", filters],
    queryFn: async () => await fetchPendingDispatchOrders(filters),
    keepPreviousData: true,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onAssigned = () => {
      queryClient.invalidateQueries(["dispatchOrders"]);
      queryClient.invalidateQueries(["orders"]);
    };

    socket.on("order:assigned", onAssigned);
    socket.on("order:unassigned", onAssigned);
    socket.on("order:status:update", onAssigned);

    return () => {
      socket.off("order:assigned", onAssigned);
      socket.off("order:unassigned", onAssigned);
      socket.off("order:status:update", onAssigned);
    };
  }, [queryClient]);

  const orders = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [data]);

  const columns = [
    { title: "Order No.", dataIndex: "id", key: "id", render: (id: string) => <a href={`/orders/${id}`}>{id?.slice(0, 8).toUpperCase()}</a> , width: 150 },
    { title: "Customer", dataIndex: "customerName", key: "customerName" },
    { title: "Pickup", dataIndex: "address", key: "pickup" },
    { title: "Destination", dataIndex: "destination", key: "destination" },
    { title: "Distance", dataIndex: "distance", key: "distance", render: (d: number) => (d ? `${d} km` : "—") },
    { title: "Scheduled", dataIndex: "scheduledAt", key: "scheduledAt", render: (d: string) => (d ? new Date(d).toLocaleString() : "—") },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", render: (d: string) => new Date(d).toLocaleString() },
    { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <StatusTag status={s} /> },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => window.location.assign(`/orders/${record.id}`)}>View</Button>
          <Button size="small" type="primary" onClick={() => { setAssignTargetOrder(record.id); setAssignModalOpen(true); }}>Assign Rider</Button>
        </div>
      ),
      width: 220,
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys as string[]),
  };

  const handleBulkAssign = async () => {
    if (!selectedRowKeys.length) return message.info("Select orders to assign");
    setAssignModalOpen(true);
  };

  return (
    <div className="dispatch-page">
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={16}>
          <Card>
            <DispatchFilters filters={filters} onChange={(patch: any) => setFilters((f: any) => ({ ...f, ...patch }))} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <DispatchToolbar selectedCount={selectedRowKeys.length} onBulkAssign={handleBulkAssign} onRefresh={() => refetch()} onCreateOrder={() => setCreateOrderOpen(true)} />
          </Card>
        </Col>
      </Row>

      <Card>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            rowSelection={rowSelection}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              onChange: (page, pageSize) => setFilters((f: any) => ({ ...f, page, limit: pageSize })),
            }}
            scroll={{ x: 1200 }}
          />
        )}
        {orders.length === 0 && !isLoading && <Empty description="No pending dispatch orders" />}
      </Card>

      <AssignRiderModal
        open={assignModalOpen}
        orderId={assignTargetOrder}
        selectedOrderIds={selectedRowKeys}
        onClose={() => { setAssignModalOpen(false); setAssignTargetOrder(null); setSelectedRowKeys([]); }}
        onAssigned={() => {
          // invalidate lists
          queryClient.invalidateQueries(["dispatchOrders"]);
          queryClient.invalidateQueries(["orders"]);
          message.success("Assignment complete");
        }}
      />

      <CreateOrderModal open={createOrderOpen} onClose={() => setCreateOrderOpen(false)} />
    </div>
  );
};

export default DispatchPage;
