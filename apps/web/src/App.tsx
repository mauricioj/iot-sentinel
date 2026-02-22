import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DiscoveredHostsPage } from "./pages/DiscoveredHostsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/discovered-hosts"
        element={
          <ProtectedRoute>
            <DiscoveredHostsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <DevicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/:id"
        element={
          <ProtectedRoute>
            <DeviceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/discovered-hosts" replace />} />
      <Route path="*" element={<div className="container">Not found. <Link to="/">Home</Link></div>} />
    </Routes>
  );
}
