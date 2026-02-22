import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./modules/auth/routes";
import { userRoutes } from "./modules/users/routes";
import { deviceTypeRoutes } from "./modules/device-types/routes";
import { buildingRoutes } from "./modules/buildings/routes";
import { locationRoutes } from "./modules/locations/routes";
import { deviceRoutes } from "./modules/devices/routes";
import { discoveryRoutes } from "./modules/discovery/routes";
import { scanRoutes } from "./modules/scan/routes";
import { internalRoutes } from "./modules/internal/routes";

export function createApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(userRoutes);
  app.register(deviceTypeRoutes);
  app.register(buildingRoutes);
  app.register(locationRoutes);
  app.register(deviceRoutes);
  app.register(discoveryRoutes);
  app.register(scanRoutes);
  app.register(internalRoutes);

  return app;
}
