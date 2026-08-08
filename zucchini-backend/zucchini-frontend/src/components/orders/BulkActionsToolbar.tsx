import React from "react";
import { Row, Col, Button } from "antd";

const BulkActionsToolbar: React.FC = () => {
  return (
    <div className="bulk-actions-toolbar">
      <Row justify="space-between" align="middle">
        <Col>
          <div style={{ display: "flex", gap: 8 }}>
            <Button>Assign Rider</Button>
            <Button>Change Rider</Button>
            <Button>Remove Rider</Button>
            <Button danger>Cancel Order</Button>
          </div>
        </Col>
        <Col>
          <div style={{ display: "flex", gap: 8 }}>
            <Button>Export Selected</Button>
            <Button>Print Labels</Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default BulkActionsToolbar;
