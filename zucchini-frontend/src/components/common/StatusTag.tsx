import React from "react";
import { Tag } from "antd";
import { orderStatusLabel, orderStatusColor } from "../../utils/orderStatus";

const StatusTag: React.FC<{ status?: string | null }> = ({ status }) => (
  <Tag color={orderStatusColor(status)}>{orderStatusLabel(status)}</Tag>
);

export default StatusTag;
