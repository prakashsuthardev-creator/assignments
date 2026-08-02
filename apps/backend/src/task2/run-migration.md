# Running the Task 2 Database Migration

## Prerequisites
- Supabase project created
- Environment variables set in `.env`:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`

## Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open `migration.sql` from this directory
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run"

### Option 2: Via Supabase CLI

```bash
# From the project root
supabase db push

# Or execute the migration directly
supabase db execute --file apps/backend/src/task2/migration.sql
```

### Option 3: Via psql (Direct Database Access)

```bash
# Get your database connection string from Supabase dashboard
# Then run:
psql "postgresql://..." -f apps/backend/src/task2/migration.sql
```

## Verification

After running the migration, verify the tables exist:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'task2%';

-- Should return:
-- task2_transactions
-- task2_status_allowlist

-- Check the view
SELECT * FROM task2_collected_transactions LIMIT 1;

-- Check allow-list data
SELECT * FROM task2_status_allowlist ORDER BY source, source_status;
```

## What the Migration Creates

1. **`task2_transactions`** table with columns:
   - id (primary key, format: `source:source_id`)
   - source, source_id (unique constraint)
   - source_status, amount_cents, currency
   - occurred_at, synced_at (timestamps)
   - raw (jsonb for full object)

2. **`task2_status_allowlist`** table with:
   - source, source_status (composite primary key)
   - is_collected (boolean)

3. **`task2_collected_transactions`** view that joins the above

4. **Seed data** for the allow-list covering:
   - Stripe statuses (succeeded, paid, refunded, canceled, etc.)
   - Legacy billing statuses (completed, voided, pending)
   - Partner X statuses (success, pending, failed)

## Troubleshooting

### "relation already exists" error
The migration uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, so it's safe to re-run. If you see this error, the tables already exist.

### RLS (Row Level Security) issues
The current implementation assumes RLS is disabled (default for new Supabase projects). If you've enabled RLS, you'll need to either:
- Disable RLS for these tables: `ALTER TABLE task2_transactions DISABLE ROW LEVEL SECURITY;`
- Use a service-role key instead of the publishable key (requires code change)
- Add appropriate RLS policies for your use case
