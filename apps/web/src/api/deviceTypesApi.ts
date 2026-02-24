import { api } from "./client";
import { DeviceType } from "./types";

export type UpsertDeviceTypeInput = {
  name: string;
  category: string;
  default_protocols: string[];
};

export const deviceTypesApi = {
  list: () => api.get<DeviceType[]>("/device-types"),
  create: (input: UpsertDeviceTypeInput) => api.post<DeviceType>("/device-types", input),
  update: (id: string, input: UpsertDeviceTypeInput) => api.put<DeviceType>(`/device-types/${id}`, input),
  remove: (id: string) => api.delete<void>(`/device-types/${id}`)
};
