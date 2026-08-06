import React from "react";
import { Card, Row, Col, Tag } from "antd";
import DonutChart from "../components/DonutChart";
import { getOrderDisplayNumber } from "../utils/orderNumber";

// ... (other imports & code omitted above for brevity)

      <div className="table-wrap">
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Merchant</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Rider</th>
            </tr>
          </thead>
          <tbody>
            {orders.length ? (
              orders.slice(0, 8).map((o: any) => (
                <tr key={o.id}>
                  <td>{getOrderDisplayNumber(o)}</td>
                  <td>{o.merchant?.name || "N/A"}</td>
                  <td>{o.customerName}</td>
                  <td>KSh {o.amount}</td>
                  <td>
                    <Tag color={o.status === "DELIVERED" ? "success" : o.status === "FAILED" || o.status === "RETURNED" ? "error" : "warning"}>{o.status}</Tag>
                  </td>
                  <td>{o.rider?.name || "Unassigned"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>No orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

// ... (other code omitted)
