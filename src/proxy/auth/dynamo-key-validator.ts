import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../shared/logger';
import type { KeyInfo } from '../../shared/types';
import * as crypto from 'crypto';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

/**
 * DynamoDB-backed key validator with persistent spend tracking.
 * Keys are stored in DDB with atomic spend updates via UpdateItem ADD.
 */
export class DynamoKeyValidator {

  /**
   * Validate a key and return its info from DynamoDB.
   * Falls back to in-memory demo keys if DDB lookup fails.
   */
  async validate(apiKey: string): Promise<KeyInfo | null> {
    // Master key bypass
    if (apiKey === process.env.MASTER_KEY || apiKey === 'sk-llmgw-master') {
      return {
        key_id: 'master',
        models: [],
        max_budget: undefined,
        spend: 0,
        metadata: { role: 'admin' },
      };
    }

    const keyHash = this.hashKey(apiKey);

    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
      }));

      if (result.Item) {
        return {
          key_id: result.Item.key_id,
          team_id: result.Item.team_id,
          org_id: result.Item.org_id,
          models: result.Item.models || [],
          max_budget: result.Item.max_budget,
          spend: result.Item.spend || 0,
          rpm_limit: result.Item.rpm_limit,
          tpm_limit: result.Item.tpm_limit,
          metadata: result.Item.metadata || {},
        };
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'DynamoDB lookup failed, trying local keys');
    }

    // Fallback to demo keys for local dev
    return this.getLocalKey(apiKey);
  }

  /**
   * Atomically increment spend for a key in DynamoDB.
   * Uses UpdateItem with ADD — safe for concurrent Lambda invocations.
   */
  async incrementSpend(apiKey: string, amount: number): Promise<{ newSpend: number; budgetExceeded: boolean; maxBudget?: number }> {
    const keyHash = this.hashKey(apiKey);

    try {
      const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
        UpdateExpression: 'ADD spend :amount SET last_used = :now',
        ExpressionAttributeValues: {
          ':amount': amount,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }));

      const newSpend = result.Attributes?.spend || 0;
      const maxBudget = result.Attributes?.max_budget;
      const budgetExceeded = maxBudget !== undefined && newSpend >= maxBudget;

      return { newSpend, budgetExceeded, maxBudget };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to increment spend in DynamoDB');
      return { newSpend: 0, budgetExceeded: false };
    }
  }

  /**
   * Pre-request budget check: estimate cost and reject if would exceed budget.
   * This prevents overspend BEFORE calling the model.
   */
  async checkBudgetPreRequest(apiKey: string, estimatedCost: number): Promise<{ allowed: boolean; remaining: number; maxBudget?: number }> {
    const keyHash = this.hashKey(apiKey);

    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
      }));

      if (!result.Item || !result.Item.max_budget) {
        return { allowed: true, remaining: Infinity };
      }

      const currentSpend = result.Item.spend || 0;
      const maxBudget = result.Item.max_budget;
      const remaining = maxBudget - currentSpend;
      const allowed = (currentSpend + estimatedCost) <= maxBudget;

      return { allowed, remaining, maxBudget };
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Budget pre-check failed, allowing request');
      return { allowed: true, remaining: Infinity };
    }
  }

  /**
   * Seed a key into DynamoDB for testing.
   */
  async seedKey(apiKey: string, info: KeyInfo): Promise<void> {
    const keyHash = this.hashKey(apiKey);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `KEY#${keyHash}`,
        SK: 'META',
        key_hash: keyHash,
        key_id: info.key_id,
        team_id: info.team_id,
        org_id: info.org_id,
        models: info.models || [],
        max_budget: info.max_budget,
        spend: info.spend || 0,
        rpm_limit: info.rpm_limit,
        tpm_limit: info.tpm_limit,
        metadata: info.metadata || {},
        created_at: new Date().toISOString(),
      },
    }));
  }

  private hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  // Local demo keys for development
  private getLocalKey(apiKey: string): KeyInfo | null {
    const DEMO_KEYS: Record<string, KeyInfo> = {
      'sk-llmgw-demo-all-models': {
        key_id: 'key_demo_all',
        team_id: 'team-engineering',
        org_id: 'org-acme',
        models: [],
        max_budget: 100.00,
        spend: 0,
        rpm_limit: 60,
        tpm_limit: 200000,
        metadata: { name: 'Engineering - All Models', tier: 'premium' },
      },
      'sk-llmgw-demo-restricted': {
        key_id: 'key_demo_restricted',
        team_id: 'team-intern',
        org_id: 'org-acme',
        models: ['claude-haiku'],
        max_budget: 5.00,
        spend: 0,
        rpm_limit: 10,
        tpm_limit: 20000,
        metadata: { name: 'Intern - Haiku Only', tier: 'free' },
      },
    };
    return DEMO_KEYS[apiKey] || null;
  }
}
