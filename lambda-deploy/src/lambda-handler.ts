import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Minimal Lambda handler that wraps our Fastify app
// For POC: deploy as a single Lambda with Function URL

const { loadConfig } = require('./shared/config');
const { Router } = require('./proxy/router');
const { KeyValidator } = require('./proxy/auth/key-validator');
const { CostTracker } = require('./proxy/cost/price-calculator');

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath;
  const method = event.requestContext.http.method;
  const headers = event.headers || {};
  const body = event.body ? JSON.parse(event.body) : {};

  // Health check
  if (path === '/health') {
    return { statusCode: 200, body: JSON.stringify({ status: 'healthy', version: '0.1.0', runtime: 'lambda' }) };
  }

  // Gateway info
  if (path === '/gateway/info') {
    const config = await loadConfig();
    const models = [...new Set(config.model_list.map((m: any) => m.model_name))];
    return { statusCode: 200, body: JSON.stringify({ name: 'llmgw-ent-poc', version: '0.1.0', models_available: models, runtime: 'lambda' }) };
  }

  // Chat completions
  if (path === '/v1/chat/completions' && method === 'POST') {
    // Auth
    const authHeader = headers.authorization || headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Missing Authorization header', type: 'auth_error' } }) };
    }
    const apiKey = authHeader.slice(7);
    const keyValidator = new KeyValidator();
    const keyInfo = await keyValidator.validate(apiKey);
    if (!keyInfo) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Invalid API key', type: 'auth_error' } }) };
    }

    const { model, messages, temperature, max_tokens, top_p } = body;

    // Model ACL
    if (keyInfo.models.length > 0 && !keyInfo.models.includes(model)) {
      return { statusCode: 403, body: JSON.stringify({ error: { message: `Model '${model}' not allowed. Allowed: ${keyInfo.models.join(', ')}`, type: 'permission_error' } }) };
    }

    // Budget check
    if (keyInfo.max_budget && keyInfo.spend >= keyInfo.max_budget) {
      return { statusCode: 429, body: JSON.stringify({ error: { message: `Budget exceeded. Limit: $${keyInfo.max_budget}`, type: 'budget_exceeded' } }) };
    }

    // Route
    const router = new Router();
    const deployment = await router.pickDeployment(model);
    if (!deployment) {
      return { statusCode: 503, body: JSON.stringify({ error: { message: `No deployment for '${model}'`, type: 'routing_error' } }) };
    }

    try {
      const response = await deployment.provider.complete({ model: deployment.providerModel, messages, temperature, max_tokens, top_p });
      
      // Track cost
      const costTracker = new CostTracker();
      await costTracker.recordUsage(keyInfo.key_id, model, response.usage);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'X-Model-Used': deployment.providerModel },
        body: JSON.stringify(response),
      };
    } catch (err: any) {
      return { statusCode: 502, body: JSON.stringify({ error: { message: err.message, type: 'provider_error' } }) };
    }
  }

  return { statusCode: 404, body: JSON.stringify({ error: { message: 'Not found' } }) };
}
