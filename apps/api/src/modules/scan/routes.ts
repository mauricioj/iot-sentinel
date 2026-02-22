import { FastifyInstance } from "fastify";
import { authGuard } from "../../middleware/authGuard";
import { env } from "../../config/env";
import { runScan } from "../../services/scanService";

export async function scanRoutes(app: FastifyInstance): Promise<void> {
  app.post("/scan/start", { preHandler: [authGuard] }, async () => {
    const cidrs = env.SCAN_CIDRS.split(",");
    return runScan(cidrs);
  });
}
