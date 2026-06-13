import { FastifyInstance } from 'fastify';

export async function embeddingsRoute(app: FastifyInstance) {
  app.post('/embeddings', async (request, reply) => {
    // TODO: Implement embeddings endpoint
    return reply.code(501).send({
      error: { message: 'Embeddings endpoint not yet implemented', type: 'not_implemented', code: '501' }
    });
  });
}
