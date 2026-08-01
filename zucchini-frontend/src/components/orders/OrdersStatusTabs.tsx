import React, { useEffect, useState } from "react";
import { Tabs, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";

const tabKeys = [
  { key: "NEW", label: "New Orders" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PENDING", label: "Pending" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "DELIVERED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "ALL", label: "All Orders" },
];

const OrdersStatusTabs: React.FC = () => {
  const { data } = useQuery({ queryKey: ["orders"], queryFn: async () => (await client.get("/orders")).data });

  const counts: Record<string, number> = {};
  if (Array.isArray(data)) {
    for (const o of data) counts[o.status] = (counts[o.status] || 0) + 1;
  } else if (Array.isArray(data?.items)) {
    for (const o of data.items) counts[o.status] = (counts[o.status] || 0) + 1;
  }

  const items = tabKeys.map((t) => ({
    key: t.key,
    label: (
      <span>
        {t.label} <Tag style={{ marginLeft: 8 }}>{t.key === "ALL" ? (Array.isArray(data) ? data.length : data?.items?.length || 0) : counts[t.key] || 0}</Tag>
      </span>
    ),
  }));

  return (
    <div className="orders-status-tabs">
      <Tabs defaultActiveKey="NEW" items={items} />
    </div>
  );
};

export default OrdersStatusTabs;
