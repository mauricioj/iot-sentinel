import { FastifyInstance } from "fastify";
import { Device, DeviceType, Location, NetworkInterface } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { deviceSchema, interfaceSchema } from "../../validators/schemas";

type DeviceBody = {
  name: string;
  device_type_id: string;
  location_id: string;
  status: "online" | "offline" | "unknown";
  last_seen_at?: Date | null;
  notes?: string | null;
  tags?: string[];
};

type InterfaceBody = {
  mac: string;
  interface_type: string;
  vendor?: string | null;
  last_ip?: string | null;
};

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/devices", { preHandler: [authGuard] }, async () => {
    return Device.findAll({ order: [["created_at", "DESC"]] });
  });

  app.post<{ Body: DeviceBody }>(
    "/devices",
    { preHandler: [authGuard, validateBody<DeviceBody>(deviceSchema)] },
    async (request, reply) => {
      const [type, location] = await Promise.all([
        DeviceType.findByPk(request.body.device_type_id),
        Location.findByPk(request.body.location_id)
      ]);
      if (!type || !location) return reply.code(400).send({ message: "Invalid foreign keys" });
      const created = await Device.create(request.body);
      return reply.code(201).send(created);
    }
  );

  app.put<{ Params: { id: string }; Body: DeviceBody }>(
    "/devices/:id",
    { preHandler: [authGuard, validateBody<DeviceBody>(deviceSchema)] },
    async (request, reply) => {
      const row = await Device.findByPk(request.params.id);
      if (!row) return reply.code(404).send({ message: "Not found" });
      await row.update(request.body);
      return row;
    }
  );

  app.get<{ Params: { id: string } }>("/devices/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const device = await Device.findByPk(request.params.id, {
      include: [{ model: NetworkInterface, as: "interfaces" }, { model: DeviceType }, { model: Location }]
    });
    if (!device) return reply.code(404).send({ message: "Not found" });
    return device;
  });

  app.post<{ Params: { id: string }; Body: InterfaceBody }>(
    "/devices/:id/interfaces",
    { preHandler: [authGuard, validateBody<InterfaceBody>(interfaceSchema)] },
    async (request, reply) => {
      const device = await Device.findByPk(request.params.id);
      if (!device) return reply.code(404).send({ message: "Device not found" });

      const created = await NetworkInterface.create({
        ...request.body,
        device_id: request.params.id,
        last_seen_at: new Date()
      });
      return reply.code(201).send(created);
    }
  );
}
