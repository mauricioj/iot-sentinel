import { api } from "./client";
import { Location } from "./types";

export type UpsertLocationInput = {
  building_id: string;
  path: string;
  details?: string | null;
};

export const locationsApi = {
  list: () => api.get<Location[]>("/locations"),
  create: (input: UpsertLocationInput) => api.post<Location>("/locations", input),
  update: (id: string, input: UpsertLocationInput) => api.put<Location>(`/locations/${id}`, input),
  remove: (id: string) => api.delete<void>(`/locations/${id}`)
};
