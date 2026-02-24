import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Device } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { useI18n } from "../i18n";

export function DevicesPage() {
  const { locale, t } = useI18n();
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get<Device[]>("/devices")
  });

  return (
    <section>
      <PageHeader title={t("layout.nav.devices")} subtitle={t("devices.subtitle")} />
      <Table>
        <thead>
          <tr>
            <th>{t("devices.table.name")}</th>
            <th>{t("devices.table.status")}</th>
            <th>{t("devices.table.lastSeen")}</th>
            <th>{t("devices.table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {devices.data?.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>
                <Badge>{d.status}</Badge>
              </td>
              <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString(locale) : "-"}</td>
              <td>
                <Link to={`/devices/${d.id}`}>{t("devices.table.details")}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
