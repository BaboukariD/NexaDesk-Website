import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: without this, every hot reload
// would open a fresh SQLite connection and eventually exhaust them.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
