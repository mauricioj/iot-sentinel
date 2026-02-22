export type DeviceStatus = "online" | "offline" | "unknown";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ScanHostInput = {
  ip: string;
  mac: string;
  vendor?: string | null;
  hostname?: string | null;
  openPorts?: number[];
  hints?: string[];
};

export type ScanRunResult = {
  scanRunId: string;
  hosts: ScanHostInput[];
};
