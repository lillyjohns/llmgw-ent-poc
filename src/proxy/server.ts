import Fastify from 'fastify';
import { chatCompletionsRoute } from './routes/chat-completions';
import { embeddingsRoute } from './routes/embeddings';
import { modelsRoute } from './routes/models';
import { healthRoute } from './routes/health';
import { loadConfig } from '../shared/config';
import { logger } from '../shared/logger';

const app = Fastify({ logger: true });

async function start() {
  const config = await loadConfig();

  // Register routes
  app.register(healthRoute);
  app.register(chatCompletionsRoute, { prefix: '/v1' });
  app.register(embeddingsRoute, { prefix: '/v1' });
  app.register(modelsRoute, { prefix: '/v1' });

  const port = config.general_settings?.port || 4000;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`LLM Gateway listening on port ${port}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
