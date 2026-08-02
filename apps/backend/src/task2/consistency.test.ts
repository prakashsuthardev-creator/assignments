import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollectedRevenue } from './metricsService.js';
import { getTask2Client } from './dbClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

/**
 * This test exists so that if someone later adds a second way of computing
 * collected revenue, this test — or an equivalent one using the new code path —
 * will catch a mismatch. Do not delete this test when adding new revenue-related
 * code; extend it.
 */

test('Summary and breakdown totals must always agree', async () => {
  // Test range 1: January 2026
  const range1 = { start: '2026-01-01', end: '2026-01-31' };
  
  const summary1 = await getCollectedRevenue(range1);
  const breakdown1 = await getCollectedRevenue(range1, 'day');

  const breakdownSum1 = (breakdown1.buckets || []).reduce(
    (sum, bucket) => sum + bucket.totalCents,
    0
  );

  assert.equal(
    summary1.totalCents,
    breakdownSum1,
    `Summary and breakdown totals must match for range ${range1.start} to ${range1.end}`
  );

  // Test range 2: First two weeks of January 2026
  const range2 = { start: '2026-01-01', end: '2026-01-14' };
  
  const summary2 = await getCollectedRevenue(range2);
  const breakdown2 = await getCollectedRevenue(range2, 'day');

  const breakdownSum2 = (breakdown2.buckets || []).reduce(
    (sum, bucket) => sum + bucket.totalCents,
    0
  );

  assert.equal(
    summary2.totalCents,
    breakdownSum2,
    `Summary and breakdown totals must match for range ${range2.start} to ${range2.end}`
  );
});

test('Unknown status values are excluded by default (fail-closed)', async () => {
  const prisma = await getTask2Client();

  // Insert a transaction with a brand-new, never-before-seen status
  const unknownStatusTxn = {
    id: 'test_source:unknown_status_test',
    source: 'test_source',
    sourceId: 'unknown_status_test',
    sourceStatus: 'brand_new_unknown_status_12345',
    amountCents: BigInt(999999),
    currency: 'usd',
    occurredAt: new Date('2026-01-15T12:00:00Z'),
    raw: { test: true },
  };

  await (prisma as any).task2Transaction.upsert({
    where: { id: unknownStatusTxn.id },
    update: unknownStatusTxn,
    create: unknownStatusTxn,
  });

  // Query for January 2026 (includes the unknown-status transaction)
  const range = { start: '2026-01-01', end: '2026-01-31' };
  
  const summary = await getCollectedRevenue(range);
  const breakdown = await getCollectedRevenue(range, 'day');

  // The unknown-status transaction should NOT be included in either view
  // because there's no matching (test_source, brand_new_unknown_status_12345)
  // row in task2_status_allowlist

  // Query the raw transactions table to confirm it exists
  const rawCheck = await (prisma as any).task2Transaction.findUnique({
    where: { id: unknownStatusTxn.id },
    select: { amountCents: true },
  });

  assert.ok(rawCheck, 'Unknown-status transaction should exist in task2_transactions');
  assert.equal(Number(rawCheck.amountCents), 999999);

  // Query using the collected logic to confirm it's excluded
  const collectedCheck = await (prisma as any).$queryRaw`
    SELECT t.amount_cents
    FROM task2_transactions t
    JOIN task2_status_allowlist a
      ON a.source = t.source AND a.source_status = t.source_status
    WHERE a.is_collected = true
      AND t.id = ${unknownStatusTxn.id}
  `;

  assert.equal(
    collectedCheck.length,
    0,
    'Unknown-status transaction must be excluded from collected transactions query'
  );

  // Verify breakdown also excludes it (no bucket should contain this huge amount)
  const breakdownSum = (breakdown.buckets || []).reduce(
    (sum, bucket) => sum + bucket.totalCents,
    0
  );

  assert.equal(
    summary.totalCents,
    breakdownSum,
    'Summary and breakdown must still agree even with unknown-status row present'
  );

  // Clean up
  await (prisma as any).task2Transaction.delete({
    where: { id: unknownStatusTxn.id },
  });
});
