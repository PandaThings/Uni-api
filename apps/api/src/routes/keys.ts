import { Hono } from 'hono';
import { z } from 'zod';
import { ApiKeyRepository } from '@uniai/database';

const keysRoute = new Hono();
const apiKeyRepo = new ApiKeyRepository();

const CreateKeySchema = z.object({
  projectId: z.string().uuid()
});

keysRoute.post('/', async (c) => {
  const body = await c.req.json();
  const result = CreateKeySchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { key, apiKey } = await apiKeyRepo.create(result.data.projectId);
  
  return c.json({
    id: apiKey.id,
    key, // Only returned once!
    prefix: apiKey.prefix
  });
});

export default keysRoute;
