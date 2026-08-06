import React, { useMemo } from "react";
import { Card, Input, Button, Tag, Space, Avatar, List, Modal, message } from "antd";
import { getOrderDisplayNumber } from "../../utils/orderNumber";

// ... (other imports & code omitted above for brevity)

              {selectedOrder ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fff0f6",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  <span>
                    Assigning <strong>{getOrderDisplayNumber(selectedOrder)}</strong> — pick a
                    rider below
                  </span>
                  <Button size="small" type="text" onClick={() => setSelectedOrder(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div style={{ color: "#898781", fontSize: 13, marginBottom: 12 }}>
                  Select an order from the table to assign a rider
                </div>
              )}

// ... (other code omitted)
