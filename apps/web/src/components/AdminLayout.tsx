import { NavLink, Outlet } from "react-router-dom";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/devices", label: "Devices" },
  { to: "/device-types", label: "Device Types" },
  { to: "/locations", label: "Locations" },
  { to: "/discovered-hosts", label: "Discovered Hosts" },
  { to: "/settings", label: "Settings" }
];

export function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/brand/icon.png" alt="IoT Sentinel icon" />
          <span>Sentinel</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`.trim()}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/brand/logo.png" alt="IoT Sentinel" />
            <strong>IoT Sentinel</strong>
          </div>
          <Input placeholder="Search devices, hosts, locations..." />
          <Button onClick={logout} variant="ghost">
            Logout
          </Button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
