import { Context, Next } from 'hono';
import { ApiKeyRepository } from '@uniai/database';
import crypto from 'crypto';

const apiKeyRepo = new ApiKeyRepository();

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const rawKey = authHeader.split(' ')[1];
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await apiKeyRepo.findByHash(keyHash);

  if (!apiKey || apiKey.revokedAt) {
    return c.json({ error: 'Invalid or revoked API key' }, 401);
  }

  (c as any).set('projectId', apiKey.projectId);
  (c as any).set('keyHash', keyHash);
  await next();
};
