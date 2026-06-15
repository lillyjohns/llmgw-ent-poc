import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleAdminRoute } from './proxy/admin/admin-routes';

const { loadConfig } = require('./shared/config');
const { Router } = require('./proxy/router');
const { KeyValidator } = require('./proxy/auth/key-validator');
const { DynamoKeyValidator } = require('./proxy/auth/dynamo-key-validator');
const { CostTracker } = require('./proxy/cost/price-calculator');

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath;
  const method = event.requestContext.http.method;
  const headers = event.headers || {};
  let body: any = {};
  if (event.body) {
    try { body = JSON.parse(event.body); } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: { message: 'Invalid JSON in request body', type: 'invalid_request', code: '400' } }) };
    }
  }
  const useDynamo = process.env.USE_DYNAMODB === 'true';

  // CORS: handle OPTIONS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type,x-requested-with', 'Access-Control-Max-Age': '86400' }, body: '' };
  }

  // Health check
  if (path === '/health') {
    return { statusCode: 200, body: JSON.stringify({ status: 'healthy', version: '0.2.0', runtime: 'lambda', dynamodb: useDynamo }) };
  }

  // Gateway info
  if (path === '/gateway/info') {
    const config = await loadConfig();
    const models = [...new Set(config.model_list.map((m: any) => m.model_name))];
    return { statusCode: 200, body: JSON.stringify({ name: 'llmgw-ent-poc', version: '0.2.0', models_available: models, runtime: 'lambda', features: { dynamodb_budget: useDynamo, openrouter_fallback: true, admin_api: true } }) };
  }

  // Admin Routes (/admin/*)
  if (path.startsWith('/admin/')) {
    const masterKey = process.env.MASTER_KEY || 'sk-llmgw-master';
    const authHeader = headers.authorization || headers.Authorization || '';
    const providedKey = (authHeader as string).replace('Bearer ', '');
    if (providedKey !== masterKey) {
      return { statusCode: 403, body: JSON.stringify({ error: { message: 'Forbidden: master key required for admin endpoints', type: 'auth_error' } }) };
    }
    const queryString = event.rawQueryString || '';
    const queryParams: Record<string, string> = {};
    queryString.split('&').forEach((p: string) => { const [k, v] = p.split('='); if (k) queryParams[k] = decodeURIComponent(v || ''); });
    const adminResponse = await handleAdminRoute(method, path, body, queryParams);
    return { statusCode: adminResponse.statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: adminResponse.body };
  }

  // Chat completions
  if (path === '/v1/chat/completions' && method === 'POST') {
    // Auth
    const authHeader = headers.authorization || headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Missing Authorization header', type: 'auth_error' } }) };
    }
    const apiKey = authHeader.slice(7);

    // Use DynamoDB validator if enabled, otherwise in-memory
    let keyInfo;
    const dynamoValidator = useDynamo ? new DynamoKeyValidator() : null;

    if (dynamoValidator) {
      keyInfo = await dynamoValidator.validate(apiKey);
    } else {
      const keyValidator = new KeyValidator();
      keyInfo = await keyValidator.validate(apiKey);
    }

    if (!keyInfo) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Invalid API key', type: 'auth_error' } }) };
    }

    const { model, messages, temperature, max_tokens, top_p } = body;

    // Model ACL
    if (keyInfo.models.length > 0 && !keyInfo.models.includes(model)) {
      return { statusCode: 403, body: JSON.stringify({ error: { message: `Model '${model}' not allowed. Allowed: ${keyInfo.models.join(', ')}`, type: 'permission_error' } }) };
    }

    // Budget check (DynamoDB = pre-request estimation, in-memory = post-check)
    if (dynamoValidator) {
      const estimatedCost = 0.001; // baseline estimate per request
      const budgetCheck = await dynamoValidator.checkBudgetPreRequest(apiKey, estimatedCost);
      if (!budgetCheck.allowed) {
        return {
          statusCode: 429,
          body: JSON.stringify({
            error: {
              message: `Budget exceeded (pre-request). Limit: $${budgetCheck.maxBudget}, Remaining: $${budgetCheck.remaining.toFixed(6)}. Request REJECTED before calling model (saved money).`,
              type: 'budget_exceeded',
              pre_request: true,
              remaining: budgetCheck.remaining,
              max_budget: budgetCheck.maxBudget,
            }
          })
        };
      }
    } else if (keyInfo.max_budget && keyInfo.spend >= keyInfo.max_budget) {
      return { statusCode: 429, body: JSON.stringify({ error: { message: `Budget exceeded. Limit: $${keyInfo.max_budget}`, type: 'budget_exceeded' } }) };
    }

    // Route
    const router = new Router();
    const deployment = await router.pickDeployment(model);
    if (!deployment) {
      return { statusCode: 503, body: JSON.stringify({ error: { message: `No deployment for '${model}'`, type: 'routing_error' } }) };
    }

    try {
      const startTime = Date.now();
      const response = await deployment.provider.complete({ model: deployment.providerModel, messages, temperature, max_tokens, top_p, metadata: { key_id: keyInfo.key_id, team_id: keyInfo.team_id || 'default', key_name: keyInfo.key_alias || keyInfo.key_id } });
      const latencyMs = Date.now() - startTime;

      // Track cost
      const costTracker = new CostTracker();
      const cost = costTracker.calculateCost(model, response.usage);
      await costTracker.recordUsage(keyInfo.key_id, model, response.usage);

      // Persist spend to DynamoDB
      if (dynamoValidator && cost > 0) {
        await dynamoValidator.incrementSpend(apiKey, cost);
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Model-Used': deployment.providerModel,
          'X-Latency-Ms': String(latencyMs),
          'X-Provider': 'bedrock',
          'X-Fallback': 'false',
        },
        body: JSON.stringify(response),
      };
    } catch (err: any) {
      console.error('Primary provider failed:', err.message);

      // Try fallback (OpenRouter or other providers)
      try {
        const fallback = await router.getFallback(model);
        if (fallback) {
          console.log(`Attempting fallback: ${model} -> ${fallback.id}`);
          const startTime = Date.now();
          const response = await fallback.provider.complete({ model: fallback.providerModel, messages, temperature, max_tokens, top_p, metadata: { key_id: keyInfo.key_id, team_id: keyInfo.team_id || 'default', key_name: keyInfo.key_alias || keyInfo.key_id } });
          const latencyMs = Date.now() - startTime;

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Model-Used': fallback.providerModel,
              'X-Latency-Ms': String(latencyMs),
              'X-Provider': fallback.id.split('/')[0],
              'X-Fallback': 'true',
              'X-Primary-Error': err.message.substring(0, 100),
            },
            body: JSON.stringify(response),
          };
        }
      } catch (fallbackErr: any) {
        console.error('Fallback also failed:', fallbackErr.message);
      }

      return { statusCode: 502, body: JSON.stringify({ error: { message: `All providers failed. Primary: ${err.message}`, type: 'provider_error' } }) };
    }
  }

  return { statusCode: 404, body: JSON.stringify({ error: { message: 'Not found' } }) };
}
