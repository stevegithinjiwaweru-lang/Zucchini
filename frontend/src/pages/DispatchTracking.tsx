import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Select,
  List,
  Avatar,
  message,
  Tag,
  Spin,
  Empty,
  Row,
  Col,
  Typography,
  Statistic,
  Timeline,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from "antd/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

const { Title, Text } = Typography;

interface Dispatch {
  id: string;
  easyboxId?: string;
  orderReference: string;
  status: string;
  rider?: { name: string; phone: string; vehicleType?: string; vehiclePlate?: string };
  estimatedDelivery?: string;
  actualDeliveryAt?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  events?: Array<{
    id: string;
    event: string;
    status: string;
    riderName?: string;
    riderPhone?: string;
    lat?: number;
    lng?: number;
    createdAt: string;
  }>;
  failureReason?: string;
  podCollected?: boolean;
  podMethod?: string;
  podReference?: string;
}

const DispatchTracking: React.FC = () => {
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dispatches"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const { data } = await client.get("/dispatches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data?.dispatches || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const statusColors: { [key: string]: string } = {
    PENDING: "blue",
    CREATED: "blue",
    ASSIGNED: "cyan",
    PICKED_UP: "green",
    EN_ROUTE: "orange",
    ARRIVED: "orange",
    DELIVERED: "green",
    FAILED: "red",
    CANCELLED: "default",
  };

  const statusIcons = {
    PENDING: <ClockCircleOutlined />,
    CREATED: <ClockCircleOutlined />,
    ASSIGNED: <UserOutlined />,
    PICKED_UP: <CheckCircleOutlined />,
    EN_ROUTE: <EnvironmentOutlined />,
    ARRIVED: <EnvironmentOutlined />,
    DELIVERED: <CheckCircleOutlined />,
    FAILED: <CloseCircleOutlined />,
    CANCELLED: <WarningOutlined />,
  };

  const columns = [
    {
      title: "Order Reference",
      dataIndex: "orderReference",
      key: "orderReference",
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"}>
          {statusIcons[status as keyof typeof statusIcons]} {status}
        </Tag>
      ),
    },
    {
      title: "Rider",
      dataIndex: "rider",
      key: "rider",
      render: (rider: any) =>
        rider ? (
          <div>
            <div>{rider.name}</div>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              <PhoneOutlined /> {rider.phone}
            </Text>
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Vehicle",
      dataIndex: "rider",
      key: "vehicle",
      render: (rider: any) =>
        rider && rider.vehiclePlate ? (
          <Text>{rider.vehicleType} • {rider.vehiclePlate}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Est. Delivery",
      dataIndex: "estimatedDelivery",
      key: "estimatedDelivery",
      render: (date: string) =>
        date ? new Date(date).toLocaleTimeString() : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_: any, record: Dispatch) => (
        <Button
          type="primary"
          size="small"
          onClick={() => setSelectedDispatch(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>📦 Dispatch Tracking</Title>
      <Text type="secondary">Real-time dispatch lifecycle and rider tracking</Text>

      <Row gutter={16} style={{ marginTop: "20px" }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Dispatches"
              value={data?.length || 0}
              prefix="📊"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Delivered"
              value={data?.filter((d: any) => d.status === "DELIVERED").length || 0}
              valueStyle={{ color: "#52c41a" }}
              prefix="✅"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Transit"
              value={data?.filter((d: any) => ["EN_ROUTE", "ARRIVED"].includes(d.status)).length || 0}
              valueStyle={{ color: "#faad14" }}
              prefix="🚴"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Failed"
              value={data?.filter((d: any) => d.status === "FAILED").length || 0}
              valueStyle={{ color: "#f5222d" }}
              prefix="❌"
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: "20px" }}>
        <Spin spinning={isLoading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>

      <Modal
        title="Dispatch Details"
        open={!!selectedDispatch}
        onCancel={() => setSelectedDispatch(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setSelectedDispatch(null)}>
            Close
          </Button>,
        ]}
      >
        {selectedDispatch && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Order Reference" span={2}>
                {selectedDispatch.orderReference}
              </Descriptions.Item>
              <Descriptions.Item label="Easybox ID" span={2}>
                {selectedDispatch.easyboxId || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[selectedDispatch.status]}>
                  {statusIcons[selectedDispatch.status as keyof typeof statusIcons]}{" "}
                  {selectedDispatch.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Est. Delivery">
                {selectedDispatch.estimatedDelivery
                  ? new Date(selectedDispatch.estimatedDelivery).toLocaleString()
                  : "—"}
              </Descriptions.Item>
            </Descriptions>

            {selectedDispatch.rider && (
              <Card title="Rider Info" style={{ marginTop: "16px" }}>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="Name">
                    {selectedDispatch.rider.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    {selectedDispatch.rider.phone}
                  </Descriptions.Item>
                  <Descriptions.Item label="Vehicle">
                    {selectedDispatch.rider.vehicleType}{" "}
                    {selectedDispatch.rider.vehiclePlate}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {selectedDispatch.podCollected && (
              <Card title="Payment Collected" style={{ marginTop: "16px" }} type="inner">
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="Method">
                    {selectedDispatch.podMethod}
                  </Descriptions.Item>
                  <Descriptions.Item label="Reference">
                    {selectedDispatch.podReference}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {selectedDispatch.failureReason && (
              <Card
                title="Failure Details"
                style={{ marginTop: "16px" }}
                type="inner"
              >
                <Text type="danger">{selectedDispatch.failureReason}</Text>
              </Card>
            )}

            {selectedDispatch.events && selectedDispatch.events.length > 0 && (
              <Card title="Event Timeline" style={{ marginTop: "16px" }}>
                <Timeline
                  items={selectedDispatch.events.map((evt: any) => ({
                    dot: statusIcons[evt.status as keyof typeof statusIcons],
                    children: (
                      <div>
                        <Text strong>{evt.event}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {new Date(evt.createdAt).toLocaleString()}
                        </Text>
                        {evt.riderName && (
                          <>
                            <br />
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              Rider: {evt.riderName} ({evt.riderPhone})
                            </Text>
                          </>
                        )}
                      </div>
                    ),
                  }))}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DispatchTracking;
