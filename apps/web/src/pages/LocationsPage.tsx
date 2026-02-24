import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { locationsApi, UpsertLocationInput } from "../api/locationsApi";
import { buildingsApi } from "../api/buildingsApi";
import { Location } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Table } from "../components/ui/Table";
import { Callout } from "../components/ui/Callout";

type FormState = {
  building_id: string;
  path: string;
  details: string;
};

function toFormState(location?: Location): FormState {
  return {
    building_id: location?.building_id ?? "",
    path: location?.path ?? "",
    details: location?.details ?? ""
  };
}

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toFormState());

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list
  });
  const buildingsQuery = useQuery({
    queryKey: ["buildings"],
    queryFn: buildingsApi.list
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertLocationInput) => locationsApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
      handleClose();
    },
    onError: (e) => alert((e as Error).message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertLocationInput }) => locationsApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
      handleClose();
    },
    onError: (e) => alert((e as Error).message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => locationsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (e) => alert((e as Error).message)
  });

  const buildingsById = useMemo(
    () => new Map((buildingsQuery.data ?? []).map((item) => [item.id, item.name])),
    [buildingsQuery.data]
  );

  const noBuildings = (buildingsQuery.data?.length ?? 0) === 0;

  function handleClose() {
    setOpen(false);
    setEditing(null);
    setError(null);
    setForm(toFormState());
  }

  function openNew() {
    setEditing(null);
    setError(null);
    setForm(
      toFormState({
        id: "",
        building_id: buildingsQuery.data?.[0]?.id ?? "",
        path: "",
        details: null,
        created_at: "",
        updated_at: ""
      })
    );
    setOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setError(null);
    setForm(toFormState(location));
    setOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.building_id) {
      setError("Selecione um building.");
      return;
    }
    if (!form.path.trim()) {
      setError("Path e obrigatorio.");
      return;
    }

    const payload: UpsertLocationInput = {
      building_id: form.building_id,
      path: form.path.trim(),
      details: form.details.trim() || null
    };

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
      return;
    }
    await createMutation.mutateAsync(payload);
  }

  return (
    <section>
      <PageHeader
        title="Locations"
        subtitle="Mapeie cada localizacao fisica"
        actions={
          <Button onClick={openNew} disabled={noBuildings}>
            New Location
          </Button>
        }
      />

      {noBuildings ? (
        <Callout title="Crie um Building primeiro">
          <p>Sem buildings cadastrados, nao e possivel criar locations.</p>
          <Link to="/settings">
            <Button variant="ghost">Ir para Settings</Button>
          </Link>
        </Callout>
      ) : null}

      <Table>
        <thead>
          <tr>
            <th>Path</th>
            <th>Building</th>
            <th>Details</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locationsQuery.data?.map((row) => (
            <tr key={row.id}>
              <td>{row.path}</td>
              <td>{buildingsById.get(row.building_id) ?? row.building_id}</td>
              <td>{row.details ?? "-"}</td>
              <td>
                <div className="row-inline">
                  <Button variant="ghost" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => deleteMutation.mutate(row.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal title={editing ? "Edit Location" : "New Location"} open={open} onClose={handleClose}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>Building</label>
          <select
            className="input"
            value={form.building_id}
            onChange={(e) => setForm((prev) => ({ ...prev, building_id: e.target.value }))}
          >
            <option value="">Select building</option>
            {buildingsQuery.data?.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>

          <label>Path</label>
          <Input value={form.path} onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))} />

          <label>Details</label>
          <Input value={form.details} onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))} />

          {error ? <p className="error">{error}</p> : null}

          <div className="row-inline">
            <Button type="submit">{editing ? "Save Changes" : "Create"}</Button>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
