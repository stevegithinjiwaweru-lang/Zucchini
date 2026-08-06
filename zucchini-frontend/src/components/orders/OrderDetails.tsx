import React from "react";
import { Card, Descriptions, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";
import { getOrderDisplayNumber } from "../../utils/orderNumber";

const fetchOrder = async (id: string) => (await client.get(`/orders/${id}`)).data;

const OrderDetails: React.FC<{ id: string }> = ({ id }) => {
  const { data, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id) });
  // Backend returns { ok: true, data: order }. Unwrap .data explicitly.
  const order = data?.data || data?.order || data;

  if (isLoading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  const orderNo = getOrderDisplayNumber(order);

  return (
    <Card>
      <Descriptions title={`Order ${orderNo}`} bordered column={1}>
        <Descriptions.Item label="Order Number">{orderNo}</Descriptions.Item>
        <Descriptions.Item label="Customer">{order.customerName}</Descriptions.Item>
        <Descriptions.Item label="Phone">{order.phone}</Descriptions.Item>
        <Descriptions.Item label="Merchant">{order.merchant?.name || "—"}</Descriptions.Item>
        <Descriptions.Item label="Pickup">{order.address}</Descriptions.Item>
        <Descriptions.Item label="Destination">{order.destination || "—"}</Descriptions.Item>
        <Descriptions.Item label="Distance">{order.distance ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Payment">{order.paymentType}</Descriptions.Item>
        <Descriptions.Item label="Order Value">{order.amount}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag>{order.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Notes">{order.notes || "—"}</Descriptions.Item>
      </Descriptions>

      <Card title="Assignment" style={{ marginTop: 12 }}>
        {order.rider ? (
          <div>
            <div>
              <strong>{order.rider.name}</strong>
            </div>
            <div>{order.rider.phone}</div>
          </div>
        ) : order.riderId ? (
          <div>Rider assigned (ID: {order.riderId})</div>
        ) : (
          <div>No Rider Assigned</div>
        )}
      </Card>

      <Card title="Timeline" style={{ marginTop: 12 }}>
        <div>Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</div>
        <div>Updated: {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : "—"}</div>
        <div>Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "—"}</div>
      </Card>
    </Card>
  );
};

export default OrderDetails;
