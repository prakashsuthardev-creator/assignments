# Task 2: Single Source of Truth Revenue Metric

## Overview

Task 2 implements a canonical revenue calculation system that prevents drift between different code paths. The core principle is **allow-list, not exclusion-list** — a transaction status counts as collected revenue only if explicitly marked as such in the allow-list.

## Architecture

### Database (Supabase Postgres)

Three components work together to enforce the single source of truth:

1. **`task2_transactions`** — Raw transaction data from all sources
2. **`task2_status_allowlist`** — The canonical definition of what "collected" means per source
3. **`task2_collected_transactions`** (VIEW) — The ONLY way to query collected revenue

The view is the structural mechanism that prevents drift. Any code that needs "collected revenue" MUST query this view, which internally joins against the allow-list.

### Data Sources

#### Real Data: Stripe Test Mode
- Pulls **Charges only** via Stripe API (not PaymentIntents — each payment creates both, and ingesting both double-counts revenue)
- Uses the existing `STRIPE_SECRET_KEY` (test mode)
- Demonstrates real-world status values: `succeeded`, `refunded`, `pending`, `failed`, etc.

#### Fixture Data (Demonstrating Multi-Source Vocabularies)
- **`legacy_billing`** — Synthetic legacy system with statuses: `completed`, `voided`, `pending`
- **`partner_x`** — Synthetic partner integration with statuses: `success`, `failed`, `pending`

These fixtures are in `fixtures/*.json` and labeled clearly as test data.

### Allow-List (Single Source of Truth)

The allow-list lives in **`allowlist.json`** and is consumed by:
- SQL migration (`migration.sql`) for seeding the database
- TypeScript (`allowlist.ts`) for any runtime validation

This ensures there is ONE physical file defining what counts as collected revenue, not duplicated logic in SQL and code.

## File Structure

```
apps/backend/src/task2/
├── README.md                  (this file)
├── allowlist.json             (THE canonical allow-list data)
├── allowlist.ts               (TypeScript export of allow-list)
├── supabaseClient.ts          (Supabase client singleton)
├── fixtures/
│   ├── legacy_billing.json    (fixture data for legacy_billing source)
│   └── partner_x.json         (fixture data for partner_x source)
├── ingest.ts                  (pulls Stripe + loads fixtures, upserts to DB)
├── metricsService.ts          (THE canonical query function for collected revenue)
├── routes.ts                  (API endpoints: /sync, /metrics/summary, /metrics/breakdown)
├── consistency.test.ts        (drift-catcher test)
└── migration.sql              (database schema + allow-list seed)
```

## API Endpoints

### `POST /api/task2/sync`
Triggers ingestion from Stripe test mode + fixture sources. Idempotent (uses upsert on unique constraint).

**Response:**
```json
{
  "success": true,
  "recordsSaved": 42,
  "message": "Ingested 42 transactions from Stripe + fixtures"
}
```

### `GET /api/task2/metrics/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`
Returns total collected revenue for the date range.

**Response:**
```json
{
  "start": "2026-01-01",
  "end": "2026-01-31",
  "totalCents": 128400,
  "currency": "usd"
}
```

### `GET /api/task2/metrics/breakdown?start=YYYY-MM-DD&end=YYYY-MM-DD&granularity=day|week`
Returns breakdown by period.

**Response:**
```json
{
  "start": "2026-01-01",
  "end": "2026-01-31",
  "granularity": "day",
  "buckets": [
    { "period": "2026-01-01", "totalCents": 4200 },
    { "period": "2026-01-02", "totalCents": 0 }
  ]
}
```

**Structural guarantee:** `sum(buckets[].totalCents)` always equals `summary.totalCents` for the same range, because both query the same view via the same `getCollectedRevenue()` function.

## The Drift-Catcher Test

`consistency.test.ts` contains two critical tests:

1. **Agreement test** — Verifies that summary and breakdown totals always match for the same date range
2. **Fail-closed test** — Verifies that a transaction with an unknown status (no allow-list entry) is excluded from both views

### Why This Test Exists

If someone later adds a second way of computing collected revenue (e.g., a new endpoint that doesn't use `metricsService.getCollectedRevenue`), this test — or an equivalent one using the new code path — will catch the mismatch.

**Do not delete this test when adding new revenue-related code; extend it.**

## Setup Instructions

### 1. Install Dependencies
```bash
cd apps/backend
pnpm install
```

### 2. Run Database Migration
Execute `migration.sql` against your Supabase Postgres database:

```bash
# Option 1: Via Supabase Dashboard SQL Editor
# Copy/paste the contents of migration.sql and run

# Option 2: Via psql (if you have direct access)
psql $DATABASE_URL -f src/task2/migration.sql
```

### 3. Environment Variables
Ensure these are set in `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://....supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### 4. Sync Test Data
Start the backend and trigger the sync:

```bash
pnpm dev

# In another terminal or via the frontend UI:
curl -X POST http://localhost:3000/api/task2/sync
```

### 5. Run Tests
```bash
node --test src/task2/consistency.test.ts
```

## Design Principles

### 1. Allow-List, Not Exclusion-List
Unknown statuses are excluded by default (fail closed). A new status must be explicitly added to the allow-list to count as collected revenue.

### 2. Single Query Function
`metricsService.getCollectedRevenue()` is THE canonical way to compute revenue. Summary and breakdown both call this function; they differ only in the `groupBy` parameter.

### 3. View as Anti-Drift Mechanism
`task2_collected_transactions` is not just a convenience — it's the structural enforcement of the single source of truth. Any code that queries this view automatically gets the correct allow-list logic.

### 4. One Physical File for Allow-List
`allowlist.json` is the single source, consumed by both SQL seed and TypeScript. No duplicated logic in two places.

## Adding a New Source

1. Add fixture data to `fixtures/new_source.json`
2. Update `allowlist.json` with new source statuses
3. Re-run the migration to seed the allow-list
4. Update `ingest.ts` to load the new fixture
5. Sync and verify via the API/UI

## Adding a New Status to an Existing Source

1. Update `allowlist.json` with the new status
2. Insert into `task2_status_allowlist`:
   ```sql
   INSERT INTO task2_status_allowlist (source, source_status, is_collected)
   VALUES ('stripe', 'new_status', true);
   ```
3. Transactions with that status will now be included (or excluded) based on `is_collected`

## Notes

- All amounts are stored in cents (integer) to avoid floating-point precision issues
- All timestamps are `timestamptz` (timezone-aware)
- The migration uses `ON CONFLICT DO NOTHING` for allow-list inserts, making it safe to re-run
- Supabase writes use the publishable (anon) key with RLS disabled (test project defaults)
  - **TODO:** If RLS is enabled later, a service-role key would be needed for writes
