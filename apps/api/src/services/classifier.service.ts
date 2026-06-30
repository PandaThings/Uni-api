import { b } from '@uniai/baml';
import { ClassificationResult } from '@uniai/shared';

export class ClassifierService {
  async classify(prompt: string): Promise<ClassificationResult> {
    const result = await b.ClassifyQuery(prompt);
    return {
      complexity: result.complexity as ClassificationResult['complexity'],
      category: result.category as ClassificationResult['category'],
      needsMemory: result.needsMemory,
      route: result.route as ClassificationResult['route'],
    };
  }
}
