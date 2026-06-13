import { logger } from '../../shared/logger';
import type { KeyInfo } from '../../shared/types';
import * as crypto from 'crypto';

// In-memory key store for local/demo mode
// In production: DynamoDB + DAX
const LOCAL_KEYS: Map<string, KeyInfo> = new Map();

// Pre-seed demo keys
const DEMO_KEYS: Record<string, KeyInfo> = {
  'sk-llmgw-demo-all-models': {
    key_id: 'key_demo_all',
    team_id: 'team-engineering',
    org_id: 'org-acme',
    models: [], // empty = all models allowed
    max_budget: 100.00,
    spend: 0,
    rpm_limit: 60,
    tpm_limit: 200000,
    metadata: { name: 'Engineering - All Models', tier: 'premium' },
  },
  'sk-llmgw-demo-budget-low': {
    key_id: 'key_demo_budget',
    team_id: 'team-marketing',
    org_id: 'org-acme',
    models: ['claude-haiku', 'nova-pro'], // restricted models
    max_budget: 0.01, // very low budget for demo
    spend: 0.009, // almost exhausted
    rpm_limit: 30,
    tpm_limit: 50000,
    metadata: { name: 'Marketing - Budget Limited', tier: 'basic' },
  },
  'sk-llmgw-demo-restricted': {
    key_id: 'key_demo_restricted',
    team_id: 'team-intern',
    org_id: 'org-acme',
    models: ['claude-haiku'], // only cheap model
    max_budget: 5.00,
    spend: 0,
    rpm_limit: 10,
    tpm_limit: 20000,
    metadata: { name: 'Intern - Haiku Only', tier: 'free' },
  },
};

// Load demo keys
Object.entries(DEMO_KEYS).forEach(([key, info]) => {
  LOCAL_KEYS.set(key, info);
});

export class KeyValidator {
  async validate(apiKey: string): Promise<KeyInfo | null> {
    // Check local/demo keys first
    const localKey = LOCAL_KEYS.get(apiKey);
    if (localKey) {
      return { ...localKey }; // return copy
    }

    // Master key bypass (for admin operations)
    if (apiKey === process.env.MASTER_KEY || apiKey === 'sk-llmgw-master') {
      return {
        key_id: 'master',
        models: [],
        max_budget: undefined,
        spend: 0,
        metadata: { role: 'admin' },
      };
    }

    // TODO: DynamoDB lookup for production keys
    return null;
  }

  static generateKey(prefix: string = 'sk-llmgw'): string {
    const random = crypto.randomBytes(16).toString('base64url');
    return `${prefix}-${random}`;
  }

  static registerKey(apiKey: string, info: KeyInfo): void {
    LOCAL_KEYS.set(apiKey, info);
  }

  static getKeyInfo(apiKey: string): KeyInfo | null {
    return LOCAL_KEYS.get(apiKey) || null;
  }

  static listKeys(): Array<{ key: string; info: KeyInfo }> {
    return Array.from(LOCAL_KEYS.entries()).map(([key, info]) => ({
      key: key.slice(0, 12) + '...' + key.slice(-4), // mask middle
      info,
    }));
  }

  static updateSpend(keyId: string, amount: number): void {
    for (const [, info] of LOCAL_KEYS) {
      if (info.key_id === keyId) {
        info.spend += amount;
        break;
      }
    }
  }
}
