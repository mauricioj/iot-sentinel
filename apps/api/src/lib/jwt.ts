import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type AccessPayload = { sub: string; type: "access" };
type RefreshPayload = { sub: string; type: "refresh" };

export function signAccessToken(userId: string): string {
  const payload: AccessPayload = { sub: userId, type: "access" };
  const secret: Secret = env.JWT_ACCESS_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]
  };
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshPayload = { sub: userId, type: "refresh" };
  const secret: Secret = env.JWT_REFRESH_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]
  };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}
