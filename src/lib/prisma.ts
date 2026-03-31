import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances in development (Next.js hot reload).
// In production (Vercel serverless), each cold start gets its own instance.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
