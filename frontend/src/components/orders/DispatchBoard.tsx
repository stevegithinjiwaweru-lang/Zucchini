import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Select,
  Input,
  Avatar,
  message,
  Tag,
  Spin,
  Empty,
  Row,
  Col,
} from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../../api/client";
import { CATEGORICAL, STATUS } from "../../theme/palette";
import { useAssignOrder, useUnassignOrder, useUpdateOrderStatus } from "../../hooks/useOrderAssignment";
import { getSocket } from "../../services/socket";

interface Order {
  id: string;
  merchant?: { name: string };
  merchantId: string;
  customerName: string;
  phone: string;
  address: string;
  amount: number;
  paymentType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rider?: { name: string };
  lat?: number | null;
  lng?: number | null;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  bikeReg?: string;
  status: "AVAILABLE" | "BUSY" | "IN_DELIVERY" | "OFFLINE" | "SUSPENDED";
}

interface Merchant {
  id: string;
  name: string;
}

const normalizeArray = (response: any, ...keys: string[]): any[] => {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

const fetchOrders = async () => (await client.get("/orders", { params: { limit: 100 } })).data;
const fetchRiders = async () => (await client.get("/riders", { params: { limit: 100 } })).data;
const fetchMerchants = async () => (await client.get("/merchants")).data;

const ASSIGNED_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"];

const DispatchBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const assignOrder = useAssignOrder();
  const unassignOrder = useUnassignOrder();
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [merchantFilter, setMerchantFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [riderSearch, setRiderSearch] = useState("");

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["riders"] });
    };

    socket.on("order:assigned", onUpdate);
    socket.on("order:unassigned", onUpdate);
    socket.on("order:status:update", onUpdate);

    return () => {
      socket.off("order:assigned", onUpdate);
      socket.off("order:unassigned", onUpdate);
      socket.off("order:status:update", onUpdate);
    };
  }, [queryClient]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 15000,
  });

  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ["riders"],
    queryFn: fetchRiders,
    refetchInterval: 10000,
  });

  const { data: merchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
  });

  const orders: Order[] = normalizeArray(ordersData, "items");
  const riders: Rider[] = normalizeArray(ridersData, "items");
  const merchants: Merchant[] = normalizeArray(merchantsData, "items");

  const merchantNames = useMemo(() => merchants.map((m) => m.name), [merchants]);
  const merchantColor = (name?: string) =>
    name ? CATEGORICAL[Math.max(0, merchantNames.indexOf(name)) % CATEGORICAL.length] : STATUS.muted;

  const unassignedOrders = orders.filter((o) => o.status === "NEW");

  const filteredOrders = unassignedOrders.filter((o) => {
    if (merchantFilter && o.merchant?.name !== merchantFilter) return false;
    if (paymentFilter && o.paymentType !== paymentFilter) return false;
    return true;
  });

  const availableRiders = riders.filter(
    (r) =>
      r.status === "AVAILABLE" &&
      (!riderSearch ||
        r.name.toLowerCase().includes(riderSearch.toLowerCase()) ||
        r.phone.includes(riderSearch))
  );

  const recentAssignments = orders
    .filter((o) => ASSIGNED_STATUSES.includes(o.status) && o.rider)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const mappableOrders = unassignedOrders.filter((o) => o.lat != null && o.lng != null);
  const center: LatLngExpression = [-1.2921, 36.8219];

  const dispatchSummary = [
    { label: "Unassigned Orders", value: unassignedOrders.length },
    { label: "Assigned", value: orders.filter((o) => o.status === "ASSIGNED").length },
    { label: "In Transit", value: orders.filter((o) => o.status === "IN_TRANSIT").length },
    { label: "Delivered", value: orders.filter((o) => o.status === "DELIVERED").length },
  ];

  const NEXT_STATUS: Record<string, { label: string; status: string }[]> = {
    ASSIGNED: [{ label: "Picked Up", status: "PICKED_UP" }],
    PICKED_UP: [{ label: "In Transit", status: "IN_TRANSIT" }],
    IN_TRANSIT: [
      { label: "Delivered", status: "DELIVERED" },
      { label: "Failed", status: "FAILED" },
    ],
  };

  const handleQuickAssign = (rider: Rider) => {
    if (!selectedOrder) {
      message.info("Select an order from the table first");
      return;
    }
    assignOrder.mutate(
      { orderId: selectedOrder.id, riderId: rider.id },
      {
        onSuccess: () => {
          setSelectedOrder(null);
          setSelectedRiderId(null);
        },
      }
    );
  };

  const UNASSIGNABLE_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];

  if (ordersLoading || ridersLoading || merchantsLoading) {
    return <Spin size="large" style={{ display: "block", margin: "120px auto" }} />;
  }

  return (
    <div>
      <Row gutter={16}>
        {/* Left: unassigned orders + map + recent assignments */}
        <Col span={16}>
          <Card
            title={
              <span>
                Unassigned Orders{" "}
                <Tag color="magenta" style={{ marginLeft: 6 }}>
                  {unassignedOrders.length}
                </Tag>
              </span>
            }
          >
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <Select
                allowClear
                placeholder="All Merchants"
                style={{ minWidth: 160 }}
                value={merchantFilter ?? undefined}
                onChange={(v) => setMerchantFilter(v ?? null)}
                options={merchantNames.map((n) => ({ label: n, value: n }))}
              />
              <Select
                allowClear
                placeholder="All Payment Types"
                style={{ minWidth: 160 }}
                value={paymentFilter ?? undefined}
                onChange={(v) => setPaymentFilter(v ?? null)}
                options={[
                  { label: "COD", value: "COD" },
                  { label: "PREPAID", value: "PREPAID" },
                ]}
              />
            </div>

            <div style={{ height: 260, marginBottom: 14, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  zIndex: 1000,
                  background: "#fff",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontWeight: 700,
                  boxShadow: "var(--card-shadow)",
                }}
              >
                Rider Map
              </div>
              <MapContainer center={center} zoom={12} style={{ height: "100%", borderRadius: 10 }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableOrders.map((o) => (
                  <Marker key={o.id} position={[o.lat as number, o.lng as number]}>
                    <Popup>
                      <div style={{ fontWeight: 700 }}>{o.customerName}</div>
                      <div>{o.address}</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="table-wrap">
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Merchant</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Amount</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length ? (
                    filteredOrders.map((o) => (
                      <tr
                        key={o.id}
                        style={{
                          background: selectedOrder?.id === o.id ? "#fff0f6" : "transparent",
                        }}
                      >
                        <td>{o.id.slice(0, 8).toUpperCase()}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: merchantColor(o.merchant?.name),
                                display: "inline-block",
                              }}
                            />
                            {o.merchant?.name || "N/A"}
                          </span>
                        </td>
                        <td>{o.customerName}</td>
                        <td>{o.address}</td>
                        <td>KSh {o.amount.toLocaleString()}</td>
                        <td>
                          {new Date(o.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <Button
                            size="small"
                            style={{
                              background: merchantColor(o.merchant?.name),
                              borderColor: merchantColor(o.merchant?.name),
                              color: "#fff",
                            }}
                            onClick={() => setSelectedOrder(o)}
                          >
                            Assign
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center" }}>
                        No unassigned orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Recent Assignments" style={{ marginTop: 16 }}>
            {recentAssignments.length ? (
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <tbody>
                    {recentAssignments.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: "#e40d6e" }}>
                          {o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td>{o.rider?.name}</td>
                        <td>
                          <Tag
                            color={
                              o.status === "DELIVERED"
                                ? "success"
                                : o.status === "FAILED" || o.status === "RETURNED"
                                ? "error"
                                : "processing"
                            }
                          >
                            {o.status}
                          </Tag>
                        </td>
                        <td style={{ color: "#6b7280" }}>
                          {new Date(o.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {(NEXT_STATUS[o.status] || []).map((next) => (
                              <Button
                                key={next.status}
                                size="small"
                                danger={next.status === "FAILED"}
                                loading={
                                  updateStatus.isLoading &&
                                  updateStatus.variables?.orderId === o.id &&
                                  updateStatus.variables?.status === next.status
                                }
                                onClick={() => updateStatus.mutate({ orderId: o.id, status: next.status })}
                              >
                                {next.label}
                              </Button>
                            ))}
                            {UNASSIGNABLE_STATUSES.includes(o.status) && (
                              <Button
                                size="small"
                                danger
                                loading={unassignOrder.isLoading && unassignOrder.variables === o.id}
                                onClick={() => unassignOrder.mutate(o.id)}
                              >
                                Unassign
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty description="No assignments yet" />
            )}
          </Card>
        </Col>

        {/* Right: available riders + dispatch summary */}
        <Col span={8}>
          <Card title={`Available Riders ${availableRiders.length}`}>
            {selectedOrder ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff0f6",
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                <span>
                  Assigning <strong>{selectedOrder.id.slice(0, 8).toUpperCase()}</strong> — pick a
                  rider below
                </span>
                <Button size="small" type="text" onClick={() => setSelectedOrder(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div style={{ color: "#898781", fontSize: 13, marginBottom: 12 }}>
                Select an order from the table to assign a rider
              </div>
            )}

            <Input
              prefix={<SearchOutlined />}
              placeholder="Search rider..."
              value={riderSearch}
              onChange={(e) => setRiderSearch(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
            />

            {availableRiders.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {availableRiders.map((rider, i) => (
                  <div
                    key={rider.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 6px",
                      borderRadius: 8,
                      background: selectedRiderId === rider.id ? "#fff0f6" : "transparent",
                    }}
                  >
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: STATUS.good }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{rider.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {rider.phone}
                        {rider.bikeReg ? ` · ${rider.bikeReg}` : ""}
                      </div>
                    </div>
                    <Button
                      size="small"
                      style={{
                        background: CATEGORICAL[i % CATEGORICAL.length],
                        borderColor: CATEGORICAL[i % CATEGORICAL.length],
                        color: "#fff",
                      }}
                      onClick={() => {
                        setSelectedRiderId(rider.id);
                        handleQuickAssign(rider);
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No riders currently available" />
            )}
          </Card>

          <Card title="Dispatch Summary" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dispatchSummary.map((s) => (
                <div
                  key={s.label}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}
                >
                  <span style={{ color: "#0b2136" }}>{s.label}</span>
                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DispatchBoard;
