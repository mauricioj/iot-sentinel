import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { deviceTypesApi } from "../api/deviceTypesApi";
import { locationsApi } from "../api/locationsApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Callout } from "../components/ui/Callout";
import { Button } from "../components/ui/Button";
import { useI18n } from "../i18n";

export function DashboardPage() {
  const { t } = useI18n();
  const deviceTypesQuery = useQuery({ queryKey: ["device-types"], queryFn: deviceTypesApi.list });
  const locationsQuery = useQuery({ queryKey: ["locations"], queryFn: locationsApi.list });

  const noDeviceTypes = (deviceTypesQuery.data?.length ?? 0) === 0;
  const noLocations = (locationsQuery.data?.length ?? 0) === 0;

  return (
    <section>
      <PageHeader title={t("layout.nav.dashboard")} subtitle={t("dashboard.subtitle")} />
      {noDeviceTypes || noLocations ? (
        <Callout title={t("dashboard.empty.title")}>
          <div className="row-inline">
            <Link to="/device-types">
              <Button>{t("dashboard.empty.createDeviceType")}</Button>
            </Link>
            <Link to="/locations">
              <Button variant="ghost">{t("dashboard.empty.createLocation")}</Button>
            </Link>
          </div>
        </Callout>
      ) : (
        <div className="card-grid">
          <article className="card">
            <h3>{t("dashboard.stats.deviceTypes")}</h3>
            <p>{deviceTypesQuery.data?.length ?? 0}</p>
          </article>
          <article className="card">
            <h3>{t("dashboard.stats.locations")}</h3>
            <p>{locationsQuery.data?.length ?? 0}</p>
          </article>
        </div>
      )}
    </section>
  );
}
