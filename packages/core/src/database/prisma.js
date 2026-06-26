import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
const dbUrl = process.env.DATABASE_URL ?? 'file:./packages/core/watermart.db';
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        datasources: { db: { url: dbUrl } },
        log: process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
