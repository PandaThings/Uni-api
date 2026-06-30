import { b } from '@uniai/baml';
import { MemoryRepository } from '@uniai/database';
import { generateEmbedding } from '../lib/embeddings';

export class WriterService {
  private repo = new MemoryRepository();

  async writeMemory(projectId: string, prompt: string, response: string): Promise<void> {
    const memory = await b.WriteMemory(prompt, response);
    const embedding = await generateEmbedding(memory.embeddingText);
    
    await this.repo.create({
      projectId,
      summary: memory.summary,
      embeddingText: memory.embeddingText,
      embedding,
      category: memory.category,
    });
  }
}
