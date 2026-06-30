import { b } from '@uniai/baml';
import { EvaluationResult } from '@uniai/shared';

export class EvaluatorService {
  async evaluate(prompt: string, response: string): Promise<EvaluationResult> {
    const result = await b.Evaluate(prompt, response);
    return {
      accuracy: result.accuracy,
      completeness: result.completeness,
      reasoning: result.reasoning,
      security: result.security,
      overall: result.overall,
      needsRevision: result.needsRevision,
    };
  }
}
