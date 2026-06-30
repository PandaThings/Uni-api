import { MemoryRepository } from '@uniai/database';
import { generateEmbedding } from '../lib/embeddings';

export class MemoryService {
  private repo = new MemoryRepository();

  async retrieveRelevant(projectId: string, prompt: string, limit = 5) {
    const embedding = await generateEmbedding(prompt);
    return this.repo.findSimilar(projectId, embedding, limit);
  }
}
