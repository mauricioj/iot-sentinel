import { FastifyInstance } from "fastify";
import { Device, DiscoveredHost, NetworkInterface } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { registerHostSchema } from "../../validators/schemas";

type RegisterBody = {
  name: string;
  device_type_id: string;
  location_id: string;
  notes?: string | null;
  tags?: string[];
};

export async function discoveryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/discovered-hosts", { preHandler: [authGuard] }, async () => {
    return DiscoveredHost.findAll({ order: [["last_seen_at", "DESC"]] });
  });

  app.post<{ Params: { id: string }; Body: RegisterBody }>(
    "/discovered-hosts/:id/register",
    { preHandler: [authGuard, validateBody<RegisterBody>(registerHostSchema)] },
    async (request, reply) => {
      const host = await DiscoveredHost.findByPk(request.params.id);
      if (!host) return reply.code(404).send({ message: "Host not found" });
      if (host.get("registered_device_id")) {
        return reply.code(400).send({ message: "Host already registered" });
      }

      const device = await Device.create({
        name: request.body.name,
        device_type_id: request.body.device_type_id,
        location_id: request.body.location_id,
        status: "online",
        last_seen_at: new Date(),
        notes: request.body.notes ?? null,
        tags: request.body.tags ?? []
      });

      const hostMac = host.get("mac") as string | null;
      if (hostMac) {
        await NetworkInterface.create({
          device_id: device.get("id"),
          mac: hostMac,
          interface_type: "ethernet",
          vendor: host.get("vendor"),
          last_ip: host.get("ip"),
          last_seen_at: new Date()
        });
      }

      await host.update({ registered_device_id: device.get("id") });
      return { deviceId: device.get("id") };
    }
  );
}
