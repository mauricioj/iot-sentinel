import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { DeviceDetail } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

export function DeviceDetailPage() {
  const { id } = useParams();
  const device = useQuery({
    queryKey: ["device", id],
    queryFn: () => api.get<DeviceDetail>(`/devices/${id}`)
  });

  return (
    <section>
      <PageHeader
        title={device.data?.name ?? "Device Detail"}
        subtitle="Informacoes detalhadas e interfaces de rede"
        actions={<Link to="/devices">Back</Link>}
      />
      <div className="card">
        <p>
          Status: <Badge>{device.data?.status ?? "unknown"}</Badge>
        </p>
        <p>{device.data?.notes ?? "Sem notas"}</p>
      </div>

      <Table>
        <thead>
          <tr>
            <th>MAC</th>
            <th>IP</th>
            <th>Vendor</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {device.data?.interfaces?.map((network) => (
            <tr key={network.id}>
              <td>{network.mac}</td>
              <td>{network.last_ip ?? "-"}</td>
              <td>{network.vendor ?? "-"}</td>
              <td>{network.interface_type}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
