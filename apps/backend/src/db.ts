type PrismaClientLike = {
  recordEntity: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args?: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
  };
  syncCursor: {
    upsert: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown | null>;
  };
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

let prismaClientPromise: Promise<PrismaClientLike | null> | null = null;

async function loadPrismaClient(): Promise<PrismaClientLike | null> {
  if (prismaClientPromise) {
    return prismaClientPromise;
  }

  prismaClientPromise = (async () => {
    try {
      const mod = await import('@prisma/client');
      const PrismaClientConstructor = (mod as { PrismaClient?: new () => PrismaClientLike }).PrismaClient;

      if (!PrismaClientConstructor) {
        console.warn('Prisma client constructor is unavailable.');
        return null;
      }

      const client = new PrismaClientConstructor();
      await client.$connect();
      return client;
    } catch (error) {
      console.warn('Prisma client is unavailable; using in-memory persistence.', error);
      return null;
    }
  })();

  return prismaClientPromise;
}

export async function getPrismaClient(): Promise<PrismaClientLike | null> {
  return loadPrismaClient();
}