import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaSyncStore } from './persistence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

test('PrismaSyncStore stores and lists normalized records deterministically', async () => {
  const store = new PrismaSyncStore();

  await store.upsertRecord({
    id: 'HubSpot:hubspot-1',
    source: 'HubSpot',
    sourceId: 'hubspot-1',
    name: 'HubSpot Contact',
    email: 'hubspot@example.com',
    phone: '555-0101',
    eventDate: '2026-01-05',
    amount: 150,
    status: 'active',
    updatedAt: '2026-01-05T00:00:00.000Z',
    rawData: { sourceId: 'hubspot-1' },
  });

  const records = await store.listRecords();

  const found = records.find((r) => r.id === 'HubSpot:hubspot-1');
  assert.ok(found);
  assert.equal(found.source, 'HubSpot');
  assert.equal(found.sourceId, 'hubspot-1');
  assert.equal(found.name, 'HubSpot Contact');
});
