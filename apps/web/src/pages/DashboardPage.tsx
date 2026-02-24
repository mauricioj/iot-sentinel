import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { deviceTypesApi } from "../api/deviceTypesApi";
import { locationsApi } from "../api/locationsApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Callout } from "../components/ui/Callout";
import { Button } from "../components/ui/Button";

export function DashboardPage() {
  const deviceTypesQuery = useQuery({ queryKey: ["device-types"], queryFn: deviceTypesApi.list });
  const locationsQuery = useQuery({ queryKey: ["locations"], queryFn: locationsApi.list });

  const noDeviceTypes = (deviceTypesQuery.data?.length ?? 0) === 0;
  const noLocations = (locationsQuery.data?.length ?? 0) === 0;

  return (
    <section>
      <PageHeader title="Dashboard" subtitle="Visao geral do ambiente IoT Sentinel" />
      {noDeviceTypes || noLocations ? (
        <Callout title="Voce ainda nao cadastrou Device Types e Locations.">
          <div className="row-inline">
            <Link to="/device-types">
              <Button>Criar Device Type</Button>
            </Link>
            <Link to="/locations">
              <Button variant="ghost">Criar Location</Button>
            </Link>
          </div>
        </Callout>
      ) : (
        <div className="card-grid">
          <article className="card">
            <h3>Device Types</h3>
            <p>{deviceTypesQuery.data?.length ?? 0}</p>
          </article>
          <article className="card">
            <h3>Locations</h3>
            <p>{locationsQuery.data?.length ?? 0}</p>
          </article>
        </div>
      )}
    </section>
  );
}
