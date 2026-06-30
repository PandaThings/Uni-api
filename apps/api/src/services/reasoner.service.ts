import { b, ClientRegistry } from '@uniai/baml';

export class ReasonerService {
  async reason(prompt: string, memories: any[], modelName: 'haiku' | 'sonnet' = 'sonnet'): Promise<string> {
    const bamlMemories = memories.map(m => ({
      summary: m.summary,
      category: m.category,
      embeddingText: m.embeddingText,
    }));

    // Override BAML client dynamically using ClientRegistry
    const clientRegistry = new ClientRegistry();
    const clientName = modelName === 'sonnet' ? 'ClaudeSonnet' : 'ClaudeHaiku';
    clientRegistry.setPrimary(clientName);

    return await b.Reason(prompt, bamlMemories, { clientRegistry });
  }
}
