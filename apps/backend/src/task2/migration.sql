-- Task 2: Single Source of Truth Revenue Metric
-- Migration file to be run against Supabase Postgres

-- Transactions table: one row per normalized transaction from any source
CREATE TABLE IF NOT EXISTS task2_transactions (
  id              text PRIMARY KEY,           -- ${source}:${source_id}
  source          text NOT NULL,
  source_id       text NOT NULL,
  source_status   text NOT NULL,              -- raw vocabulary, verbatim
  amount_cents    bigint NOT NULL,
  currency        text NOT NULL DEFAULT 'usd',
  occurred_at     timestamptz NOT NULL,
  raw             jsonb NOT NULL,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

-- Status allow-list: (source, source_status) -> is_collected?
CREATE TABLE IF NOT EXISTS task2_status_allowlist (
  source          text NOT NULL,
  source_status   text NOT NULL,
  is_collected    boolean NOT NULL,
  PRIMARY KEY (source, source_status)
);

-- The single canonical definition of "collected revenue"
-- Both API endpoints MUST read from this view
CREATE OR REPLACE VIEW task2_collected_transactions AS
SELECT t.*
FROM task2_transactions t
JOIN task2_status_allowlist a
  ON a.source = t.source AND a.source_status = t.source_status
WHERE a.is_collected = true;

-- Seed the allow-list from allowlist.json
-- stripe statuses
INSERT INTO task2_status_allowlist (source, source_status, is_collected) VALUES
  ('stripe', 'succeeded', true),
  ('stripe', 'paid', true),
  ('stripe', 'requires_payment_method', false),
  ('stripe', 'canceled', false),
  ('stripe', 'refunded', false),
  ('stripe', 'pending', false)
ON CONFLICT (source, source_status) DO NOTHING;

-- legacy_billing statuses
INSERT INTO task2_status_allowlist (source, source_status, is_collected) VALUES
  ('legacy_billing', 'completed', true),
  ('legacy_billing', 'voided', false),
  ('legacy_billing', 'pending', false)
ON CONFLICT (source, source_status) DO NOTHING;

-- partner_x statuses
INSERT INTO task2_status_allowlist (source, source_status, is_collected) VALUES
  ('partner_x', 'success', true),
  ('partner_x', 'pending', false),
  ('partner_x', 'failed', false)
ON CONFLICT (source, source_status) DO NOTHING;
