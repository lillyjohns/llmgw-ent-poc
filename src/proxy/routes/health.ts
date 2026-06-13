import { FastifyInstance } from 'fastify';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    return reply.send({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  });
}
