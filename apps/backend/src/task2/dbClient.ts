import { getPrismaClient } from '../db.js';

let prismaClient: Awaited<ReturnType<typeof getPrismaClient>> | null = null;

export async function getTask2Client() {
  if (!prismaClient) {
    prismaClient = await getPrismaClient();
  }
  
  if (!prismaClient) {
    throw new Error('Database connection not available. Ensure DATABASE_URL is configured.');
  }
  
  return prismaClient;
}
