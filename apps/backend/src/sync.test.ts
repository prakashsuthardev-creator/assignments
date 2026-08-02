import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runSync } from './sync.js';
import type { CursorState, NormalizedRecord, SyncStore } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

class MemorySyncStore implements SyncStore {
  private records = new Map<string, NormalizedRecord>();
  private cursors = new Map<string, CursorState>();

  async upsertRecord(record: NormalizedRecord): Promise<NormalizedRecord> {
    this.records.set(record.id, record);
    return record;
  }

  async getCursor(provider: string): Promise<CursorState | undefined> {
    return this.cursors.get(provider);
  }

  async setCursor(provider: string, cursor: string, updatedAt: number): Promise<void> {
    this.cursors.set(provider, { provider, cursor, updatedAt });
  }

  async listRecords(): Promise<NormalizedRecord[]> {
    return Array.from(this.records.values()).sort((left, right) => left.source.localeCompare(right.source));
  }
}

test('runSync stores deterministic results and cursors for each provider', async () => {
  const store = new MemorySyncStore();

  const results = await runSync(store);

  assert.equal(results.length, 3);
  assert.equal(results[0].status, 'success');
  assert.equal(results[1].status, 'success');
  assert.equal(results[2].status, 'success');

  const records = await store.listRecords();
  assert.ok(records.length >= 3);
  const sources = new Set(records.map((record) => record.source));
  assert.ok(sources.has('HubSpot'));
  assert.ok(sources.has('Stripe'));
  assert.ok(sources.has('Google Calendar'));

  const hubspotCursor = await store.getCursor('HubSpot');
  assert.ok(hubspotCursor);
  const stripeCursor = await store.getCursor('Stripe');
  assert.ok(stripeCursor);
  const gcalCursor = await store.getCursor('Google Calendar');
  assert.ok(gcalCursor);
});
