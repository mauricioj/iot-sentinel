import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/jwt";
import { env } from "../config/env";

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      reply.code(401).send({ message: "Invalid token type" });
      return;
    }
    request.authUser = { userId: payload.sub };
  } catch {
    reply.code(401).send({ message: "Invalid token" });
    return;
  }
}

export async function internalGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.headers["x-internal-token"];
  if (!token || token !== env.INTERNAL_API_TOKEN) {
    reply.code(401).send({ message: "Unauthorized internal access" });
    return;
  }
}
