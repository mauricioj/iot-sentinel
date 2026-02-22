import { FastifyInstance } from "fastify";
import { User } from "../../db/models";
import { authGuard } from "../../middleware/authGuard";
import { validateBody } from "../../middleware/validate";
import { createUserSchema } from "../../validators/schemas";
import { hashPassword } from "../../lib/password";

type CreateUserBody = {
  name: string;
  email: string;
  password: string;
  isAdmin?: boolean;
  isActive?: boolean;
};

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateUserBody }>(
    "/users",
    { preHandler: [authGuard, validateBody<CreateUserBody>(createUserSchema)] },
    async (request, reply) => {
      const existing = await User.findOne({ where: { email: request.body.email } });
      if (existing) return reply.code(409).send({ message: "Email already exists" });

      const passwordHash = await hashPassword(request.body.password);
      const created = await User.create({
        name: request.body.name,
        email: request.body.email,
        password_hash: passwordHash,
        is_admin: Boolean(request.body.isAdmin),
        is_active: request.body.isActive ?? true
      });

      return reply.code(201).send({
        id: created.get("id"),
        name: created.get("name"),
        email: created.get("email"),
        isAdmin: created.get("is_admin"),
        isActive: created.get("is_active")
      });
    }
  );

  app.get("/users/me", { preHandler: [authGuard] }, async (request, reply) => {
    const user = await User.findByPk(request.authUser?.userId);
    if (!user) return reply.code(404).send({ message: "User not found" });
    return {
      id: user.get("id"),
      name: user.get("name"),
      email: user.get("email"),
      isAdmin: user.get("is_admin"),
      isActive: user.get("is_active")
    };
  });
}
