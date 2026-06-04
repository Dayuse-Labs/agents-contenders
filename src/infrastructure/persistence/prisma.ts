import { PrismaClient } from '@prisma/client';

/** Client Prisma en singleton (évite la multiplication de connexions en dev/hot-reload). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
