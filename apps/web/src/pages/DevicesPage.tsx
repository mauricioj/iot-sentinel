import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Device } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

export function DevicesPage() {
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get<Device[]>("/devices")
  });

  return (
    <section>
      <PageHeader title="Devices" subtitle="Inventario de dispositivos registrados" />
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {devices.data?.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>
                <Badge>{d.status}</Badge>
              </td>
              <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "-"}</td>
              <td>
                <Link to={`/devices/${d.id}`}>Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
