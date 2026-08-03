import React from "react";
import { NavLink } from "react-router-dom";
import sidebarLogo from "../../assets/easybox-logo.svg";

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div>
        <div className="brand">
          <img src={sidebarLogo} alt="Easybox logo" />
          <div className="title">Zucchini</div>
        </div>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}> 
            Dashboard
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>Orders</NavLink>
          <NavLink to="/dispatch" className={({ isActive }) => (isActive ? "active" : "")}>Dispatch</NavLink>
          <NavLink to="/riders" className={({ isActive }) => (isActive ? "active" : "")}>Riders</NavLink>
          <NavLink to="/tracking" className={({ isActive }) => (isActive ? "active" : "")}>Tracking</NavLink>
          <NavLink to="/ratings" className={({ isActive }) => (isActive ? "active" : "")}>Ratings</NavLink>
          <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>Settings</NavLink>
        </nav>
      </div>

      <div>
        <a
          className="logout"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
        >
          Logout
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
