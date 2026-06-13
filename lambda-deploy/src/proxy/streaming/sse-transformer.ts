import { ServerResponse } from 'http';
import type { Deployment } from '../../shared/types';

export class SSETransformer {
  /**
   * Stream from a provider and write SSE chunks to the HTTP response.
   * Returns total token usage for cost tracking.
   */
  async streamFromProvider(
    deployment: Deployment,
    params: any,
    res: ServerResponse
  ): Promise<{ prompt_tokens: number; completion_tokens: number; total_tokens: number }> {
    let totalChunks = 0;

    try {
      for await (const chunk of deployment.provider.stream({
        model: deployment.providerModel,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
      })) {
        res.write(chunk);
        totalChunks++;
      }
    } catch (err) {
      // Write error as SSE event
      const errorData = {
        error: { message: `Stream error: ${(err as Error).message}`, type: 'stream_error' }
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    } finally {
      res.end();
    }

    // Approximate token count from chunks (actual count comes from provider)
    // TODO: Get actual usage from provider's final message
    return {
      prompt_tokens: 0, // Set from pre-count
      completion_tokens: totalChunks * 4, // Rough estimate
      total_tokens: totalChunks * 4,
    };
  }
}
