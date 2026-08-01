import React from "react";
import { Row, Col, Select, DatePicker, Input } from "antd";

const { RangePicker } = DatePicker;

const OrdersFilters: React.FC = () => {
  return (
    <div className="orders-filters">
      <Row gutter={12}>
        <Col xs={24} sm={12} md={6}>
          <Input placeholder="Search orders" />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select placeholder="Merchant" style={{ width: "100%" }} allowClear />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select placeholder="Status" style={{ width: "100%" }} allowClear />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select placeholder="Region" style={{ width: "100%" }} allowClear />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <RangePicker style={{ width: "100%" }} />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col xs={12} sm={8} md={4}>
          <Select placeholder="Vehicle Type" style={{ width: "100%" }} allowClear />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Select placeholder="Priority" style={{ width: "100%" }} allowClear />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Select placeholder="Sort By" style={{ width: "100%" }} allowClear />
        </Col>
      </Row>
    </div>
  );
};

export default OrdersFilters;
