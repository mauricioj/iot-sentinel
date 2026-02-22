import { FastifyInstance } from "fastify";
import { Device, HealthCheck, NetworkInterface } from "../../db/models";
import { internalGuard } from "../../middleware/authGuard";
import { runScan } from "../../services/scanService";

type HealthInput = {
  device_id: string;
  status: "ok" | "down";
  latency_ms?: number | null;
  details?: Record<string, unknown>;
};

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { cidrs?: string[] } }>(
    "/internal/scan/run",
    { preHandler: [internalGuard] },
    async (request) => {
      const cidrs = request.body?.cidrs?.length ? request.body.cidrs : ["192.168.1.0/24"];
      return runScan(cidrs);
    }
  );

  app.get("/internal/health/targets", { preHandler: [internalGuard] }, async () => {
    const devices = await Device.findAll({
      include: [{ model: NetworkInterface, as: "interfaces" }]
    });

    return devices
      .map((d) => {
        const interfaces = (d.get("interfaces") as NetworkInterface[]) ?? [];
        const ip = interfaces.find((i) => i.get("last_ip"))?.get("last_ip");
        if (!ip) return null;
        return { deviceId: d.get("id"), ip };
      })
      .filter(Boolean);
  });

  app.post<{ Body: { checks: HealthInput[] } }>(
    "/internal/health/checks",
    { preHandler: [internalGuard] },
    async (request) => {
      const now = new Date();
      for (const check of request.body.checks) {
        await HealthCheck.create({
          device_id: check.device_id,
          check_type: "tcp-80",
          status: check.status,
          latency_ms: check.latency_ms ?? null,
          checked_at: now,
          details: check.details ?? {}
        });
      }
      return { count: request.body.checks.length };
    }
  );
}
