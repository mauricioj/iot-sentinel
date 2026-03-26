export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface User {
  _id: string;
  username: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SetupStatus {
  setupCompleted: boolean;
}

export interface Settings {
  _id: string;
  instanceName: string;
  language: string;
  timezone: string;
  setupCompleted: boolean;
}

export interface Local {
  _id: string;
  name: string;
  description: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Network {
  _id: string;
  localId: string;
  name: string;
  vlanId: number | null;
  cidr: string;
  gateway: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Thing {
  _id: string;
  networkId: string;
  groupIds: string[];
  name: string;
  type: string;
  macAddress: string;
  ipAddress: string;
  hostname: string;
  vendor: string;
  os: string;
  description: string;
  registrationStatus: 'discovered' | 'registered';
  healthStatus: 'online' | 'offline' | 'unknown';
  lastSeenAt: string;
  ports: { port: number; protocol: string; service: string; version: string }[];
  channels: { number: number; direction: string; name: string; type: string; description: string }[];
  credentials: { username: string; password: string; notes: string };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThingTypeCapabilities {
  enableChannels: boolean;
  enablePortScan: boolean;
  enableCredentials: boolean;
}

export interface ThingTypeItem {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  capabilities: ThingTypeCapabilities;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  things: {
    total: number;
    registered: number;
    discovered: number;
    online: number;
    offline: number;
    unknown: number;
  };
  locals: { total: number };
}

export interface StatusEvent {
  _id: string;
  thingId: string;
  healthStatus: 'online' | 'offline';
  timestamp: string;
}

export interface ThingHistory {
  events: StatusEvent[];
  uptime: {
    uptimePercent: number;
    totalOnline: number;
    totalOffline: number;
  };
}

export interface UptimeStats {
  averageUptimePercent: number;
  thingCount: number;
}
