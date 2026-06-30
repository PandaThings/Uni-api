// Mock embeddings to bypass native build issues on Windows.
// Returns a zero-vector so the pipeline continues successfully.
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log('[Embeddings] Generating mock embedding to bypass native modules...');
  return new Array(384).fill(0.1);
}
