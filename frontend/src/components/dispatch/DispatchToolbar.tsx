import React from "react";
import { Space, Button } from "antd";

const DispatchToolbar: React.FC<{ selectedCount: number; onBulkAssign: () => void; onRefresh: () => void; onCreateOrder: () => void }> = ({ selectedCount, onBulkAssign, onRefresh, onCreateOrder }) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Space>
        <Button onClick={onCreateOrder}>Create Order</Button>
        <Button onClick={onBulkAssign} disabled={selectedCount === 0} type="primary">Assign Riders</Button>
        <Button onClick={onRefresh}>Refresh</Button>
      </Space>
      <div>{selectedCount} selected</div>
    </div>
  );
};

export default DispatchToolbar;
