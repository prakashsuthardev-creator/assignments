import { Router, type Router as ExpressRouter } from 'express';
import { getHealthPayload } from './health.js';
import { runSync } from './sync.js';
import { syncStore } from './persistence.js';
import task2Router from './task2/routes.js';

const router: ExpressRouter = Router();

router.get('/health', async (_req, res) => {
  res.json(await getHealthPayload());
});

router.post('/sync', async (_req, res) => {
  const results = await runSync();
  res.json({ results });
});

router.get('/records', async (_req, res) => {
  const records = await syncStore.listRecords();
  res.json({ records });
});

router.use('/task2', task2Router);

export { router };