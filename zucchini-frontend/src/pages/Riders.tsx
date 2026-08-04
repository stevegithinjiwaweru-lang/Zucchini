import React, { useMemo, useState } from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Spin,
  Empty,
} from "antd";
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import { STATUS } from "../theme/palette";
import { useAssignOrder } from "../hooks/useOrderAssignment";
import { updateRider as updateRiderApi, deleteRider as deleteRiderApi } from "../services/riders.service";

interface Rider {
  id: string;
  name: string;
  phone: string;
  nationalId?: string | null;
  drivingLicenceNo?: string | null;
  bikeReg?: string | null;
  branch?: string | null;
  vehicleType?: string | null;
  lastActiveAt?: string | null;
  status: "AVAILABLE" | "BUSY" | "IN_DELIVERY" | "OFFLINE" | "SUSPENDED";
}

const VEHICLE_TYPES = ["Motorcycle", "Bicycle", "Van", "Car"];

interface Order {
  id: string;
  externalId?: string | null; // dispatcher-provided order number
  customerName?: string;
  riderId?: string | null;
  status: string;
}

const asList = (data: any, ...keys: string[]): any[] => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const fetchRiders = async () => (await client.get("/riders", { params: { limit: 100 } })).data;
const fetchOrders = async () => (await client.get("/orders", { params: { limit: 100 } })).data;

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  AVAILABLE: { bg: STATUS.good, label: "Available" },
  BUSY: { bg: STATUS.warning, label: "Busy" },
  IN_DELIVERY: { bg: STATUS.warning, label: "In Delivery" },
  OFFLINE: { bg: STATUS.muted, label: "Offline" },
  SUSPENDED: { bg: STATUS.critical, label: "Suspended" },
};

const PERFORMANCE_LEVELS = [
  { label: "Excellent (90%+)", value: "excellent", test: (p: number) => p >= 90 },
  { label: "Good (75-89%)", value: "good", test: (p: number) => p >= 75 && p < 90 },
  { label: "Needs Improvement (<75%)", value: "poor", test: (p: number) => p < 75 },
];

const Riders: React.FC = () => {
  const queryClient = useQueryClient();
  const assignOrderMutation = useAssignOrder();
  const [form] = Form.useForm();
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [profileRider, setProfileRider] = useState<Rider | null>(null);
  const [assignRider, setAssignRider] = useState<Rider | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [editRider, setEditRider] = useState<Rider | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [performanceFilter, setPerformanceFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ["riders"],
    queryFn: fetchRiders,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const riders: Rider[] = asList(ridersData, "items");
  const orders: Order[] = asList(ordersData, "items");

  // Performance = delivered / (delivered + failed + returned) among orders this rider has handled.
  const performanceByRider = useMemo(() => {
    const map = new Map<string, number>();
    for (const rider of riders) {
      const handled = orders.filter(
        (o) => o.riderId === rider.id && ["DELIVERED", "FAILED", "RETURNED"].includes(o.status)
      );
      const delivered = handled.filter((o) => o.status === "DELIVERED").length;
      map.set(rider.id, handled.length ? Math.round((delivered / handled.length) * 100) : 100);
    }
    return map;
  }, [riders, orders]);

  const unassignedOrders = orders.filter((o) => o.status === "NEW");

  const activeOrdersByRider = useMemo(() => {
    const map = new Map<string, number>();
    const ACTIVE_ORDER_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "EN_ROUTE", "ARRIVED"];
    for (const o of orders) {
      if (!o.riderId || !ACTIVE_ORDER_STATUSES.includes(o.status)) continue;
      map.set(o.riderId, (map.get(o.riderId) || 0) + 1);
    }
    return map;
  }, [orders]);

  const branches = useMemo(
    () => Array.from(new Set(riders.map((r) => r.branch).filter(Boolean))) as string[],
    [riders]
  );

  const filteredRiders = riders.filter((r) => {
    if (branchFilter && r.branch !== branchFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (performanceFilter) {
      const level = PERFORMANCE_LEVELS.find((l) => l.value === performanceFilter);
      const perf = performanceByRider.get(r.id) ?? 100;
      if (level && !level.test(perf)) return false;
    }
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.phone.includes(search)) {
      return false;
    }
    return true;
  });

  const summary = {
    total: riders.length,
    active: riders.filter((r) => ["AVAILABLE", "BUSY", "IN_DELIVERY"].includes(r.status)).length,
    suspended: riders.filter((r) => r.status === "SUSPENDED").length,
    avgPerformance: riders.length
      ? Math.round(
          riders.reduce((sum, r) => sum + (performanceByRider.get(r.id) ?? 100), 0) / riders.length
        )
      : 0,
  };

  const setStatus = async (rider: Rider, status: string) => {
    try {
      await client.patch(`/riders/${rider.id}`, { status });
      message.success(`${rider.name} is now ${status.toLowerCase().replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["riders"] });
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to update rider status");
    }
  };

  const confirmAssign = () => {
    if (!assignRider || !assignOrderId) return;
    assignOrderMutation.mutate(
      { orderId: assignOrderId, riderId: assignRider.id },
      {
        onSuccess: () => {
          setAssignRider(null);
          setAssignOrderId(null);
        },
      }
    );
  };

  const addRider = async (vals: any) => {
    try {
      setAddLoading(true);
      const res = await client.post("/riders", {
        name: vals.name,
        phone: vals.phone,
        nationalId: vals.nationalId,
        drivingLicenceNo: vals.drivingLicenceNo,
        vehicleType: vals.vehicleType,
        bikeReg: vals.bikeReg,
        branch: vals.branch,
      });
      const { rider, tempPassword } = res.data;
      message.success("Rider created");
      form.resetFields();
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      if (tempPassword) {
        Modal.info({
          title: "Rider account created",
          content: (
            <div>
              <p>The rider account was created with the following credentials:</p>
              <p><strong>Phone:</strong> {rider.phone}</p>
              <p><strong>Temporary password:</strong> {tempPassword}</p>
              <p>Please ask the rider to change the password after first login.</p>
            </div>
          ),
        });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to create rider");
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (rider: Rider) => {
    setEditRider(rider);
    editForm.setFieldsValue({
      name: rider.name,
      phone: rider.phone,
      nationalId: rider.nationalId,
      drivingLicenceNo: rider.drivingLicenceNo,
      vehicleType: rider.vehicleType,
      bikeReg: rider.bikeReg,
      branch: rider.branch,
    });
  };

  const submitEdit = async (vals: any) => {
    if (!editRider) return;
    try {
      setEditLoading(true);
      await updateRiderApi(editRider.id, vals);
      message.success("Rider updated");
      setEditRider(null);
      queryClient.invalidateQueries({ queryKey: ["riders"] });
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to update rider");
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = (rider: Rider) => {
    Modal.confirm({
      title: `Delete ${rider.name}?`,
      content: "This permanently removes the rider account. This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteRiderApi(rider.id);
          message.success("Rider deleted");
          queryClient.invalidateQueries({ queryKey: ["riders"] });
        } catch (err: any) {
          message.error(err?.response?.data?.error || "Failed to delete rider");
        }
      },
    });
  };

  if (ridersLoading || ordersLoading) {
    return <Spin size="large" style={{ display: "block", margin: "120px auto" }} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Add Rider
        </Button>
      </div>

      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Select
            allowClear
            placeholder="All Branches"
            style={{ minWidth: 160 }}
            value={branchFilter ?? undefined}
            onChange={(v) => setBranchFilter(v ?? null)}
            options={branches.map((b) => ({ label: b, value: b }))}
          />
          <Select
            allowClear
            placeholder="All Status"
            style={{ minWidth: 160 }}
            value={statusFilter ?? undefined}
            onChange={(v) => setStatusFilter(v ?? null)}
            options={Object.keys(STATUS_BADGE).map((s) => ({ label: STATUS_BADGE[s].label, value: s }))}
          />
          <Select
            allowClear
            placeholder="All Performance Levels"
            style={{ minWidth: 200 }}
            value={performanceFilter ?? undefined}
            onChange={(v) => setPerformanceFilter(v ?? null)}
            options={PERFORMANCE_LEVELS.map((l) => ({ label: l.label, value: l.value }))}
          />
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search riders..."
            style={{ flex: 1, minWidth: 200 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        {filteredRiders.length ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredRiders.map((rider, i) => {
              const badge = STATUS_BADGE[rider.status] || STATUS_BADGE.OFFLINE;
              const perf = performanceByRider.get(rider.id) ?? 100;
              return (
                <div
                  key={rider.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 4px",
                    borderTop: i > 0 ? "1px solid #eef0f4" : "none",
                    flexWrap: "wrap",
                  }}
                >
                  <Avatar size={56} icon={<UserOutlined />} style={{ backgroundColor: "#e40d6e", flexShrink: 0 }} />

                  <div style={{ minWidth: 180, flex: "1 1 180px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{rider.name}</div>
                    <div style={{ fontSize: 12, color: "#a3a3a3" }}>ID: {rider.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{rider.phone}</div>
                  </div>

                  <div style={{ width: 110, fontSize: 13 }}>
                    <div style={{ color: "#898781" }}>Vehicle</div>
                    <div style={{ fontWeight: 600 }}>{rider.vehicleType || "—"}</div>
                  </div>

                  <Tag
                    style={{
                      background: badge.bg,
                      color: "#fff",
                      border: "none",
                      borderRadius: 20,
                      padding: "4px 14px",
                      fontWeight: 700,
                    }}
                  >
                    {badge.label}
                  </Tag>

                  <div style={{ width: 90, textAlign: "center", fontSize: 13 }}>
                    <div style={{ color: "#898781" }}>Active Orders</div>
                    <div style={{ fontWeight: 700 }}>{activeOrdersByRider.get(rider.id) || 0}</div>
                  </div>

                  <div style={{ width: 120, fontSize: 13 }}>
                    <div style={{ color: "#898781" }}>Last Active</div>
                    <div style={{ fontWeight: 600 }}>
                      {rider.lastActiveAt ? new Date(rider.lastActiveAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div style={{ width: 70, textAlign: "center", fontWeight: 700 }}>{perf}%</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                    <Button onClick={() => setProfileRider(rider)}>View Profile</Button>
                    <Button icon={<EditOutlined />} onClick={() => openEdit(rider)}>Edit</Button>

                    {rider.status === "AVAILABLE" && (
                      <Button
                        style={{ background: "#e40d6e", borderColor: "#e40d6e", color: "#fff" }}
                        onClick={() => setAssignRider(rider)}
                        disabled={!unassignedOrders.length}
                      >
                        Assign
                      </Button>
                    )}

                    {["AVAILABLE", "BUSY", "IN_DELIVERY"].includes(rider.status) && (
                      <Button danger onClick={() => setStatus(rider, "SUSPENDED")}>
                        Suspend
                      </Button>
                    )}

                    {["OFFLINE", "SUSPENDED"].includes(rider.status) && (
                      <Button type="primary" onClick={() => setStatus(rider, "AVAILABLE")}>
                        Activate
                      </Button>
                    )}

                    <Button danger icon={<DeleteOutlined />} onClick={() => confirmDelete(rider)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty description="No riders match these filters" />
        )}
      </Card>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <div style={{ color: "#e40d6e", fontWeight: 700, fontSize: 13 }}>Total Riders</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{summary.total}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ color: "#e40d6e", fontWeight: 700, fontSize: 13 }}>Active Riders</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{summary.active}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ color: "#e40d6e", fontWeight: 700, fontSize: 13 }}>Suspended Riders</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{summary.suspended}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ color: "#e40d6e", fontWeight: 700, fontSize: 13 }}>Avg. Performance</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{summary.avgPerformance}%</div>
          </Card>
        </Col>
      </Row>

      {/* View profile modal */}
      <Modal
        title="Rider Profile"
        open={!!profileRider}
        onCancel={() => setProfileRider(null)}
        footer={null}
      >
        {profileRider && (
          <div>
            <p><strong>Rider ID:</strong> {profileRider.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Name:</strong> {profileRider.name}</p>
            <p><strong>Phone:</strong> {profileRider.phone}</p>
            <p><strong>National ID:</strong> {profileRider.nationalId || "—"}</p>
            <p><strong>Driving Licence No.:</strong> {profileRider.drivingLicenceNo || "—"}</p>
            <p><strong>Operational Zone:</strong> {profileRider.branch || "—"}</p>
            <p><strong>Vehicle:</strong> {profileRider.vehicleType || "—"} {profileRider.bikeReg || ""}</p>
            <p><strong>Status:</strong> {STATUS_BADGE[profileRider.status]?.label || profileRider.status}</p>
            <p><strong>Active Orders:</strong> {activeOrdersByRider.get(profileRider.id) || 0}</p>
            <p><strong>Last Active:</strong> {profileRider.lastActiveAt ? new Date(profileRider.lastActiveAt).toLocaleString() : "—"}</p>
            <p><strong>Performance:</strong> {performanceByRider.get(profileRider.id) ?? 100}%</p>
          </div>
        )}
      </Modal>

      {/* Assign order modal */}
      <Modal
        title={`Assign an order to ${assignRider?.name || ""}`}
        open={!!assignRider}
        onCancel={() => {
          setAssignRider(null);
          setAssignOrderId(null);
        }}
        onOk={confirmAssign}
        okButtonProps={{ disabled: !assignOrderId, loading: assignOrderMutation.isLoading }}
        okText="Assign"
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Select an unassigned order"
          value={assignOrderId ?? undefined}
          onChange={(v) => setAssignOrderId(v)}
          options={unassignedOrders.map((o) => ({
            label: `${o.externalId || o.id.slice(0, 8).toUpperCase()} — ${o.customerName || ""}`.trim(),
            value: o.id,
          }))}
        />
      </Modal>

      {/* Add rider modal */}
      <Modal
        title="Add Rider"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={addRider}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nationalId" label="National ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="drivingLicenceNo" label="Driving Licence Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="vehicleType" label="Vehicle Type" rules={[{ required: true }]}>
            <Select options={VEHICLE_TYPES.map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="bikeReg" label="Vehicle Registration Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="branch" label="Operational Zone">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addLoading} block>
            Create Rider
          </Button>
        </Form>
      </Modal>

      {/* Edit rider modal */}
      <Modal title="Edit Rider" open={!!editRider} onCancel={() => setEditRider(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={submitEdit}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nationalId" label="National ID">
            <Input />
          </Form.Item>
          <Form.Item name="drivingLicenceNo" label="Driving Licence Number">
            <Input />
          </Form.Item>
          <Form.Item name="vehicleType" label="Vehicle Type">
            <Select options={VEHICLE_TYPES.map((v) => ({ label: v, value: v }))} allowClear />
          </Form.Item>
          <Form.Item name="bikeReg" label="Vehicle Registration Number">
            <Input />
          </Form.Item>
          <Form.Item name="branch" label="Operational Zone">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={editLoading} block>
            Save Changes
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Riders;
