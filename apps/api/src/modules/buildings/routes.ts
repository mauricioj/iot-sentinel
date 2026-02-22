import { FastifyInstance } from "fastify";
import { Building } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { buildingSchema } from "../../validators/schemas";

type BuildingBody = {
  name: string;
  notes?: string | null;
};

export async function buildingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/buildings", { preHandler: [authGuard] }, async () => {
    return Building.findAll({ order: [["created_at", "DESC"]] });
  });

  app.post<{ Body: BuildingBody }>(
    "/buildings",
    { preHandler: [authGuard, validateBody<BuildingBody>(buildingSchema)] },
    async (request, reply) => {
      const created = await Building.create(request.body);
      return reply.code(201).send(created);
    }
  );

  app.put<{ Params: { id: string }; Body: BuildingBody }>(
    "/buildings/:id",
    { preHandler: [authGuard, validateBody<BuildingBody>(buildingSchema)] },
    async (request, reply) => {
      const row = await Building.findByPk(request.params.id);
      if (!row) return reply.code(404).send({ message: "Not found" });
      await row.update(request.body);
      return row;
    }
  );
}
