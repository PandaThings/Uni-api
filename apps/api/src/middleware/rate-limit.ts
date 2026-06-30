import { Context, Next } from 'hono';
import Redis from 'ioredis';

// Singleton Redis client - reused across all requests
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redisClient.on('error', (err) => {
      // Log but do not crash - degrade gracefully if Redis is unavailable
      console.warn('[RateLimit] Redis connection error:', err.message);
    });
  }
  return redisClient;
}

/**
 * Redis Token Bucket Rate Limiter
 *
 * Service Window: 60 requests per minute per IP (or API key prefix if present)
 * Implemented as a sliding window counter using Redis INCR + EXPIRE.
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const WINDOW_SECONDS = 60;
  const MAX_REQUESTS = 60;

  // Prefer API key as the identity for rate limiting; fall back to IP
  const authHeader = c.req.header('Authorization') || '';
  const apiKeyPrefix = authHeader.startsWith('Bearer uni_')
    ? authHeader.substring(7, 19) // first 12 chars of the key
    : null;

  const ip =
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    'unknown';

  const identity = apiKeyPrefix ? `apikey:${apiKeyPrefix}` : `ip:${ip}`;
  const redisKey = `rate:${identity}`;

  try {
    const redis = getRedis();
    const current = await redis.incr(redisKey);

    if (current === 1) {
      // First request in this window - set the TTL
      await redis.expire(redisKey, WINDOW_SECONDS);
    }

    // Attach rate limit headers to every response
    c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
    c.header('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - current)));
    c.header('X-RateLimit-Reset', String(WINDOW_SECONDS));

    if (current > MAX_REQUESTS) {
      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per ${WINDOW_SECONDS}s window.`,
          retryAfter: WINDOW_SECONDS,
        },
        429
      );
    }
  } catch (err) {
    // If Redis is down, degrade gracefully and allow the request
    console.warn('[RateLimit] Skipping rate limit check - Redis unavailable');
  }

  await next();
}
