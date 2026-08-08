import React from "react";
import { useParams } from "react-router-dom";
import OrderDetails from "../components/orders/OrderDetails";

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div>Order not found</div>;
  return <OrderDetails id={id} />;
};

export default OrderDetail;
