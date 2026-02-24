import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Link } from "react-router-dom";
import { DiscoveredHost, DeviceType, Location } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Callout } from "../components/ui/Callout";
import { Badge } from "../components/ui/Badge";

export function DiscoveredHostsPage() {
  const queryClient = useQueryClient();

  const hosts = useQuery({
    queryKey: ["discovered-hosts"],
    queryFn: () => api.get<DiscoveredHost[]>("/discovered-hosts")
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
    <section>
      <PageHeader title="Discovered Hosts" subtitle="Hosts encontrados por scans" />

      {!types.data?.length || !locations.data?.length ? (
        <Callout title="Dependencias pendentes">
          <p>Para registrar hosts, crie ao menos 1 Device Type e 1 Location.</p>
          <div className="row-inline">
            <Link to="/device-types">
              <Button>Criar Device Type</Button>
            </Link>
            <Link to="/locations">
              <Button variant="ghost">Criar Location</Button>
            </Link>
          </div>
        </Callout>
      ) : null}

      <Table>
        <thead>
          <tr>
            <th>IP</th>
            <th>Hostname</th>
            <th>Vendor</th>
            <th>MAC</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {hosts.data?.map((h) => (
            <tr key={h.id}>
              <td>{h.ip}</td>
              <td>{h.hostname ?? "-"}</td>
              <td>{h.vendor ?? "-"}</td>
              <td>{h.mac ?? "-"}</td>
              <td>{h.registered_device_id ? <Badge>Registered</Badge> : <Badge>Pending</Badge>}</td>
              <td>
                <Button
                  disabled={Boolean(h.registered_device_id) || !types.data?.length || !locations.data?.length}
                  onClick={() => registerMutation.mutate(h.id)}
                >
                  {h.registered_device_id ? "Registered" : "Register"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
