import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Link } from "react-router-dom";
import { DiscoveredHost, DeviceType, Location } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Callout } from "../components/ui/Callout";
import { Badge } from "../components/ui/Badge";
import { useI18n } from "../i18n";

export function DiscoveredHostsPage() {
  const { t } = useI18n();
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
      <PageHeader title={t("layout.nav.discoveredHosts")} subtitle={t("discoveredHosts.subtitle")} />

      {!types.data?.length || !locations.data?.length ? (
        <Callout title={t("discoveredHosts.dependencies.title")}>
          <p>{t("discoveredHosts.dependencies.body")}</p>
          <div className="row-inline">
            <Link to="/device-types">
              <Button>{t("discoveredHosts.createDeviceType")}</Button>
            </Link>
            <Link to="/locations">
              <Button variant="ghost">{t("discoveredHosts.createLocation")}</Button>
            </Link>
          </div>
        </Callout>
      ) : null}

      <Table>
        <thead>
          <tr>
            <th>IP</th>
            <th>{t("discoveredHosts.table.hostname")}</th>
            <th>{t("discoveredHosts.table.vendor")}</th>
            <th>MAC</th>
            <th>{t("devices.table.status")}</th>
            <th>{t("devices.table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {hosts.data?.map((h) => (
            <tr key={h.id}>
              <td>{h.ip}</td>
              <td>{h.hostname ?? "-"}</td>
              <td>{h.vendor ?? "-"}</td>
              <td>{h.mac ?? "-"}</td>
              <td>{h.registered_device_id ? <Badge>{t("discoveredHosts.registered")}</Badge> : <Badge>{t("discoveredHosts.pending")}</Badge>}</td>
              <td>
                <Button
                  disabled={Boolean(h.registered_device_id) || !types.data?.length || !locations.data?.length}
                  onClick={() => registerMutation.mutate(h.id)}
                >
                  {h.registered_device_id ? t("discoveredHosts.registered") : t("discoveredHosts.register")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
