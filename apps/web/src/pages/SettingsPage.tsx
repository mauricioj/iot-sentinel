import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildingsApi } from "../api/buildingsApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Table } from "../components/ui/Table";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function SettingsPage() {
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
      alert("Nome do building e obrigatorio.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <section>
      <PageHeader title="Settings" subtitle="Gerenciamento de Buildings" />
      <div className="card">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>Building Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Matriz - Bloco A" />
          <label>Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          <div className="row-inline">
            <Button type="submit">Create Building</Button>
          </div>
        </form>
      </div>

      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Notes</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {buildingsQuery.data?.map((building) => (
            <tr key={building.id}>
              <td>{building.name}</td>
              <td>{building.notes ?? "-"}</td>
              <td>{new Date(building.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
