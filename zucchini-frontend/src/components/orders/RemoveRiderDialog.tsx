import React, { useState } from "react";
import { Modal, Button } from "antd";
import client from "../../api/client";
import { useQueryClient } from "@tanstack/react-query";

const RemoveRiderDialog: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  (window as any)._easyboxOpenRemoveRider = (id: string) => {
    setOrderId(id);
    setVisible(true);
  };

  const handleConfirm = async () => {
    if (!orderId) return;
    await client.post(`/orders/${orderId}/unassign`);
    await queryClient.invalidateQueries(["orders"]);
    setVisible(false);
    setOrderId(null);
  };

  return (
    <Modal title="Remove Rider" open={visible} onCancel={() => setVisible(false)} footer={null}>
      <p>Are you sure you want to remove the rider from order <strong>{orderId}</strong>?</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={() => setVisible(false)}>Cancel</Button>
        <Button danger type="primary" onClick={handleConfirm}>Remove Rider</Button>
      </div>
    </Modal>
  );
};

export default RemoveRiderDialog;
