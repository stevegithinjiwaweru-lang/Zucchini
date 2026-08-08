import React from "react";
import { Card } from "antd";
import OrdersTableComponent from "../components/orders/OrdersTable";

const Orders: React.FC = () => {
  return (
    <Card title="Orders">
      <OrdersTableComponent />
    </Card>
  );
};

export default Orders;
