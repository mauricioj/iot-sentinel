export type ApiError = {
  message: string;
};

export type DeviceType = {
  id: string;
  name: string;
  category: string;
  default_protocols: string[];
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  building_id: string;
  path: string;
  details: string | null;
  created_at: string;
  updated_at: string;
};

export type Building = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Device = {
  id: string;
  name: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeviceDetail = Device & {
  notes: string | null;
  interfaces: Array<{
    id: string;
    mac: string;
    last_ip: string | null;
    vendor: string | null;
    interface_type: string;
  }>;
};

export type DiscoveredHost = {
  id: string;
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  open_ports: number[];
  hints: string[];
  registered_device_id: string | null;
  last_seen_at: string;
};
