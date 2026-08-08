import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { initSocket, disconnectSocket } from "../../services/socket";

interface StoredUser {
  id: string;
  name: string;
  role: string;
}

const LayoutShell: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser>({
    id: "",
    name: "User",
    role: "dispatcher",
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }

    initSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div className="app" style={{ minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Topbar user={user} onLogout={handleLogout} />
        <main className="main" style={{ padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LayoutShell;
