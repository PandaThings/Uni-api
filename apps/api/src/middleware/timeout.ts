import { Context, Next } from 'hono';

// Configurable via REQUEST_TIMEOUT_MS env var — default 120s for complex LLM cascade pipelines
const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '120000', 10);

/**
 * Creates a Request Timeout Middleware with a specific timeout in milliseconds.
 */
export function createTimeout(timeoutMs: number) {
  return async (c: Context, next: Next) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('REQUEST_TIMEOUT'));
      }, timeoutMs);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } catch (err: any) {
      if (err.message === 'REQUEST_TIMEOUT') {
        return c.json(
          {
            error: 'Request Timeout',
            message: `The request exceeded the ${timeoutMs / 1000}s time limit.`,
            timeoutMs: timeoutMs,
          },
          408
        );
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };
}

/**
 * Default Request Timeout Middleware (uses DEFAULT_TIMEOUT_MS)
 */
export const timeoutMiddleware = createTimeout(DEFAULT_TIMEOUT_MS);
