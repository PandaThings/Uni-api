import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// BAML snapshots process.env at module load time — reset it after dotenv runs
import { resetBamlEnvVars } from '@uniai/baml';
resetBamlEnvVars(process.env as Record<string, string>);

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

import queryRoute from './routes/query';
import projectsRoute from './routes/projects';
import keysRoute from './routes/keys';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { timeoutMiddleware, createTimeout } from './middleware/timeout';

const app = new Hono();

// Global middleware — order matters:
// 1. Logger (always first so every request is logged)
app.use('*', logger());

// 2. CORS (allow all origins; tighten in prod by specifying your dashboard domain)
app.use('*', cors());

// 3. Rate Limiter — Redis-backed sliding window (60 req/min per IP or API key)
app.use('*', rateLimitMiddleware);

// Health check — exempt from rate limiting and timeouts
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 4. Timeout — fast routes (projects, keys) get a 10s timeout
//    Query route gets a generous 5-minute limit for the full Confidence Cascade pipeline
app.use('/v1/projects/*', createTimeout(10_000));
app.use('/v1/keys/*', createTimeout(10_000));
app.use('/v1/query/*', createTimeout(300_000)); // 5 minutes max for LLM cascade

app.route('/v1/query', queryRoute);
app.route('/v1/projects', projectsRoute);
app.route('/v1/keys', keysRoute);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const key = process.env.ANTHROPIC_API_KEY;
console.log(`[DEBUG] ANTHROPIC_API_KEY = ${key ? key.substring(0, 20) + '...' : '❌ NOT SET'}`);
console.log(`[DEBUG] REDIS_URL = ${process.env.REDIS_URL || 'redis://localhost:6379 (default)'}`);
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
