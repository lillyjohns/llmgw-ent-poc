import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../shared/logger';
import type { KeyInfo } from '../../shared/types';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

export class KeyValidator {
  /**
   * Validate a virtual key and return its metadata.
   * Returns null if key is invalid, expired, or blocked.
   */
  async validate(apiKey: string): Promise<KeyInfo | null> {
    try {
      // Hash the key for lookup (store hashed, compare hashed)
      const keyHash = this.hashKey(apiKey);

      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `KEY#${keyHash}`,
          SK: 'META',
        },
      }));

      if (!result.Item) {
        return null;
      }

      const item = result.Item;

      // Check if blocked
      if (item.blocked) {
        logger.warn({ key_id: item.key_id }, 'Blocked key used');
        return null;
      }

      // Check if expired
      if (item.expires && new Date(item.expires) < new Date()) {
        logger.warn({ key_id: item.key_id }, 'Expired key used');
        return null;
      }

      return {
        key_id: item.key_id,
        team_id: item.team_id,
        org_id: item.org_id,
        models: item.models || [],
        max_budget: item.max_budget,
        spend: item.spend || 0,
        rpm_limit: item.rpm_limit,
        tpm_limit: item.tpm_limit,
        metadata: item.metadata || {},
      };
    } catch (err) {
      logger.error({ err }, 'Key validation failed');
      return null;
    }
  }

  private hashKey(key: string): string {
    // In production: use crypto.createHash('sha256').update(key).digest('hex')
    // For POC: simple hash
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
  }
}
