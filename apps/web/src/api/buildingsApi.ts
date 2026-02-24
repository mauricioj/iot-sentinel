import { api } from "./client";
import { Building } from "./types";

export type UpsertBuildingInput = {
  name: string;
  notes?: string | null;
};

export const buildingsApi = {
  list: () => api.get<Building[]>("/buildings"),
  create: (input: UpsertBuildingInput) => api.post<Building>("/buildings", input),
  update: (id: string, input: UpsertBuildingInput) => api.put<Building>(`/buildings/${id}`, input)
};
