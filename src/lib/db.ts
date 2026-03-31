/**
 * db.ts — User store backed by Prisma/Supabase.
 * Replaces the original in-memory Map.
 */

import type { User } from "@/types/content";

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.appUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) return undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId ?? "",
    role: (user.role as User["role"]) ?? "client",
    passwordHash: user.passwordHash ?? "",
    createdAt: user.createdAt.toISOString(),
  };
}

export async function findUserById(id: string): Promise<User | undefined> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.appUser.findUnique({ where: { id } });
  if (!user) return undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId ?? "",
    role: (user.role as User["role"]) ?? "client",
    passwordHash: user.passwordHash ?? "",
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createUser(user: User): Promise<User> {
  const { prisma } = await import("@/lib/prisma");
  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("A user with this email already exists");

  const created = await prisma.appUser.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId || null,
      role: user.role,
      passwordHash: user.passwordHash,
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    tenantId: created.tenantId ?? "",
    role: (created.role as User["role"]) ?? "client",
    passwordHash: created.passwordHash ?? "",
    createdAt: created.createdAt.toISOString(),
  };
}
