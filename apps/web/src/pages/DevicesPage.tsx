import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type Device = {
  id: string;
  name: string;
  status: string;
  last_seen_at: string | null;
};

export function DevicesPage() {
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get<Device[]>("/devices")
  });

  return (
    <main className="container">
      <header className="row">
        <h1>Devices</h1>
        <Link to="/discovered-hosts">Voltar</Link>
      </header>
      <div className="card">
        {devices.data?.map((d) => (
          <div key={d.id} className="list-row">
            <div>
              <strong>{d.name}</strong> - {d.status} - {d.last_seen_at ?? "-"}
            </div>
            <Link to={`/devices/${d.id}`}>Detalhes</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
