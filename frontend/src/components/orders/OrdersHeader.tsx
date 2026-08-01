import React from "react";
import { Row, Col, Button, Switch } from "antd";
import { PlusOutlined, UploadOutlined, ExportOutlined } from "@ant-design/icons";

const OrdersHeader: React.FC = () => {
  const today = new Date().toLocaleDateString();

  return (
    <div className="orders-header">
      <div className="orders-header-left">
        <h1 className="orders-title">Orders</h1>
        <div className="orders-sub">{today}</div>
      </div>

      <div className="orders-header-right">
        <div className="auto-refresh">
          <span style={{ marginRight: 8 }}>Auto Refresh</span>
          <Switch defaultChecked />
        </div>

        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 12 }}>
          Add Order
        </Button>

        <Button icon={<UploadOutlined />} style={{ marginLeft: 8 }}>
          Bulk Upload
        </Button>

        <Button icon={<ExportOutlined />} style={{ marginLeft: 8 }}>
          Export Orders
        </Button>
      </div>
    </div>
  );
};

export default OrdersHeader;
