import dotenv from "dotenv";
import * as yup from "yup";

dotenv.config({ path: "../../.env" });

const envSchema = yup
  .object({
    NODE_ENV: yup.string().default("development"),
    API_PORT: yup.number().default(3000),
    DATABASE_URL: yup.string().required(),
    JWT_ACCESS_SECRET: yup.string().required(),
    JWT_REFRESH_SECRET: yup.string().required(),
    JWT_ACCESS_EXPIRES_IN: yup.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: yup.string().default("7d"),
    ADMIN_EMAIL: yup.string().email().required(),
    ADMIN_PASSWORD: yup.string().min(6).required(),
    ADMIN_NAME: yup.string().required(),
    SCAN_CIDRS: yup.string().default("192.168.1.0/24"),
    INTERNAL_API_TOKEN: yup.string().required()
  })
  .required();

export const env = envSchema.validateSync(process.env, {
  stripUnknown: true
});
