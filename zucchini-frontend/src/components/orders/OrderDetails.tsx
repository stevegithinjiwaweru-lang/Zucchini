import React from "react";
import { Card, Row, Col, Descriptions, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";

const fetchOrder = async (id: string) => (await client.get(`/orders/${id}`)).data;

const OrderDetails: React.FC<{ id: string }> = ({ id }) => {
  const { data, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id) });
  const order = data?.order || data;

  if (isLoading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <Card>
      <Descriptions title={`Order ${order.id}`} bordered>
        <Descriptions.Item label="Customer">{order.customerName}</Descriptions.Item>
        <Descriptions.Item label="Phone">{order.phone}</Descriptions.Item>
        <Descriptions.Item label="Merchant">{order.merchant?.name}</Descriptions.Item>
        <Descriptions.Item label="Pickup">{order.address}</Descriptions.Item>
        <Descriptions.Item label="Destination">{order.destination}</Descriptions.Item>
        <Descriptions.Item label="Distance">{order.distance ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Payment">{order.paymentType}</Descriptions.Item>
        <Descriptions.Item label="Order Value">{order.amount}</Descriptions.Item>
        <Descriptions.Item label="Status"><Tag>{order.status}</Tag></Descriptions.Item>
      </Descriptions>

      <Card title="Assignment">
        {order.rider ? (
          <div>
            <div><strong>{order.rider.name}</strong></div>
            <div>{order.rider.phone}</div>
            <div>{order.assignedAt ? new Date(order.assignedAt).toLocaleString() : '—'}</div>
          </div>
        ) : (
          <div>No Rider Assigned</div>
        )}
      </Card>

      <Card title="Timeline" style={{ marginTop: 12 }}>
        <div>Created: {order.createdAt}</div>
        <div>Assigned: {order.assignedAt || '—'}</div>
        <div>Picked Up: {order.pickedUpAt || '—'}</div>
        <div>In Transit: {order.inTransitAt || '—'}</div>
        <div>Delivered: {order.deliveredAt || '—'}</div>
      </Card>
    </Card>
  );
};

export default OrderDetails;
