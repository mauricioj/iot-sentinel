import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export const env = {
  API_BASE_URL: process.env.API_BASE_URL ?? "http://localhost:3000",
  INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN ?? "",
  SCAN_CRON: process.env.SCAN_CRON ?? "*/5 * * * *",
  SCAN_CIDRS: (process.env.SCAN_CIDRS ?? "192.168.1.0/24").split(",").map((x) => x.trim()),
  HEALTH_CRON: process.env.HEALTH_CRON ?? "*/2 * * * *",
  HEALTH_TIMEOUT_MS: Number(process.env.HEALTH_TIMEOUT_MS ?? "2000")
};
