import { logger } from '../../shared/logger';
import { KeyValidator } from '../auth/key-validator';

// Price per 1M tokens (input/output) — Bedrock pricing
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'claude-sonnet': { input: 3.0, output: 15.0 },
  'claude-haiku': { input: 0.80, output: 4.0 },
  'deepseek': { input: 0.27, output: 1.10 },
  'mistral-large': { input: 2.0, output: 6.0 },
  'nova-pro': { input: 0.80, output: 3.20 },
  'best-available': { input: 3.0, output: 15.0 }, // assume Claude pricing
};

export class CostTracker {
  /**
   * Calculate cost for given usage without recording.
   */
  calculateCost(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): number {
    const price = PRICE_TABLE[model] || { input: 3.0, output: 15.0 };
    return (
      (usage.prompt_tokens / 1_000_000) * price.input +
      (usage.completion_tokens / 1_000_000) * price.output
    );
  }

  /**
   * Record token usage and update spend for a key.
   */
  async recordUsage(
    keyId: string,
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): Promise<number> {
    const price = PRICE_TABLE[model] || { input: 3.0, output: 15.0 };
    const cost =
      (usage.prompt_tokens / 1_000_000) * price.input +
      (usage.completion_tokens / 1_000_000) * price.output;

    // Update in-memory spend
    KeyValidator.updateSpend(keyId, cost);

    logger.info({
      key_id: keyId,
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      cost_usd: cost.toFixed(6),
    }, 'Cost tracked');

    return cost;
  }
}
