import { FastifyInstance } from 'fastify';
import { loadConfig } from '../../shared/config';

export async function modelsRoute(app: FastifyInstance) {
  app.get('/models', async (request, reply) => {
    const config = await loadConfig();

    // Deduplicate model names
    const modelNames = [...new Set(config.model_list.map((m: any) => m.model_name))];

    const models = modelNames.map((name: string) => ({
      id: name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'llmgw',
    }));

    return reply.send({
      object: 'list',
      data: models,
    });
  });
}
