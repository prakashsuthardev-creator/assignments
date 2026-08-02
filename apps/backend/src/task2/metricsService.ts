import { getTask2Client } from './dbClient.js';

export interface DateRange {
  start: string; // ISO date string YYYY-MM-DD
  end: string;   // ISO date string YYYY-MM-DD
}

export interface PeriodBucket {
  period: string; // ISO date string for period start
  totalCents: number;
}

export interface CollectedRevenue {
  totalCents: number;
  buckets?: PeriodBucket[];
}

type Granularity = 'day' | 'week';

/**
 * THE canonical query function for collected revenue.
 * Both summary and breakdown endpoints call this function.
 * - Without groupBy: returns single total (summary)
 * - With groupBy: returns array of period buckets (breakdown)
 */
export async function getCollectedRevenue(
  range: DateRange,
  groupBy?: Granularity
): Promise<CollectedRevenue> {
  const prisma = await getTask2Client();

  const startDate = `${range.start}T00:00:00.000Z`;
  const endDate = `${range.end}T23:59:59.999Z`;

  if (!groupBy) {
    // Summary: single total using raw SQL to query the collected transactions
    const result = await (prisma as any).$queryRaw`
      SELECT COALESCE(SUM(t."amountCents"), 0)::text as total
      FROM task2_transactions t
      JOIN task2_status_allowlist a
        ON a.source = t.source AND a."sourceStatus" = t."sourceStatus"
      WHERE a."isCollected" = true
        AND t."occurredAt" >= ${startDate}::timestamptz
        AND t."occurredAt" <= ${endDate}::timestamptz
    `;

    const totalCents = result[0]?.total ? Number(result[0].total) : 0;
    return { totalCents };
  }

  // Breakdown: group by period
  const rows = await (prisma as any).$queryRaw`
    SELECT 
      t."occurredAt" as occurred_at,
      t."amountCents" as amount_cents
    FROM task2_transactions t
    JOIN task2_status_allowlist a
      ON a.source = t.source AND a."sourceStatus" = t."sourceStatus"
    WHERE a."isCollected" = true
      AND t."occurredAt" >= ${startDate}::timestamptz
      AND t."occurredAt" <= ${endDate}::timestamptz
    ORDER BY t."occurredAt"
  `;

  // Group by period in-memory
  const bucketMap = new Map<string, number>();
  
  for (const row of rows as any[]) {
    const period = truncateToPeriod(row.occurred_at.toISOString(), groupBy);
    const amountCents = typeof row.amount_cents === 'bigint' 
      ? Number(row.amount_cents) 
      : Number(row.amount_cents);
    bucketMap.set(period, (bucketMap.get(period) || 0) + amountCents);
  }

  const buckets: PeriodBucket[] = Array.from(bucketMap.entries())
    .map(([period, totalCents]) => ({ period, totalCents }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const totalCents = buckets.reduce((sum, b) => sum + b.totalCents, 0);

  return { totalCents, buckets };
}

function truncateToPeriod(timestamp: string, granularity: Granularity): string {
  const date = new Date(timestamp);
  
  if (granularity === 'day') {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Week: truncate to Monday of the week
  const dayOfWeek = date.getUTCDay();
  const daysToMonday = (dayOfWeek + 6) % 7; // 0 = Sunday, 1 = Monday, etc.
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}
