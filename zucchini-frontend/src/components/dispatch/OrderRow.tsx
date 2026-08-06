import React from "react";
import { Card, Row, Col, Avatar, Tag } from "antd";
import { getOrderDisplayNumber } from "../../utils/orderNumber";

const OrderRow: React.FC<{ order: any; onAssign: (id: string) => void }> = ({ order, onAssign }) => {
  const displayNo = getOrderDisplayNumber(order);
  const avatarText =
    displayNo !== "—"
      ? displayNo.slice(0, 2)
      : order?.customerName
      ? order.customerName.slice(0, 2).toUpperCase()
      : order?.id
      ? order.id.slice(0, 2).toUpperCase()
      : "?";

  return (
    <Card style={{ marginBottom: 8 }}>
      <Row gutter={8}>
        <Col span={4}>
          <Avatar>{avatarText}</Avatar>
        </Col>
        <Col span={14}>
          <div style={{ fontWeight: 700 }}>{order.customerName}</div>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>{displayNo}</div>
          <div style={{ color: '#6b7280' }}>{order.address}</div>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Tag color="gold">{order.status}</Tag>
        </Col>
      </Row>
    </Card>
  );
};

export default OrderRow;
