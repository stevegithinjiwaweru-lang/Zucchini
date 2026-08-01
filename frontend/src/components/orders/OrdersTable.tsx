import React, { useState } from "react";
import { Card, Table, Empty, Button, Row, Col, Input, Select, DatePicker } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import client from "../../api/client";
import { orderStatusLabel, orderStatusColor, ORDER_STATUS_FILTER_OPTIONS } from "../../utils/orderStatus";
import ReassignRiderModal from "../dispatch/AssignRiderModal";
import StatusTag from "../common/StatusTag";

const { RangePicker } = DatePicker;

interface Filters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

const OrdersTableComponent: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 25 });
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);

  const fetchOrders = async () =>
    (
      await client.get("/orders", {
        params: {
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
          orderNo: filters.search || undefined,
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      })
    ).data;

  const { data, isLoading } = useQuery({
    queryKey: ["ordersPage", filters],
    queryFn: fetchOrders,
    keepPreviousData: true,
  });

  const orders = Array.isArray(data) ? data : data?.items || [];

  const columns = [
    {
      title: "Order No.",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <a href={`/orders/${id}`}>{id?.slice(0, 8).toUpperCase()}</a>,
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName" },
    { title: "Pickup", dataIndex: "address", key: "pickup" },
    { title: "Destination", dataIndex: "destination", key: "destination", render: (d: string) => d || "—" },
    { title: "Distance", dataIndex: "distance", key: "distance", render: (d: number) => (d ? `${d} km` : "—") },
    {
      title: "Scheduled",
      dataIndex: "scheduledAt",
      key: "scheduledAt",
      render: (d: string) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => window.location.assign(`/orders/${record.id}`)}>
            View
          </Button>
          <Button size="small" onClick={() => setReassignOrderId(record.id)}>
            Reassign
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by order number"
            allowClear
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: "100%" }}
            options={ORDER_STATUS_FILTER_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, status: v || undefined, page: 1 }))}
          />
        </Col>
        <Col xs={12} sm={10}>
          <RangePicker
            style={{ width: "100%" }}
            onChange={(range) =>
              setFilters((f) => ({
                ...f,
                dateFrom: range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : undefined,
                dateTo: range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : undefined,
                page: 1,
              }))
            }
          />
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={orders}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, limit: pageSize })),
        }}
        scroll={{ x: 1200 }}
      />
      {!isLoading && orders.length === 0 && <Empty description="No orders match these filters" />}

      <ReassignRiderModal
        open={!!reassignOrderId}
        orderId={reassignOrderId}
        onClose={() => setReassignOrderId(null)}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
          setReassignOrderId(null);
        }}
      />
    </Card>
  );
};

export default OrdersTableComponent;
