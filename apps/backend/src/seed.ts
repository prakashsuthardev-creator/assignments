import { PrismaSyncStore } from './persistence.js';

const store = new PrismaSyncStore();

export async function seedDemoRecords() {
  await store.upsertRecord({
    id: 'HubSpot:hubspot-1',
    source: 'HubSpot',
    sourceId: 'hubspot-1',
    name: 'HubSpot Record',
    email: 'hubspot@example.com',
    phone: '0000000000',
    eventDate: '2026-01-01',
    amount: 10,
    status: 'active',
    updatedAt: new Date().toISOString(),
    rawData: {},
  });

  await store.upsertRecord({
    id: 'Stripe:stripe-1',
    source: 'Stripe',
    sourceId: 'stripe-1',
    name: 'Stripe Record',
    email: 'stripe@example.com',
    phone: '0000000000',
    eventDate: '2026-01-01',
    amount: 25,
    status: 'active',
    updatedAt: new Date().toISOString(),
    rawData: {},
  });

  return store.listRecords();
}
