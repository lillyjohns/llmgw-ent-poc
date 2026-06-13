import { FastifyInstance } from 'fastify';
import { KeyValidator } from '../auth/key-validator';
import { logger } from '../../shared/logger';

export async function keyManagementRoute(app: FastifyInstance) {
  // Generate a new key
  app.post('/key/generate', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.includes('sk-llmgw-master') && !authHeader?.includes('sk-llmgw-demo-all')) {
      return reply.code(403).send({ error: { message: 'Admin key required', type: 'auth_error' } });
    }

    const body = request.body as any || {};
    const newKey = KeyValidator.generateKey();
    const keyInfo = {
      key_id: `key_${Date.now().toString(36)}`,
      team_id: body.team_id || 'default',
      org_id: body.org_id || 'default',
      models: body.models || [],
      max_budget: body.max_budget || 50.0,
      spend: 0,
      rpm_limit: body.rpm_limit || 60,
      tpm_limit: body.tpm_limit || 100000,
      metadata: body.metadata || {},
    };

    KeyValidator.registerKey(newKey, keyInfo);
    logger.info({ key_id: keyInfo.key_id, team_id: keyInfo.team_id }, 'Key generated');

    return reply.code(201).send({
      key: newKey,
      key_id: keyInfo.key_id,
      models: keyInfo.models,
      max_budget: keyInfo.max_budget,
      team_id: keyInfo.team_id,
      rpm_limit: keyInfo.rpm_limit,
      tpm_limit: keyInfo.tpm_limit,
    });
  });

  // Get key info
  app.get('/key/info', async (request, reply) => {
    const query = request.query as any;
    const key = query.key;

    if (!key) {
      return reply.code(400).send({ error: { message: 'Missing ?key= parameter' } });
    }

    const info = KeyValidator.getKeyInfo(key);
    if (!info) {
      return reply.code(404).send({ error: { message: 'Key not found' } });
    }

    return reply.send({
      key_id: info.key_id,
      team_id: info.team_id,
      org_id: info.org_id,
      models: info.models,
      max_budget: info.max_budget,
      spend: info.spend,
      rpm_limit: info.rpm_limit,
      tpm_limit: info.tpm_limit,
      metadata: info.metadata,
      budget_remaining: info.max_budget ? info.max_budget - info.spend : 'unlimited',
    });
  });

  // List all keys (admin)
  app.get('/key/list', async (request, reply) => {
    const keys = KeyValidator.listKeys();
    return reply.send({ keys, total: keys.length });
  });

  // Health / info about the gateway
  app.get('/gateway/info', async (request, reply) => {
    const { loadConfig } = require('../../shared/config');
    const config = await loadConfig();
    const modelNames = [...new Set(config.model_list.map((m: any) => m.model_name))] as string[];

    return reply.send({
      name: 'llmgw-ent-poc',
      version: '0.1.0',
      models_available: modelNames,
      features: [
        'multi-model-routing',
        'virtual-keys',
        'budget-enforcement',
        'streaming-sse',
        'weighted-load-balancing',
        'automatic-failover',
        'spend-tracking',
        'model-access-control',
      ],
      routing_strategy: config.router_settings?.routing_strategy || 'simple-shuffle',
    });
  });
}
