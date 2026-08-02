import React, { useMemo, useState } from "react";
import { Card, Row, Col, Table, Input, Spin, Empty } from "antd";
import { StarFilled } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchRatings, fetchRatingMetrics } from "../services/ratings.service";
import { ensureArray } from "../utils/normalize";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const { Search } = Input;

const Ratings: React.FC = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: metrics, isLoading: metricsLoading } = useQuery(["ratingsMetrics"], fetchRatingMetrics, {
    initialData: () => ({
      totalDeliveries: 0,
      activeRiders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      averageRating: 0,
      failedDeliveries: 0,
    }),
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery([
    "ratings",
    { query, page, pageSize },
  ], () => fetchRatings({ q: query, page, limit: pageSize }), {
    initialData: [],
    select: (d) => ensureArray(d),
  });

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

  const trendData = useMemo(() => {
    // Placeholder trend (map reviews to counts by day) — improve when backend provides trends
    const days = Array.from({ length: 7 }).map((_, i) => ({ day: `D${i + 1}`, value: Math.round(Math.random() * 50) }));
    return days;
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card title="Total Deliveries">{metricsLoading ? <Spin /> : metrics?.totalDeliveries ?? '—'}</Card>
        </Col>
        <Col span={4}>
          <Card title="Active Riders">{metricsLoading ? <Spin /> : metrics?.activeRiders ?? '—'}</Card>
        </Col>
        <Col span={4}>
          <Card title="Pending Orders">{metricsLoading ? <Spin /> : metrics?.pendingOrders ?? '—'}</Card>
        </Col>
        <Col span={4}>
          <Card title="Completed Orders">{metricsLoading ? <Spin /> : metrics?.completedOrders ?? '—'}</Card>
        </Col>
        <Col span={4}>
          <Card title="Average Rating">{metricsLoading ? <Spin /> : metrics?.averageRating ?? '—'}</Card>
        </Col>
        <Col span={4}>
          <Card title="Failed Deliveries">{metricsLoading ? <Spin /> : metrics?.failedDeliveries ?? '—'}</Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 12, display: "flex", gap: 12, justifyContent: "space-between" }}>
          <Search placeholder="Search reviews" style={{ width: 300 }} onSearch={(v) => setQuery(v)} />
        </div>

        {reviewsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            {reviews.length === 0 ? (
              <Empty description="No reviews found" />
            ) : (
              <Table columns={columns} dataSource={reviews} rowKey="id" pagination={{ pageSize }} />
            )}

            <div style={{ marginTop: 24 }}>
              <h4>Rating trends (last 7 days)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData as any}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Ratings;
