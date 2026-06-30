export interface UniAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface QueryResult {
  answer: string;
  score: {
    accuracy: number;
    completeness: number;
    reasoning: number;
    security: number;
  };
  model: string;
  cost: number;
  contextUsed: boolean;
}

export type QueryCategory = "backend" | "frontend" | "architecture" | "devops" | "coding";
export type QueryComplexity = "low" | "medium" | "high";
export type ModelRoute = "haiku" | "sonnet";

export interface ClassificationResult {
  complexity: QueryComplexity;
  category: QueryCategory;
  needsMemory: boolean;
  route: ModelRoute;
}

export interface EvaluationResult {
  accuracy: number;
  completeness: number;
  reasoning: number;
  security: number;
  overall: number;
  needsRevision: boolean;
}

export interface MemoryEntry {
  summary: string;
  category: string;
  embeddingText: string;
}
