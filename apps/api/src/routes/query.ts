import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { PipelineService } from '../services/pipeline.service';
import { ApiKeyRepository } from '@uniai/database';

const queryRoute = new Hono();
const pipelineService = new PipelineService();
const apiKeyRepo = new ApiKeyRepository();

const QuerySchema = z.object({
  prompt: z.string().min(1),
});

queryRoute.use('/', authMiddleware);

queryRoute.post('/', async (c) => {
  try {
    const projectId = (c as any).get('projectId') as string;
    const keyHash = (c as any).get('keyHash') as string;

    // Pre-flight compute unit check before we even call the LLM
    const remainingUnits = await apiKeyRepo.getComputeUnits(keyHash);

    if (remainingUnits === null) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // 1 unit minimum needed — if they have 0, reject immediately
    if (remainingUnits < 1) {
      return c.json(
        {
          error: 'Insufficient Compute Units',
          message:
            'Your API key has run out of compute units. Please top up to continue using Uni AI.',
          computeUnitsRemaining: 0,
        },
        402
      );
    }

    const body = await c.req.json();
    const result = QuerySchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    const response = await pipelineService.processQuery(
      projectId,
      result.data.prompt,
      keyHash
    );

    return c.json({
      answer: response.answer,
      score: response.score,
      model: response.model,
      cost: response.cost,
      computeUnitsUsed: response.computeUnitsUsed,
      computeUnitsRemaining: response.computeUnitsRemaining,
      contextUsed: response.contextUsed,
      developerInsights: response.developerInsights,
    });
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_COMPUTE_UNITS') {
      return c.json(
        {
          error: 'Insufficient Compute Units',
          message:
            'Your API key ran out of compute units during request processing.',
          computeUnitsRemaining: 0,
        },
        402
      );
    }
    console.error('Query Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default queryRoute;
