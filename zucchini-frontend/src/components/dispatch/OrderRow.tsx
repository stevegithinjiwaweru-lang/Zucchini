import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Avatar, Tag } from "antd";

const OrderRow: React.FC<{ order: any; onAssign: (id: string) => void }> = ({ order, onAssign }) => {
  return (
    <Card style={{ marginBottom: 8 }}>
      <Row gutter={8}>
        <Col span={4}><Avatar>{(order.externalId || order.id)?.slice(0,2)}</Avatar></Col>
        <Col span={14}>
          <div style={{ fontWeight: 700 }}>{order.customerName}</div>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>{order.externalId || order.id?.slice(0, 8).toUpperCase()}</div>
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
