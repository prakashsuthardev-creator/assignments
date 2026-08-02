import { getPrismaClient } from './db.js';

export async function getHealthPayload() {
  const prismaClient = await getPrismaClient();

  return {
    status: 'ok',
    database: prismaClient ? 'prisma' : 'memory-fallback',
    persistence: prismaClient ? 'database' : 'in-memory fallback',
    message: prismaClient
      ? 'Records are being persisted through Prisma.'
      : 'Database persistence is unavailable because Prisma could not be generated and PostgreSQL is not reachable.',
  };
}
