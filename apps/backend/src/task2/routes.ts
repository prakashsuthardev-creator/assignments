import { Router, type Router as ExpressRouter } from 'express';
import { ingestAllSources } from './ingest.js';
import { getCollectedRevenue } from './metricsService.js';

const router: ExpressRouter = Router();

/**
 * POST /api/task2/sync
 * Triggers ingestion of Stripe test-mode data + fixture sources
 */
router.post('/sync', async (_req, res) => {
  const result = await ingestAllSources();
  res.json(result);
});

/**
 * GET /api/task2/metrics/summary?start=2026-01-01&end=2026-01-31
 * Returns single total for the date range
 */
router.get('/metrics/summary', async (req, res) => {
  try {
    const start = req.query.start as string;
    const end = req.query.end as string;

    if (!start || !end) {
      res.status(400).json({ error: 'start and end query params required (YYYY-MM-DD)' });
      return;
    }

    const result = await getCollectedRevenue({ start, end });

    res.json({
      start,
      end,
      totalCents: result.totalCents,
      currency: 'usd',
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/task2/metrics/breakdown?start=2026-01-01&end=2026-01-31&granularity=day
 * Returns breakdown by day or week
 */
router.get('/metrics/breakdown', async (req, res) => {
  try {
    const start = req.query.start as string;
    const end = req.query.end as string;
    const granularity = (req.query.granularity as string) || 'day';

    if (!start || !end) {
      res.status(400).json({ error: 'start and end query params required (YYYY-MM-DD)' });
      return;
    }

    if (granularity !== 'day' && granularity !== 'week') {
      res.status(400).json({ error: 'granularity must be "day" or "week"' });
      return;
    }

    const result = await getCollectedRevenue({ start, end }, granularity);

    res.json({
      start,
      end,
      granularity,
      buckets: result.buckets || [],
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
