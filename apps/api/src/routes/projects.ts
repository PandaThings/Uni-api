import { Hono } from 'hono';
import { z } from 'zod';
import { ProjectRepository } from '@uniai/database';

const projectsRoute = new Hono();
const projectRepo = new ProjectRepository();

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  ownerId: z.string().min(1)
});

// Note: No auth middleware here for simplicity in Phase 1 setup
projectsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const result = CreateProjectSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const project = await projectRepo.create(result.data.name, result.data.ownerId);
  return c.json({ id: project.id, name: project.name });
});

export default projectsRoute;
