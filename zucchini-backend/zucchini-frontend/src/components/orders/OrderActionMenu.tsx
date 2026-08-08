import React from "react";
import { Dropdown, Menu, Button } from "antd";

const OrderActionMenu: React.FC<{ order: any }> = ({ order }) => {
  const menu = (
    <Menu>
      <Menu.Item key="view">View Order</Menu.Item>
      <Menu.Item key="edit">Edit Order</Menu.Item>
      <Menu.Item key="assign" onClick={() => (window as any)._easyboxOpenAssignModal?.(order.id)}>Assign Rider</Menu.Item>
      <Menu.Item key="change">Change Rider</Menu.Item>
      <Menu.Item key="remove" onClick={() => (window as any)._easyboxOpenRemoveRider?.(order.id)}>Remove Rider</Menu.Item>
      <Menu.Item key="track">Track Rider</Menu.Item>
      <Menu.Item key="print">Print</Menu.Item>
      <Menu.Item key="cancel">Cancel Order</Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={["click"]}>
      <Button>Actions</Button>
    </Dropdown>
  );
};

export default OrderActionMenu;
