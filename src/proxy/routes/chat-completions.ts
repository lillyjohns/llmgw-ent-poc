import { FastifyInstance } from 'fastify';
import { KeyValidator } from '../auth/key-validator';
import { Router } from '../router';
import { CostTracker } from '../cost/price-calculator';
import { SSETransformer } from '../streaming/sse-transformer';
import { logger } from '../../shared/logger';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../../shared/types';

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

    // 3. Check model access
    if (keyInfo.models.length > 0 && !keyInfo.models.includes(model)) {
      return reply.code(403).send({
        error: { message: `Model '${model}' not allowed for this key`, type: 'permission_error', code: '403' }
      });
    }

    // 4. Check budget
    if (keyInfo.max_budget && keyInfo.spend >= keyInfo.max_budget) {
      return reply.code(429).send({
        error: { message: 'Budget exceeded for this key', type: 'budget_error', code: '429' }
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

    try {
      if (stream) {
        // 6a. Streaming response
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Request-Id': request.id,
        });

        const transformer = new SSETransformer();
        const totalTokens = await transformer.streamFromProvider(
          deployment,
          { model, messages, stream: true, ...params },
          reply.raw
        );

        // Track cost after stream completes
        const costTracker = new CostTracker();
        await costTracker.recordUsage(keyInfo.key_id, model, totalTokens);

      } else {
        // 6b. Non-streaming response
        const response = await deployment.provider.complete({
          model: deployment.providerModel,
          messages,
          ...params,
        });

        // Track cost
        const costTracker = new CostTracker();
        await costTracker.recordUsage(keyInfo.key_id, model, response.usage);

        const latency = Date.now() - startTime;
        logger.info({ model, latency, tokens: response.usage?.total_tokens }, 'Request completed');

        return reply.code(200).send(response);
      }
    } catch (err: any) {
      // 7. Handle provider errors — attempt fallback
      logger.error({ err, model, deployment: deployment.id }, 'Provider error');

      // TODO: Implement retry/fallback logic via router
      return reply.code(502).send({
        error: { message: `Provider error: ${err.message}`, type: 'provider_error', code: '502' }
      });
    }
  });
}
