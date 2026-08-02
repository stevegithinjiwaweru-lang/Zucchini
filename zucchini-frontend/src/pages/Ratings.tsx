import React from "react";
import { Card, Row, Col, Table, Input } from "antd";
import { StarFilled } from "@ant-design/icons";

const { Search } = Input;

const Ratings: React.FC = () => {
  const columns = [
    { title: "Reviewer", dataIndex: "reviewer", key: "reviewer" },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (r: number) => (
        <>
          {r} <StarFilled style={{ color: "#faad14" }} />
        </>
      ),
    },
    { title: "Comment", dataIndex: "comment", key: "comment" },
    { title: "Date", dataIndex: "createdAt", key: "createdAt" },
  ];

  const dataSource: any[] = [];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card title="Total Deliveries">—</Card>
        </Col>
        <Col span={6}>
          <Card title="Active Riders">—</Card>
        </Col>
        <Col span={6}>
          <Card title="Average Rating">—</Card>
        </Col>
        <Col span={6}>
          <Card title="Failed Deliveries">—</Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 12, display: "flex", gap: 12, justifyContent: "space-between" }}>
          <Search placeholder="Search reviews" style={{ width: 300 }} />
          {/* Add filters, datepickers, exports here */}
        </div>

        <Table columns={columns} dataSource={dataSource} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
};

export default Ratings;
