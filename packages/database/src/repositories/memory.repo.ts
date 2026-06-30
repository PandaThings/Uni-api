import { prisma } from '../client';
import { Memory } from '@prisma/client';

export class MemoryRepository {
  async create(data: {
    projectId: string;
    summary: string;
    embeddingText: string;
    embedding: number[];
    category: string;
  }): Promise<void> {
    // We use raw query for pgvector insert
    const embeddingStr = `[${data.embedding.join(',')}]`;
    
    await prisma.$executeRaw`
      INSERT INTO "memories" ("id", "projectId", "summary", "embeddingText", "embedding", "category", "createdAt")
      VALUES (gen_random_uuid(), ${data.projectId}::uuid, ${data.summary}, ${data.embeddingText}, ${embeddingStr}::vector, ${data.category}, now())
    `;
  }

  async findSimilar(projectId: string, queryEmbedding: number[], limit: number = 5): Promise<any[]> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Use cosine similarity (<=>) for pgvector
    const results = await prisma.$queryRaw`
      SELECT id, summary, "embeddingText", category, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM memories
      WHERE "projectId" = ${projectId}::uuid
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
    
    return results as any[];
  }
}
