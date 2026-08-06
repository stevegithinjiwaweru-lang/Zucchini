import React, { useMemo, useEffect } from "react";
import { Card, Row, Col, Tag, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Link } from "react-router-dom";
import client from "../api/client";
import { getSocket } from "../services/socket";
import StatCard from "../components/dashboard/StatCard";
import DonutChart, { DonutSlice } from "../components/dashboard/DonutChart";
import { CATEGORICAL, STATUS } from "../theme/palette";

const asList = (data: any, ...keys: string[]) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const dayLabel = (key: string) =>
  new Date(key).toLocaleDateString(undefined, { weekday: "short" });

const last7Days = () => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
};

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return dayKey(new Date(dateStr)) === dayKey(new Date());
};

const FINAL_STATUSES = ["DELIVERED", "FAILED", "RETURNED"];
const ACTIVE_DISPATCH_STATUSES = [
  "PENDING",
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "EN_ROUTE",
  "ARRIVED",
];

const Dashboard: React.FC = () => {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => (await client.get("/orders", { params: { limit: 100 } })).data,
  });

  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ["dashboard-riders"],
    queryFn: async () => (await client.get("/riders", { params: { limit: 100 } })).data,
  });

  const { data: dispatchesData, isLoading: dispatchesLoading } = useQuery({
    queryKey: ["dashboard-dispatches"],
    queryFn: async () => (await client.get("/dispatches")).data,
  });

  const { data: liveStatsData, refetch: refetchLiveStats } = useQuery({
    queryKey: ["dashboard-live-stats"],
    queryFn: async () => (await client.get("/orders/stats/dashboard")).data,
    refetchInterval: 30000,
  });
  const live = liveStatsData?.data || liveStatsData || {};

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => {
      refetchLiveStats();
    };
    socket.on("dashboard.updated", refresh);
    socket.on("dashboard:updated", refresh);
    socket.on("order.created", refresh);
    socket.on("order.updated", refresh);
    socket.on("order.deleted", refresh);
    socket.on("order.assigned", refresh);
    socket.on("order.completed", refresh);
    return () => {
      socket.off("dashboard.updated", refresh);
      socket.off("dashboard:updated", refresh);
      socket.off("order.created", refresh);
      socket.off("order.updated", refresh);
      socket.off("order.deleted", refresh);
      socket.off("order.assigned", refresh);
      socket.off("order.completed", refresh);
    };
  }, [refetchLiveStats]);

  const orders = asList(ordersData, "items");
  const riders = asList(ridersData, "items");
  const dispatches = asList(dispatchesData, "dispatches");

  const loading = ordersLoading || ridersLoading || dispatchesLoading;

  const days = useMemo(last7Days, []);

  const stats = useMemo(() => {
    const ordersTodayList = orders.filter((o: any) => isToday(o.createdAt));
    const deliveredTodayList = orders.filter((o: any) => o.status === "DELIVERED" && isToday(o.updatedAt));
    const pending = orders.filter((o: any) => !FINAL_STATUSES.includes(o.status));
    const failed = orders.filter((o: any) => o.status === "FAILED");
    const activeRiders = riders.filter((r: any) => ["AVAILABLE", "BUSY", "IN_DELIVERY"].includes(r.status));

    const buildTrend = (predicate: (o: any) => boolean) =>
      days.map((day) => orders.filter((o: any) => predicate(o) && dayKey(new Date(o.createdAt)) === day).length);

    return {
      ordersToday: ordersTodayList.length,
      ordersTrend: buildTrend(() => true),
      deliveredToday: deliveredTodayList.length,
      deliveredTrend: buildTrend((o) => o.status === "DELIVERED"),
      pending: pending.length,
      pendingTrend: buildTrend((o) => !FINAL_STATUSES.includes(o.status)),
      failed: failed.length,
      failedTrend: buildTrend((o) => o.status === "FAILED"),
      activeRiders: activeRiders.length,
      totalRiders: riders.length,
    };
  }, [orders, riders, days]);

  const ordersOverviewData = useMemo(
    () =>
      days.map((day) => {
        const dayOrders = orders.filter((o: any) => dayKey(new Date(o.createdAt)) === day);
        return {
          day: dayLabel(day),
          Delivered: dayOrders.filter((o: any) => o.status === "DELIVERED").length,
          "In Transit": dayOrders.filter((o: any) => ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(o.status)).length,
        };
      }),
    [orders, days]
  );

  const ordersBySource: DonutSlice[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      const name = o.merchant?.name || o.merchantId || "Unknown";
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, [, v]) => sum + v, 0);
    const slices: DonutSlice[] = top.map(([name, value], i) => ({
      name,
      value,
      color: CATEGORICAL[i % CATEGORICAL.length],
    }));
    if (rest > 0) slices.push({ name: "Other", value: rest, color: STATUS.muted });
    return slices;
  }, [orders]);

  const riderStatusData: DonutSlice[] = useMemo(() => {
    const byStatus = (statuses: string[]) => riders.filter((r: any) => statuses.includes(r.status)).length;
    return [
      { name: "Available", value: byStatus(["AVAILABLE"]), color: STATUS.good },
      { name: "Busy", value: byStatus(["BUSY", "IN_DELIVERY"]), color: STATUS.warning },
      { name: "Offline", value: byStatus(["OFFLINE"]), color: STATUS.muted },
      { name: "Suspended", value: byStatus(["SUSPENDED"]), color: STATUS.critical },
    ].filter((s) => s.value > 0);
  }, [riders]);

  const bottomStats = useMemo(() => {
    const filteredDispatches = dispatches; // no merchant filtering

    const finished = filteredDispatches.filter((d: any) => ["DELIVERED", "FAILED"].includes(d.status));
    const successRate = finished.length
      ? Math.round((finished.filter((d: any) => d.status === "DELIVERED").length / finished.length) * 100)
      : 0;

    const timedDeliveries = filteredDispatches.filter((d: any) => d.actualPickupAt && d.actualDeliveryAt);
    const avgMinutes = timedDeliveries.length
      ? Math.round(
          timedDeliveries.reduce((sum: number, d: any) => {
            const mins = (new Date(d.actualDeliveryAt).getTime() - new Date(d.actualPickupAt).getTime()) / 60000;
            return sum + mins;
          }, 0) / timedDeliveries.length
        )
      : null;

    const cashToday = filteredDispatches.filter((d: any) => d.podCollected && isToday(d.actualDeliveryAt)).reduce((sum: number, d: any) => sum + (d.podAmount || 0), 0);

    const utilization = riders.length ? Math.round((stats.activeRiders / riders.length) * 100) : 0;

    const activeDispatches = filteredDispatches.filter((d: any) => ACTIVE_DISPATCH_STATUSES.includes(d.status)).length;

    return { successRate, avgMinutes, cashToday, utilization, activeDispatches };
  }, [dispatches, riders, stats.activeRiders]);

  const mappableRiders = riders.filter((r: any) => r.lastLat != null && r.lastLng != null);
  const center: LatLngExpression = [-1.2921, 36.8219];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Live production KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Pending Orders" value={live.pendingOrders ?? stats.pending} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Assigned" value={live.assignedOrders ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="In Transit" value={live.inTransit ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Delivered Today" value={live.deliveredToday ?? stats.deliveredToday} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Cancelled Today" value={live.cancelledToday ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Available Riders" value={live.availableRiders ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Busy Riders" value={live.busyRiders ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Offline Riders" value={live.offlineRiders ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Suspended Riders" value={live.suspendedRiders ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Avg Delivery (min)" value={live.averageDeliveryTimeMinutes ?? "—"} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Waiting >30 min" value={live.ordersWaitingOver30Minutes ?? 0} /></Col>
        <Col xs={12} sm={8} md={6} lg={4}><StatCard label="Today's Deliveries" value={live.todaysTotalDeliveries ?? stats.deliveredToday} /></Col>
      </Row>

      {/* Top KPI row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <StatCard label="Orders Today" value={stats.ordersToday} trend={stats.ordersTrend} trendColor={CATEGORICAL[4]} />
        </Col>
        <Col span={5}>
          <StatCard label="Delivered Today" value={stats.deliveredToday} trend={stats.deliveredTrend} trendColor={STATUS.good} />
        </Col>
        <Col span={5}>
          <StatCard label="Pending Orders" value={stats.pending} trend={stats.pendingTrend} trendColor={STATUS.warning} />
        </Col>
        <Col span={5}>
          <StatCard label="Failed Deliveries" value={stats.failed} trend={stats.failedTrend} trendColor={STATUS.critical} />
        </Col>
        <Col span={4}>
          <StatCard label="Active Riders" value={`${stats.activeRiders}`} delta={`of ${stats.totalRiders} total`} deltaTone="muted" />
        </Col>
      </Row>

      {/* Charts row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Card title="Orders Overview" style={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ordersOverviewData}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Delivered" stroke={STATUS.good} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="In Transit" stroke={CATEGORICAL[4]} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={7}>
          <Card title="Orders by Source" style={{ height: "100%" }}>
            {ordersBySource.length ? (
              <DonutChart data={ordersBySource} centerValue={orders.length} centerLabel="Total Orders" />
            ) : (
              <div style={{ color: "#898781", textAlign: "center", padding: "40px 0" }}>No orders yet</div>
            )}
          </Card>
        </Col>
        <Col span={7}>
          <Card title="Rider Status" style={{ height: "100%" }}>
            {riderStatusData.length ? (
              <DonutChart data={riderStatusData} centerValue={riders.length} centerLabel="Total Riders" />
            ) : (
              <div style={{ color: "#898781", textAlign: "center", padding: "40px 0" }}>No riders yet</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent orders + live tracking */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="Recent Orders" style={{ height: "100%" }}>
            <div className="table-wrap">
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Merchant</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Rider</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? (
                    orders.slice(0, 8).map((o: any) => (
                      <tr key={o.id}>
                        <td>{o.orderNumber || o.externalId || '—'}</td>
                        <td>{o.merchant?.name || "N/A"}</td>
                        <td>{o.customerName}</td>
                        <td>KSh {o.amount}</td>
                        <td>
                          <Tag color={o.status === "DELIVERED" ? "success" : o.status === "FAILED" || o.status === "RETURNED" ? "error" : "warning"}>{o.status}</Tag>
                        </td>
                        <td>{o.rider?.name || "Unassigned"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="Live Tracking" style={{ height: "100%" }} extra={<Link to="/tracking">View Full Map</Link>}>
            <div style={{ height: 300 }}>
              <MapContainer center={center} zoom={11} style={{ height: "100%", borderRadius: 10 }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mappableRiders.map((r: any) => (
                  <Marker key={r.id} position={[r.lastLat, r.lastLng]}>
                    <Popup>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <Tag>{r.status}</Tag>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {mappableRiders.length === 0 && (
              <p style={{ textAlign: "center", color: "#898781", marginTop: 8 }}>No live rider locations yet</p>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom summary row */}
      <Row gutter={16}>
        <Col span={5}>
          <StatCard label="Delivery Success Rate" value={`${bottomStats.successRate}%`} deltaTone="good" />
        </Col>
        <Col span={5}>
          <StatCard label="Average Delivery Time" value={bottomStats.avgMinutes != null ? `${bottomStats.avgMinutes} min` : "N/A"} />
        </Col>
        <Col span={5}>
          <StatCard label="Cash Collected Today" value={`KSh ${bottomStats.cashToday.toLocaleString()}`} />
        </Col>
        <Col span={5}>
          <StatCard label="Rider Utilization" value={`${bottomStats.utilization}%`} />
        </Col>
        <Col span={4}>
          <StatCard label="Active Dispatches" value={bottomStats.activeDispatches} />
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
