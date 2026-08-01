import React from "react";
import { Row, Col, Card } from "antd";

const SummaryCards: React.FC = () => {
  // lightweight placeholders that read from /orders in a real implementation
  return (
    <div className="orders-summary-cards">
      <Row gutter={12}>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Pending Orders</div>
            <div className="kpi-value">12</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Assigned Orders</div>
            <div className="kpi-value">8</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Active Riders</div>
            <div className="kpi-value">6</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Available Riders</div>
            <div className="kpi-value">4</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Completed Today</div>
            <div className="kpi-value">22</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="kpi-card">
            <div className="kpi-label">Cancelled Today</div>
            <div className="kpi-value">1</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SummaryCards;
