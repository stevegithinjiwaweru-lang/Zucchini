import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AntdThemeProvider } from "./theme";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Dispatch from "./pages/Dispatch";
import Riders from "./pages/Riders";
import Tracking from "./pages/Tracking";
// removed Merchants import
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Ratings from "./pages/Ratings";

import LayoutShell from "./components/layout/LayoutShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const App: React.FC = () => {
  return (
    <AntdThemeProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LayoutShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="riders" element={<Riders />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="ratings" element={<Ratings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Redirect old merchants/customers links to ratings */}
        <Route path="merchants" element={<Navigate to="/ratings" replace />} />
        <Route path="customers" element={<Navigate to="/ratings" replace />} />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AntdThemeProvider>
  );
};

export default App;
