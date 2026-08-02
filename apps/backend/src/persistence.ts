import { getPrismaClient } from './db.js';
import type { CursorState, NormalizedRecord, SyncStore } from './types.js';

type PrismaRecordEntity = {
  id: string;
  source: string;
  sourceId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  eventDate: string | null;
  amount: number | string | null;
  status: string | null;
  updatedAt: Date;
  rawData: Record<string, unknown>;
};

type PrismaCursorEntity = {
  provider: string;
  cursor: string;
  updatedAt: Date;
};

function toNormalizedRecord(entity: PrismaRecordEntity): NormalizedRecord {
  return {
    id: entity.id,
    source: entity.source,
    sourceId: entity.sourceId,
    name: entity.name ?? null,
    email: entity.email ?? null,
    phone: entity.phone ?? null,
    eventDate: entity.eventDate ?? null,
    amount: typeof entity.amount === 'number' ? entity.amount : entity.amount === null ? null : Number(entity.amount),
    status: entity.status ?? null,
    updatedAt: entity.updatedAt.toISOString(),
    rawData: entity.rawData ?? {},
  };
}

function toCursorState(entity: PrismaCursorEntity): CursorState {
  return {
    provider: entity.provider,
    cursor: entity.cursor,
    updatedAt: entity.updatedAt.getTime(),
  };
}

export class PrismaSyncStore implements SyncStore {
  private readonly records = new Map<string, NormalizedRecord>();
  private readonly cursors = new Map<string, CursorState>();

  async upsertRecord(record: NormalizedRecord): Promise<NormalizedRecord> {
    const client = await getPrismaClient();

    if (client) {
      try {
        const persisted = (await client.recordEntity.upsert({
          where: {
            source_sourceId: {
              source: record.source,
              sourceId: record.sourceId,
            },
          },
          create: {
            id: record.id,
            source: record.source,
            sourceId: record.sourceId,
            name: record.name,
            email: record.email,
            phone: record.phone,
            eventDate: record.eventDate,
            amount: record.amount ?? null,
            status: record.status,
            updatedAt: new Date(record.updatedAt),
            rawData: record.rawData,
          },
          update: {
            name: record.name,
            email: record.email,
            phone: record.phone,
            eventDate: record.eventDate,
            amount: record.amount ?? null,
            status: record.status,
            updatedAt: new Date(record.updatedAt),
            rawData: record.rawData,
          },
        })) as PrismaRecordEntity;

        return toNormalizedRecord(persisted);
      } catch (error) {
        console.warn('Prisma upsert failed, falling back to memory.', error);
      }
    }

    const normalized = {
      ...record,
      id: `${record.source}:${record.sourceId}`,
    };

    this.records.set(normalized.id, normalized);
    return normalized;
  }

  async getCursor(provider: string): Promise<CursorState | undefined> {
    // Check in-memory cache first
    const cached = this.cursors.get(provider);
    if (cached) return cached;

    // Read from database
    const client = await getPrismaClient();
    if (client) {
      try {
        const entity = (await client.syncCursor.findUnique({
          where: { provider },
        })) as PrismaCursorEntity | null;

        if (entity) {
          const cursorState = toCursorState(entity);
          this.cursors.set(provider, cursorState);
          return cursorState;
        }
      } catch (error) {
        console.warn('Prisma cursor read failed, falling back to memory.', error);
      }
    }

    return undefined;
  }

  async setCursor(provider: string, cursor: string, updatedAt: number): Promise<void> {
    const client = await getPrismaClient();

    if (client) {
      try {
        const persisted = (await client.syncCursor.upsert({
          where: { provider },
          create: {
            provider,
            cursor,
            updatedAt: new Date(updatedAt),
          },
          update: {
            cursor,
            updatedAt: new Date(updatedAt),
          },
        })) as PrismaCursorEntity;

        this.cursors.set(provider, toCursorState(persisted));
        return;
      } catch (error) {
        console.warn('Prisma cursor write failed, falling back to memory.', error);
      }
    }

    this.cursors.set(provider, { provider, cursor, updatedAt });
  }

  async listRecords(): Promise<NormalizedRecord[]> {
    const client = await getPrismaClient();

    if (client) {
      try {
        const entities = (await client.recordEntity.findMany({ orderBy: { source: 'asc' } })) as PrismaRecordEntity[];
        return entities.map(toNormalizedRecord);
      } catch (error) {
        console.warn('Prisma list failed, falling back to memory.', error);
      }
    }

    return Array.from(this.records.values()).sort((left, right) => left.source.localeCompare(right.source));
  }
}

export const syncStore = new PrismaSyncStore();
