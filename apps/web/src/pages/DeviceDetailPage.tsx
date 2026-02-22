import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type DeviceDetail = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  interfaces: Array<{
    id: string;
    mac: string;
    last_ip: string | null;
    vendor: string | null;
  }>;
};

export function DeviceDetailPage() {
  const { id } = useParams();
  const device = useQuery({
    queryKey: ["device", id],
    queryFn: () => api.get<DeviceDetail>(`/devices/${id}`)
  });

  return (
    <main className="container">
      <header className="row">
        <h1>Device Detail</h1>
        <Link to="/devices">Voltar</Link>
      </header>
      <div className="card">
        <p>
          <strong>{device.data?.name}</strong> - {device.data?.status}
        </p>
        <p>{device.data?.notes ?? "Sem notas"}</p>
        <h3>Interfaces</h3>
        {device.data?.interfaces?.map((n) => (
          <div key={n.id}>
            {n.mac} {n.last_ip ?? "-"} {n.vendor ?? "-"}
          </div>
        ))}
      </div>
    </main>
  );
}
