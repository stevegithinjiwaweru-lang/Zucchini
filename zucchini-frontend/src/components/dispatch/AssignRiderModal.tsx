import React, { useEffect, useMemo, useState } from "react";
import { Modal, List, Avatar, Button, Input, Tag, Space, Empty, message, Divider, Typography, Card } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchRiders, assignOrder, fetchPendingDispatchOrders } from "../../services/dispatch.service";
import { runInBatches } from "../../utils/batchApi";
import client from "../../api/client";

const { Text } = Typography;

interface Props {
  open: boolean;
  orderId: string | null;
  selectedOrderIds?: string[];
  onClose: () => void;
  onAssigned?: (summary?: any) => void;
}

const ACTIVE_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];
const MAX_CAPACITY = 4;

const AssignRiderModal: React.FC<Props> = ({ open, orderId, selectedOrderIds = [], onClose, onAssigned }) => {
  const queryClient = useQueryClient();
  const { data: ridersData } = useQuery({ queryKey: ["riders"], queryFn: fetchRiders });

  const riders = useMemo(() => (Array.isArray(ridersData) ? ridersData : ridersData?.items || []), [ridersData]);

  const [query, setQuery] = useState("");
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [activeCounts, setActiveCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!open) {
      setSelectedRider(null);
      setQuery("");
      setSummary(null);
    }
  }, [open]);

  // Fetch active orders for capacity calculation
  useEffect(() => {
    let mounted = true;
    async function loadActiveCounts() {
      try {
        // Fetch orders for ACTIVE_STATUSES in parallel (page limit large)
        const promises = ACTIVE_STATUSES.map((s) => client.get('/orders', { params: { status: s, limit: 500 } }));
        const responses = await Promise.all(promises);
        const allOrders: any[] = [];
        for (const r of responses) {
          const items = Array.isArray(r.data) ? r.data : r.data?.items || [];
          allOrders.push(...items);
        }

        const map = new Map<string, number>();
        for (const o of allOrders) {
          const rid = o.rider?.id || o.riderId;
          if (!rid) continue;
          map.set(rid, (map.get(rid) || 0) + 1);
        }

        if (mounted) setActiveCounts(map);
      } catch (err) {
        // ignore — best effort
        console.error('Failed to load active order counts', err);
      }
    }

    loadActiveCounts();
    const iv = setInterval(loadActiveCounts, 15000); // refresh every 15s
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const filteredRiders = useMemo(
    () => riders.filter((r: any) => (r.name || "").toLowerCase().includes(query.toLowerCase()) || (r.phone || "").includes(query)),
    [riders, query]
  );

  const riderCapacity = useMemo(() => {
    const map = new Map<string, { active: number; remaining: number; rider: any }>();
    for (const r of riders) {
      const active = activeCounts.get(r.id) || 0;
      map.set(r.id, { active, remaining: Math.max(0, MAX_CAPACITY - active), rider: r });
    }
    return map;
  }, [riders, activeCounts]);

  const handleAssignSingle = async () => {
    if (!selectedRider) return message.error("Select a rider");
    if (!orderId) return;
    const cap = riderCapacity.get(selectedRider.id)?.remaining ?? MAX_CAPACITY;
    if (cap <= 0) return message.error("Selected rider is at capacity");
    setLoading(true);
    try {
      await assignOrder(orderId, selectedRider.id);
      queryClient.invalidateQueries(["dispatchOrders"]);
      queryClient.invalidateQueries(["orders"]);
      onAssigned && onAssigned({ total: 1, success: 1, failed: 0 });
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.error || err.message || "Failed to assign");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDistribute = async () => {
    if (!selectedOrderIds || selectedOrderIds.length === 0) return message.error("No orders selected");
    setLoading(true);
    try {
      // Build list of riders with remaining capacity
      const capacities: Array<{ riderId: string; remaining: number; rider: any }> = [];
      for (const r of filteredRiders) {
        const cap = riderCapacity.get(r.id)?.remaining ?? MAX_CAPACITY;
        if (cap > 0) capacities.push({ riderId: r.id, remaining: cap, rider: r });
      }
      // sort by remaining descending to fill largest capacity first
      capacities.sort((a, b) => b.remaining - a.remaining);

      const assignments: Array<{ orderId: string; riderId: string }> = [];
      let orderIdx = 0;
      for (const c of capacities) {
        for (let i = 0; i < c.remaining && orderIdx < selectedOrderIds.length; i++) {
          assignments.push({ orderId: selectedOrderIds[orderIdx], riderId: c.riderId });
          orderIdx += 1;
        }
        if (orderIdx >= selectedOrderIds.length) break;
      }

      const remainingPending = selectedOrderIds.length - assignments.length;

      // execute assignments in batches with detailed results
      const results = await runInBatches(assignments, async (a) => {
        try {
          await assignOrder(a.orderId, a.riderId);
          return { orderId: a.orderId, riderId: a.riderId, success: true };
        } catch (err: any) {
          return { orderId: a.orderId, riderId: a.riderId, success: false, reason: err?.response?.data?.error || err.message };
        }
      }, 6);

      const detailed = results.map((r) => (r.status === "fulfilled" ? r.value : { success: false, reason: r.reason?.message || String(r.reason) }));
      const succeeded = detailed.filter((d: any) => d.success).length;
      const failed = detailed.filter((d: any) => !d.success).length;

      const ridersAtCapacity = capacities.filter((c) => {
        const used = detailed.filter((d: any) => d.success && d.riderId === c.riderId).length;
        return c.remaining - used <= 0;
      }).map((c) => c.rider.name);

      const failedDetails = detailed.filter((d: any) => !d.success).map((d: any) => ({ orderId: d.orderId, reason: d.reason }));

      const summaryObj = {
        totalSelected: selectedOrderIds.length,
        successfullyAssigned: succeeded,
        failedAssignments: failed,
        remainingPending,
        ridersAtCapacity,
        failedDetails,
        details: detailed,
      };

      setSummary(summaryObj);
      queryClient.invalidateQueries(["dispatchOrders"]);
      queryClient.invalidateQueries(["orders"]);
      onAssigned && onAssigned(summaryObj);
    } catch (err: any) {
      message.error(err?.message || "Auto-distribute failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={selectedOrderIds.length ? `Assign ${selectedOrderIds.length} orders` : orderId ? `Assign Rider` : "Assign Rider"} open={open} onCancel={onClose} footer={null} width={900}>
      <Input.Search placeholder="Search rider by name or phone" onSearch={(v) => setQuery(v)} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, maxHeight: 480, overflow: 'auto' }}>
          {filteredRiders.length ? (
            <List
              dataSource={filteredRiders}
              renderItem={(r: any) => {
                const cap = riderCapacity.get(r.id) || { active: 0, remaining: MAX_CAPACITY };
                const atCapacity = cap.remaining <= 0;
                return (
                  <List.Item actions={[
                    <Button type="link" onClick={() => setSelectedRider(r)} disabled={atCapacity}>{atCapacity ? 'At capacity' : 'Select'}</Button>
                  ]}>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12 }}>{r.vehicleType || 'Motorbike'}</div>
                          <div style={{ fontSize: 12, color: atCapacity ? '#ef4444' : '#f59e0b' }}>{cap.active} / {MAX_CAPACITY} Active Orders</div>
                          <div style={{ fontSize: 12 }}>Remaining: <Text strong>{cap.remaining}</Text></div>
                        </div>
                      </div>}
                      description={<div>{r.phone} · {r.bikeReg || ''}</div>} />
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty description="No riders" />
          )}
        </div>

        <div style={{ width: 360 }}>
          <Card title="Selected">
            <div style={{ marginBottom: 12 }}><strong>Rider:</strong> {selectedRider ? selectedRider.name : '—'}</div>
            <div style={{ marginBottom: 12 }}><strong>Orders:</strong> {selectedOrderIds.length || (orderId ? 1 : 0)}</div>
            <Space style={{ marginTop: 12 }} direction="vertical">
              {orderId ? <Button type="primary" loading={loading} onClick={handleAssignSingle}>Assign</Button> : <Button type="primary" loading={loading} onClick={handleAutoDistribute}>Auto-distribute</Button>}
              <Button onClick={onClose}>Cancel</Button>
            </Space>
          </Card>

          {summary && (
            <Card title="Assignment Summary" style={{ marginTop: 12 }}>
              <div>Total Selected: {summary.totalSelected}</div>
              <div>Successfully Assigned: {summary.successfullyAssigned}</div>
              <div>Failed Assignments: {summary.failedAssignments}</div>
              <div>Remaining Pending: {summary.remainingPending}</div>
              <div>Riders at Capacity: {summary.ridersAtCapacity.join(', ') || 'None'}</div>
              {summary.failedDetails && summary.failedDetails.length > 0 && (
                <>
                  <Divider />
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Failed Assignments</div>
                  <List dataSource={summary.failedDetails} renderItem={(f: any) => <List.Item>{f.orderId}: {f.reason}</List.Item>} />
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AssignRiderModal;
