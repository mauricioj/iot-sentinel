import { FastifyInstance } from "fastify";
import { Building, Location } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { locationSchema } from "../../validators/schemas";

type LocationBody = {
  building_id: string;
  path: string;
  details?: string | null;
};

export async function locationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/locations", { preHandler: [authGuard] }, async () => {
    return Location.findAll({ order: [["created_at", "DESC"]] });
  });

  app.post<{ Body: LocationBody }>(
    "/locations",
    { preHandler: [authGuard, validateBody<LocationBody>(locationSchema)] },
    async (request, reply) => {
      const building = await Building.findByPk(request.body.building_id);
      if (!building) return reply.code(400).send({ message: "Invalid building_id" });
      const created = await Location.create(request.body);
      return reply.code(201).send(created);
    }
  );

  app.put<{ Params: { id: string }; Body: LocationBody }>(
    "/locations/:id",
    { preHandler: [authGuard, validateBody<LocationBody>(locationSchema)] },
    async (request, reply) => {
      const row = await Location.findByPk(request.params.id);
      if (!row) return reply.code(404).send({ message: "Not found" });
      await row.update(request.body);
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/locations/:id",
    { preHandler: [authGuard] },
    async (request, reply) => {
      const row = await Location.findByPk(request.params.id);
      if (!row) return reply.code(404).send({ message: "Not found" });
      await row.destroy();
      return reply.code(204).send();
    }
  );
}
