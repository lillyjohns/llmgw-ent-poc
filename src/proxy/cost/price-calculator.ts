import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../shared/logger';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

// Price per 1K tokens (input/output) — updated periodically
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

export class CostTracker {
  /**
   * Record token usage and update spend for a key.
   */
  async recordUsage(
    keyId: string,
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): Promise<void> {
    const price = PRICE_TABLE[model] || { input: 0.01, output: 0.03 };
    const cost =
      (usage.prompt_tokens / 1000) * price.input +
      (usage.completion_tokens / 1000) * price.output;

    const today = new Date().toISOString().split('T')[0];

    try {
      // Update key's total spend
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyId}`, SK: 'META' },
        UpdateExpression: 'ADD spend :cost',
        ExpressionAttributeValues: { ':cost': cost },
      }));

      // Update daily spend record
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyId}`, SK: `SPEND#${today}` },
        UpdateExpression: 'ADD total_cost :cost, total_tokens :tokens SET #model = if_not_exists(#model, :zero) + :cost',
        ExpressionAttributeNames: { '#model': `model_${model.replace(/-/g, '_')}` },
        ExpressionAttributeValues: {
          ':cost': cost,
          ':tokens': usage.total_tokens,
          ':zero': 0,
        },
      }));

      logger.debug({ keyId, model, cost, tokens: usage.total_tokens }, 'Usage recorded');
    } catch (err) {
      logger.error({ err, keyId }, 'Failed to record usage');
      // Don't throw — cost tracking failure shouldn't block the request
    }
  }
}
