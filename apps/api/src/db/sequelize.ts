import { Sequelize } from "sequelize";
import { env } from "../config/env";
import { initModels } from "./models";

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: false
});

initModels(sequelize);
