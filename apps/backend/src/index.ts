import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root first, then fall back to monorepo root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const app = express();

// CORS configuration - allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json());
app.use('/api', router);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🔄 Sync: http://localhost:${port}/api/sync`);
});
