import { User } from "../db/models";
import { env } from "../config/env";
import { hashPassword } from "../lib/password";

export async function bootstrapAdmin(): Promise<void> {
  const existing = await User.findOne({ where: { email: env.ADMIN_EMAIL } });
  if (existing) return;

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password_hash: passwordHash,
    is_admin: true,
    is_active: true
  });
}
