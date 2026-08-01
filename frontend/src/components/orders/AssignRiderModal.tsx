import React, { useState } from "react";
import { Modal, Input, List, Button, Tag, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../../api/client";

const fetchRiders = async () => (await client.get("/riders", { params: { limit: 200 } })).data;
const assignApi = async (orderId: string, riderId: string) => (await client.post(`/orders/${orderId}/assign`, { riderId })).data;

const AssignRiderModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  // this modal is designed to be opened by other components via DOM events in this lightweight implementation
  // For now expose a window helper so the old Dispatch/Orders UI can trigger it if needed.
  (window as any)._easyboxOpenAssignModal = (id: string) => {
    setOrderId(id);
    setVisible(true);
  };

  const { data: ridersData } = useQuery({ queryKey: ["riders"], queryFn: fetchRiders });
  const riders = Array.isArray(ridersData) ? ridersData : ridersData?.items || [];

  const filtered = riders.filter((r: any) => r.name?.toLowerCase().includes(query.toLowerCase()) || r.phone?.includes(query));

  const handleAssign = async (riderId: string) => {
    if (!orderId) return;
    await assignApi(orderId, riderId);
    queryClient.invalidateQueries(["orders"]);
    queryClient.invalidateQueries(["riders"]);
    setVisible(false);
    setOrderId(null);
  };

  return (
    <Modal title="Assign Rider" open={visible} onCancel={() => setVisible(false)} footer={null} width={680}>
      <Input placeholder="Search rider by name or phone" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />

      <List
        dataSource={filtered}
        renderItem={(r: any) => (
          <List.Item actions={[<Button type="primary" onClick={() => handleAssign(r.id)}>Assign</Button>]}> 
            <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={r.name} description={`${r.phone} · ${r.status || "—"}`} />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default AssignRiderModal;
