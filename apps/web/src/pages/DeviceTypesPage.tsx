import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceTypesApi, UpsertDeviceTypeInput } from "../api/deviceTypesApi";
import { DeviceType } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Table } from "../components/ui/Table";
import { useI18n } from "../i18n";

type FormState = {
  name: string;
  category: string;
  defaultProtocolsText: string;
};

function toFormState(deviceType?: DeviceType): FormState {
  return {
    name: deviceType?.name ?? "",
    category: deviceType?.category ?? "",
    defaultProtocolsText: deviceType?.default_protocols?.length ? JSON.stringify(deviceType.default_protocols) : "[]"
  };
}

function parseProtocols(value: string): string[] | null {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return null;
  }
}

export function DeviceTypesPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toFormState());

  const listQuery = useQuery({
    queryKey: ["device-types"],
    queryFn: deviceTypesApi.list
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertDeviceTypeInput) => deviceTypesApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["device-types"] });
      handleClose();
    },
    onError: (e) => {
      alert((e as Error).message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertDeviceTypeInput }) => deviceTypesApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["device-types"] });
      handleClose();
    },
    onError: (e) => {
      alert((e as Error).message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deviceTypesApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["device-types"] });
    },
    onError: (e) => {
      alert((e as Error).message);
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const modalTitle = useMemo(() => (editing ? t("deviceTypes.edit") : t("deviceTypes.new")), [editing, t]);

  function handleClose() {
    setOpen(false);
    setEditing(null);
    setError(null);
    setForm(toFormState());
  }

  function handleOpenNew() {
    setEditing(null);
    setError(null);
    setForm(toFormState());
    setOpen(true);
  }

  function handleOpenEdit(deviceType: DeviceType) {
    setEditing(deviceType);
    setError(null);
    setForm(toFormState(deviceType));
    setOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("deviceTypes.nameRequired"));
      return;
    }
    if (!form.category.trim()) {
      setError(t("deviceTypes.categoryRequired"));
      return;
    }

    const parsedProtocols = parseProtocols(form.defaultProtocolsText);
    if (!parsedProtocols) {
      setError(t("deviceTypes.protocolsInvalid"));
      return;
    }

    const payload: UpsertDeviceTypeInput = {
      name: form.name.trim(),
      category: form.category.trim(),
      default_protocols: parsedProtocols
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
        title={t("layout.nav.deviceTypes")}
        subtitle={t("deviceTypes.subtitle")}
        actions={<Button onClick={handleOpenNew}>{t("deviceTypes.new")}</Button>}
      />
      <Table>
        <thead>
          <tr>
            <th>{t("common.table.name")}</th>
            <th>{t("common.table.category")}</th>
            <th>{t("common.table.updatedAt")}</th>
            <th>{t("common.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {listQuery.data?.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.category}</td>
              <td>{new Date(row.updated_at).toLocaleString(locale)}</td>
              <td>
                <div className="row-inline">
                  <Button variant="ghost" onClick={() => handleOpenEdit(row)}>
                    {t("common.edit")}
                  </Button>
                  <Button variant="danger" onClick={() => deleteMutation.mutate(row.id)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal title={modalTitle} open={open} onClose={handleClose}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>{t("deviceTypes.fieldName")}</label>
          <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />

          <label>{t("deviceTypes.fieldCategory")}</label>
          <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />

          <label>{t("deviceTypes.fieldDefaultProtocols")}</label>
          <Input
            value={form.defaultProtocolsText}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultProtocolsText: e.target.value }))}
          />

          {error ? <p className="error">{error}</p> : null}

          <div className="row-inline">
            <Button type="submit" disabled={isSaving}>
              {editing ? t("common.saveChanges") : t("common.create")}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
