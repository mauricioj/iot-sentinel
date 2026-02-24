import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildingsApi } from "../api/buildingsApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Table } from "../components/ui/Table";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useI18n } from "../i18n";

export function SettingsPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const buildingsQuery = useQuery({ queryKey: ["buildings"], queryFn: buildingsApi.list });
  const createMutation = useMutation({
    mutationFn: () => buildingsApi.create({ name: name.trim(), notes: notes.trim() || null }),
    onSuccess: async () => {
      setName("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
    onError: (error) => {
      alert((error as Error).message);
    }
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      alert(t("settings.nameRequired"));
      return;
    }
    createMutation.mutate();
  }

  return (
    <section>
      <PageHeader title={t("layout.nav.settings")} subtitle={t("settings.subtitle")} />
      <div className="card">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>{t("settings.buildingName")}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.examplePlaceholder")} />
          <label>{t("settings.notes")}</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("settings.notesOptional")} />
          <div className="row-inline">
            <Button type="submit">{t("settings.createBuilding")}</Button>
          </div>
        </form>
      </div>

      <Table>
        <thead>
          <tr>
            <th>{t("common.table.name")}</th>
            <th>{t("settings.notes")}</th>
            <th>{t("settings.table.updated")}</th>
          </tr>
        </thead>
        <tbody>
          {buildingsQuery.data?.map((building) => (
            <tr key={building.id}>
              <td>{building.name}</td>
              <td>{building.notes ?? "-"}</td>
              <td>{new Date(building.updated_at).toLocaleString(locale)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
