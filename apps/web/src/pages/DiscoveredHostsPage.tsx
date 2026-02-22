import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";

type Host = {
  id: string;
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  registered_device_id: string | null;
};

type DeviceType = { id: string; name: string };
type Location = { id: string; path: string };

export function DiscoveredHostsPage() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const hosts = useQuery({
    queryKey: ["discovered-hosts"],
    queryFn: () => api.get<Host[]>("/discovered-hosts")
  });
  const types = useQuery({
    queryKey: ["device-types"],
    queryFn: () => api.get<DeviceType[]>("/device-types")
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<Location[]>("/locations")
  });

  const registerMutation = useMutation({
    mutationFn: (hostId: string) =>
      api.post(`/discovered-hosts/${hostId}/register`, {
        name: `Device ${hostId.slice(0, 6)}`,
        device_type_id: types.data?.[0]?.id,
        location_id: locations.data?.[0]?.id,
        tags: ["registered-via-web"]
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["discovered-hosts"] }),
        queryClient.invalidateQueries({ queryKey: ["devices"] })
      ]);
    }
  });

  return (
    <main className="container">
      <header className="row">
        <h1>Discovered Hosts</h1>
        <div className="row">
          <Link to="/devices">Devices</Link>
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      {!types.data?.length || !locations.data?.length ? <p>Crie ao menos 1 Device Type e 1 Location via API.</p> : null}
      <div className="card">
        {hosts.data?.map((h) => (
          <div key={h.id} className="list-row">
            <div>
              <strong>{h.ip}</strong> {h.hostname ?? "-"} {h.vendor ?? "-"} {h.mac ?? "-"}
            </div>
            <button disabled={Boolean(h.registered_device_id)} onClick={() => registerMutation.mutate(h.id)}>
              {h.registered_device_id ? "Registrado" : "Register"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
