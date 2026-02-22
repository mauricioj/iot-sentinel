import net from "node:net";
import { env } from "../config/env";
import { api } from "../services/http";

type HealthTarget = { deviceId: string; ip: string };

function checkTcp80(ip: string, timeoutMs: number): Promise<{ status: "ok" | "down"; latencyMs: number | null }> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    let finished = false;

    const done = (status: "ok" | "down") => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({ status, latencyMs: status === "ok" ? Date.now() - startedAt : null });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done("ok"));
    socket.once("timeout", () => done("down"));
    socket.once("error", () => done("down"));
    socket.connect(80, ip);
  });
}

export async function runHealthJob(): Promise<void> {
  const { data } = await api.get<HealthTarget[]>("/internal/health/targets");
  const checks = [];

  for (const target of data) {
    const result = await checkTcp80(target.ip, env.HEALTH_TIMEOUT_MS);
    checks.push({
      device_id: target.deviceId,
      status: result.status,
      latency_ms: result.latencyMs,
      details: { ip: target.ip }
    });
  }

  if (checks.length > 0) {
    await api.post("/internal/health/checks", { checks });
  }
}
