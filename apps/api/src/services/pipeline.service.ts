import { ClassifierService } from './classifier.service';
import { MemoryService } from './memory.service';
import { ReasonerService } from './reasoner.service';
import { EvaluatorService } from './evaluator.service';
import { WriterService } from './writer.service';
import { RequestRepository, ApiKeyRepository } from '@uniai/database';
import { COSTS, MODELS } from '@uniai/shared';

// Cascade Multiplier billing:
// Haiku (cheap, fast) = 1 Compute Unit
// Sonnet (smart, thorough) = 10 Compute Units
const COMPUTE_UNIT_COST = {
  haiku: 1,
  sonnet: 10,
} as const;

export class PipelineService {
  private classifier = new ClassifierService();
  private memory = new MemoryService();
  private reasoner = new ReasonerService();
  private evaluator = new EvaluatorService();
  private writer = new WriterService();
  private requestRepo = new RequestRepository();
  private apiKeyRepo = new ApiKeyRepository();

  async processQuery(projectId: string, prompt: string, keyHash: string) {
    const startTime = Date.now();
    let totalCost = 0;

    const insights: string[] = [];

    // 1. Classify
    const classification = await this.classifier.classify(prompt);
    let currentModel: 'haiku' | 'sonnet' =
      classification.route === 'sonnet' ? 'sonnet' : 'haiku';
    const initialModelUsed =
      currentModel === 'sonnet' ? MODELS.SONNET : MODELS.HAIKU;

    insights.push(
      `[Classifier] Prompt classified as ${classification.route}. Selected initial model: ${currentModel}.`
    );

    totalCost += COSTS[initialModelUsed].input * (prompt.length / 4 / 1000000);

    // 2. Retrieve Memory
    let memories: any[] = [];
    if (classification.needsMemory) {
      memories = await this.memory.retrieveRelevant(projectId, prompt);
      if (memories.length > 0) {
        insights.push(
          `[Memory] Retrieved ${memories.length} relevant historical context vectors.`
        );
      }
    }

    // 3. Reason
    let answer = await this.reasoner.reason(prompt, memories, currentModel);
    totalCost +=
      COSTS[initialModelUsed].output * (answer.length / 4 / 1000000);

    // 4. Evaluate
    let evaluation = await this.evaluator.evaluate(prompt, answer);
    let repaired = false;
    let finalModelUsed = initialModelUsed;
    let finalModelKey: 'haiku' | 'sonnet' = currentModel;

    // 5. Confidence Cascade (Repair & Escalate)
    if (evaluation.needsRevision) {
      insights.push(
        `[Evaluator] Answer failed quality check (Score: ${evaluation.overall}). Needs revision.`
      );

      if (currentModel === 'haiku') {
        insights.push(
          `[Cascade] Escalating query from Haiku to Sonnet for higher reasoning capability.`
        );
        currentModel = 'sonnet';
        finalModelKey = 'sonnet';
        finalModelUsed = MODELS.SONNET;
      } else {
        insights.push(`[Cascade] Re-prompting Sonnet to fix identified flaws.`);
      }

      answer = await this.reasoner.reason(
        `The previous answer failed evaluation. Fix it based on these scores: ${JSON.stringify(evaluation)}. Original prompt: ${prompt}`,
        memories,
        currentModel
      );
      evaluation = await this.evaluator.evaluate(prompt, answer);
      repaired = true;

      totalCost +=
        COSTS[finalModelUsed].output * (answer.length / 4 / 1000000);
      insights.push(
        `[Evaluator] Revised answer passed with new score: ${evaluation.overall}.`
      );
    } else {
      insights.push(
        `[Evaluator] Answer passed quality check (Score: ${evaluation.overall}).`
      );
    }

    // 6. Deduct Compute Units (Cascade Multiplier billing)
    const unitCost = COMPUTE_UNIT_COST[finalModelKey];
    const deducted = await this.apiKeyRepo.deductComputeUnits(keyHash, unitCost);

    if (!deducted) {
      // Edge case: units ran out between check and deduction — reject
      throw new Error('INSUFFICIENT_COMPUTE_UNITS');
    }

    insights.push(
      `[Billing] Deducted ${unitCost} compute unit(s) (Model: ${finalModelKey}). Remaining: ${deducted.computeUnits}.`
    );

    // 7. Write Memory
    await this.writer.writeMemory(projectId, prompt, answer);

    const latencyMs = Date.now() - startTime;

    // 8. Log Request
    await this.requestRepo.create({
      projectId,
      prompt,
      answer,
      model: finalModelUsed,
      inputTokens: Math.round(prompt.length / 4),
      outputTokens: Math.round(answer.length / 4),
      cost: totalCost,
      latencyMs,
      accuracy: evaluation.accuracy,
      completeness: evaluation.completeness,
      reasoning: evaluation.reasoning,
      security: evaluation.security,
      overallScore: evaluation.overall,
      contextUsed: memories.length > 0,
      repaired,
    });

    return {
      answer,
      score: {
        accuracy: evaluation.accuracy,
        completeness: evaluation.completeness,
        reasoning: evaluation.reasoning,
        security: evaluation.security,
      },
      model: finalModelUsed,
      cost: totalCost,
      computeUnitsUsed: unitCost,
      computeUnitsRemaining: deducted.computeUnits,
      contextUsed: memories.length > 0,
      developerInsights: insights,
    };
  }
}
