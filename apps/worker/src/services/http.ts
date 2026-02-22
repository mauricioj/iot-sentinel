import axios from "axios";
import { env } from "../config/env";

export const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10_000,
  headers: {
    "x-internal-token": env.INTERNAL_API_TOKEN
  }
});
