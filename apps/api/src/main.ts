import { createApp } from "./app";
import { env } from "./config/env";
import { sequelize } from "./db/sequelize";
import { bootstrapAdmin } from "./services/bootstrapAdmin";

async function start() {
  await sequelize.authenticate();
  await bootstrapAdmin();

  const app = createApp();
  await app.listen({ port: Number(env.API_PORT), host: "0.0.0.0" });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
