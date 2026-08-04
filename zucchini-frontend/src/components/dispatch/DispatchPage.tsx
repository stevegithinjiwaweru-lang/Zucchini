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

  const columns = [
    {
      title: "Order No.",
      dataIndex: "externalId",
      key: "externalId",
      // System order no. on top; the dispatcher's own order number (set when
      // the order was created) shown below it.
      render: (externalId: string, record: any) =>
        record?.id ? (
          <a href={`/orders/${record.id}`}>
            <div>{record.id.slice(0, 8).toUpperCase()}</div>
            {externalId && (
              <div style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>{externalId}</div>
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
      render: (distance: number) => (distance ? `${distance} km` : "—"),
    },
    {
      title: "Scheduled",
      dataIndex: "scheduledAt",
      key: "scheduledAt",
      render: (date: string) => (date ? new Date(date).toLocaleString() : "—"),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (date ? new Date(date).toLocaleString() : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            size="small"
            onClick={() => window.location.assign(`/orders/${record.id}`)}
          >
            View
          </Button>

          <Button
            size="small"
            type="primary"
            onClick={() => {
              setAssignTargetOrder(record.id);
              setAssignModalOpen(true);
            }}
          >
            Assign Rider
          </Button>
        </div>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  const handleBulkAssign = () => {
    if (!selectedRowKeys.length) {
      message.info("Select orders to assign");
      return;
    }
    setAssignModalOpen(true);
  };

  return (
    <div className="dispatch-page">
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={16}>
          <Card>
            <DispatchFilters
              filters={filters}
              onChange={(patch: any) =>
                setFilters((old: any) => ({
                  ...old,
                  ...patch,
                }))
              }
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <DispatchToolbar
              selectedCount={selectedRowKeys.length}
              onBulkAssign={handleBulkAssign}
              onRefresh={() => refetch()}
              onCreateOrder={() => setCreateOrderOpen(true)}
            />
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
        onClose={() => {
          setAssignModalOpen(false);
          setAssignTargetOrder(null);
          setSelectedRowKeys([]);
        }}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          message.success("Assignment complete");
        }}
      />

      <CreateOrderModal open={createOrderOpen} onClose={() => setCreateOrderOpen(false)} />
    </div>
  );
};

export default DispatchPage;
