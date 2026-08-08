import React, { useState } from "react";
import { Tabs, Tag } from "antd";

const tabKeys = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "RETURNED", label: "Returned" },
  { key: "FAILED", label: "Failed Delivery" },
];

const OrderStatusTabs: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({ value = "ALL", onChange }) => {
  const [active, setActive] = useState(value);
  const items = tabKeys.map((t) => ({ key: t.key, label: t.label }));
  return <Tabs activeKey={active} onChange={(k) => { setActive(k); onChange && onChange(k); }} items={items} />;
};

export default OrderStatusTabs;
