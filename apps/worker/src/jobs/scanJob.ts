import { api } from "../services/http";
import { env } from "../config/env";

export async function runScanJob(): Promise<void> {
  await api.post("/internal/scan/run", { cidrs: env.SCAN_CIDRS });
}
