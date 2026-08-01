import React, { useEffect, useState } from "react";
import { Card, Table, Spin, Empty, Tag, Button, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";

const OrdersTable: React.FC<{ filters: any; onAssignClick: (id: string) => void }> = ({ filters, onAssignClick }) => {
  const fetchOrders = async () => (await client.get('/orders', { params: { ...filters, status: 'PENDING', limit: filters.limit || 25 } })).data;
  const { data, isLoading } = useQuery({ queryKey: ['dispatchTable', filters], queryFn: fetchOrders, keepPreviousData: true });
  const orders = Array.isArray(data) ? data : data?.items || [];

  const columns = [
    { title: 'Order No.', dataIndex: 'id', key: 'id', render: (id: string) => <a href={`/orders/${id}`}>{id?.slice(0,8).toUpperCase()}</a> },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Pickup', dataIndex: 'address', key: 'pickup' },
    { title: 'Destination', dataIndex: 'destination', key: 'destination' },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="gold">{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => <Button type="primary" onClick={() => onAssignClick(record.id)}>Assign Rider</Button> },
  ];

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;

  return (
    <Card>
      <Table rowKey="id" dataSource={orders} columns={columns} pagination={{ pageSize: filters.limit || 25 }} />
      {orders.length === 0 && <Empty description="No pending orders" />}
    </Card>
  );
};

export default OrdersTable;
