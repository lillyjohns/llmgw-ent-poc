import { FastifyInstance } from 'fastify';
import { KeyValidator } from '../auth/key-validator';
import { DynamoKeyValidator } from '../auth/dynamo-key-validator';
import { Router } from '../router';
import { CostTracker } from '../cost/price-calculator';
import { logger } from '../../shared/logger';
import type { ChatCompletionRequest } from '../../shared/types';

export async function chatCompletionsRoute(app: FastifyInstance) {
  app.post('/chat/completions', async (request, reply) => {
    const startTime = Date.now();

    // 1. Authenticate
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: { message: 'Missing or invalid Authorization header', type: 'auth_error', code: '401' }
      });
    }

    const apiKey = authHeader.slice(7);
    const keyValidator = new KeyValidator();
    const keyInfo = await keyValidator.validate(apiKey);

    if (!keyInfo) {
      return reply.code(401).send({
        error: { message: 'Invalid API key', type: 'auth_error', code: '401' }
      });
    }

    // 2. Parse request
    const body = request.body as ChatCompletionRequest;
    const { model, messages, stream = false, ...params } = body;

    if (!model || !messages) {
      return reply.code(400).send({
        error: { message: 'Missing required fields: model, messages', type: 'invalid_request', code: '400' }
      });
    }

    // 3. Check model access
    if (keyInfo.models.length > 0 && !keyInfo.models.includes(model)) {
      return reply.code(403).send({
        error: { message: `Model '${model}' not allowed for this key. Allowed: ${keyInfo.models.join(', ')}`, type: 'permission_error', code: '403' }
      });
    }

    // 4. Check budget (DynamoDB-backed for persistent tracking)
    const useDynamo = process.env.USE_DYNAMODB === 'true';
    const dynamoValidator = useDynamo ? new DynamoKeyValidator() : null;

    if (useDynamo && dynamoValidator) {
      // Pre-request budget estimation (estimate ~$0.001 per request as baseline)
      const estimatedCost = 0.001;
      const budgetCheck = await dynamoValidator.checkBudgetPreRequest(apiKey, estimatedCost);
      if (!budgetCheck.allowed) {
        return reply.code(429).send({
          error: {
            message: `Budget exceeded. Limit: $${budgetCheck.maxBudget}, Remaining: $${budgetCheck.remaining.toFixed(4)}. Request rejected PRE-CALL (saved money).`,
            type: 'budget_exceeded',
            code: '429',
            pre_request: true,
          }
        });
      }
    } else if (keyInfo.max_budget && keyInfo.spend >= keyInfo.max_budget) {
      // Fallback to in-memory check
      return reply.code(429).send({
        error: { message: `Budget exceeded. Limit: $${keyInfo.max_budget}, Spent: $${keyInfo.spend.toFixed(4)}`, type: 'budget_exceeded', code: '429' }
      });
    }

    // 5. Route to provider
    const router = new Router();
    const deployment = await router.pickDeployment(model);

    if (!deployment) {
      return reply.code(503).send({
        error: { message: `No available deployment for model '${model}'`, type: 'routing_error', code: '503' }
      });
    }

    logger.info({ model, routed_to: deployment.id, key_id: keyInfo.key_id }, 'Request routed');

    try {
      if (stream) {
        // 6a. Streaming response
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Request-Id': request.id,
          'X-Model-Used': deployment.providerModel,
        });

        let totalTokens = 0;
        for await (const chunk of deployment.provider.stream({
          model: deployment.providerModel,
          messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          top_p: params.top_p,
        })) {
          reply.raw.write(chunk);
          totalTokens++;
        }
        reply.raw.end();

        // Track cost after stream completes
        const costTracker = new CostTracker();
        await costTracker.recordUsage(keyInfo.key_id, model, {
          prompt_tokens: 0,
          completion_tokens: totalTokens * 4,
          total_tokens: totalTokens * 4,
        });

      } else {
        // 6b. Non-streaming response
        const response = await deployment.provider.complete({
          model: deployment.providerModel,
          messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          top_p: params.top_p,
        });

        // Track cost (DynamoDB + local)
        const costTracker = new CostTracker();
        const cost = costTracker.calculateCost(model, response.usage);
        await costTracker.recordUsage(keyInfo.key_id, model, response.usage);

        // Persist spend to DynamoDB
        if (dynamoValidator && cost > 0) {
          const spendResult = await dynamoValidator.incrementSpend(apiKey, cost);
          logger.info({ key_id: keyInfo.key_id, cost, newSpend: spendResult.newSpend, budgetExceeded: spendResult.budgetExceeded }, 'Spend recorded in DynamoDB');
        }

        const latency = Date.now() - startTime;
        logger.info({
          model,
          routed_to: deployment.id,
          latency,
          tokens: response.usage?.total_tokens,
          key_id: keyInfo.key_id,
        }, 'Request completed');

        // Add gateway headers
        reply.header('X-Model-Used', deployment.providerModel);
        reply.header('X-Request-Latency', `${latency}ms`);

        return reply.code(200).send(response);
      }
    } catch (err: any) {
      logger.error({ err: err.message, model, deployment: deployment.id }, 'Provider error');

      // Try fallback
      const router2 = new Router();
      const fallback = await router2.getFallback(model);

      if (fallback) {
        logger.info({ model, fallback_to: fallback.id }, 'Attempting fallback');
        try {
          const response = await fallback.provider.complete({
            model: fallback.providerModel,
            messages,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
          });

          reply.header('X-Model-Used', fallback.providerModel);
          reply.header('X-Fallback', 'true');
          return reply.code(200).send(response);
        } catch (fallbackErr: any) {
          logger.error({ err: fallbackErr.message }, 'Fallback also failed');
        }
      }

      return reply.code(502).send({
        error: { message: `Provider error: ${err.message}`, type: 'provider_error', code: '502' }
      });
    }
  });
}
