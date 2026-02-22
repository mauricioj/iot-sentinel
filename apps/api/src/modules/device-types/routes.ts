import { FastifyInstance } from "fastify";
import { DeviceType } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { deviceTypeSchema } from "../../validators/schemas";

type DeviceTypeBody = {
  name: string;
  category: string;
  default_protocols: string[];
};

export async function deviceTypeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/device-types", { preHandler: [authGuard] }, async () => {
    return DeviceType.findAll({ order: [["created_at", "DESC"]] });
  });

  app.post<{ Body: DeviceTypeBody }>(
    "/device-types",
    { preHandler: [authGuard, validateBody<DeviceTypeBody>(deviceTypeSchema)] },
    async (request, reply) => {
      const created = await DeviceType.create(request.body);
      return reply.code(201).send(created);
    }
  );

  app.put<{ Params: { id: string }; Body: DeviceTypeBody }>(
    "/device-types/:id",
    { preHandler: [authGuard, validateBody<DeviceTypeBody>(deviceTypeSchema)] },
    async (request, reply) => {
      const row = await DeviceType.findByPk(request.params.id);
      if (!row) return reply.code(404).send({ message: "Not found" });
      await row.update(request.body);
      return row;
    }
  );
}
