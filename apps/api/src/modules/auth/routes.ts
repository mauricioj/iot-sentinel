import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { comparePassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { RefreshToken, User } from "../../db/models";
import { validateBody } from "../../middleware/validate";
import { loginSchema, refreshSchema } from "../../validators/schemas";
import { sha256 } from "../../lib/tokenHash";

type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    "/auth/login",
    { preHandler: validateBody<LoginBody>(loginSchema) },
    async (request, reply) => {
      const user = await User.findOne({ where: { email: request.body.email } });
      if (!user) return reply.code(401).send({ message: "Invalid credentials" });

      const valid = await comparePassword(request.body.password, user.get("password_hash") as string);
      if (!valid) return reply.code(401).send({ message: "Invalid credentials" });

      const accessToken = signAccessToken(user.get("id") as string);
      const refreshToken = signRefreshToken(user.get("id") as string);
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;
      const exp = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

      await RefreshToken.create({
        user_id: user.get("id"),
        token_hash: sha256(refreshToken),
        expires_at: exp,
        created_at: new Date()
      });

      return { accessToken, refreshToken };
    }
  );

  app.post<{ Body: RefreshBody }>(
    "/auth/refresh",
    { preHandler: validateBody<RefreshBody>(refreshSchema) },
    async (request, reply) => {
      try {
        const payload = verifyRefreshToken(request.body.refreshToken);
        const tokenHash = sha256(request.body.refreshToken);
        const stored = await RefreshToken.findOne({
          where: {
            token_hash: tokenHash,
            revoked_at: null
          }
        });
        if (!stored) return reply.code(401).send({ message: "Invalid refresh token" });

        const expiresAt = stored.get("expires_at") as Date;
        if (expiresAt.getTime() < Date.now()) {
          return reply.code(401).send({ message: "Refresh token expired" });
        }

        return { accessToken: signAccessToken(payload.sub) };
      } catch {
        return reply.code(401).send({ message: "Invalid refresh token" });
      }
    }
  );

  app.post<{ Body: RefreshBody }>(
    "/auth/logout",
    { preHandler: validateBody<RefreshBody>(refreshSchema) },
    async (request) => {
      await RefreshToken.update(
        { revoked_at: new Date() },
        {
          where: {
            token_hash: sha256(request.body.refreshToken),
            revoked_at: null
          }
        }
      );
      return { ok: true };
    }
  );
}
