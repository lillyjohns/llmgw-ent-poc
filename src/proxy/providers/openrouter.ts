import { BaseProvider, CompletionParams, CompletionResponse } from './base';
import { logger } from '../../shared/logger';

/**
 * OpenRouter provider for multi-provider failover.
 * Used as fallback when primary Bedrock models are unavailable.
 * Supports free-tier models for cost-effective failover.
 */
export class OpenRouterProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(params: any) {
    super(params);
    // Resolve API key: from params (config) or environment
    const rawKey = params.api_key || '';
    this.apiKey = rawKey.startsWith('${') ? (process.env.OPENROUTER_API_KEY || '') : rawKey;
    this.baseUrl = params.api_base || 'https://openrouter.ai/api/v1';
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    // Not implemented for fallback - throw to trigger next fallback
    throw new Error('OpenRouter streaming not implemented');
  }

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const startTime = Date.now();
    const model = params.model;

    logger.info({ model, provider: 'openrouter' }, 'Calling OpenRouter');

    const body = {
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1024,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://llmgw-ent-poc.example.com',
        'X-Title': 'LLM Gateway Enterprise POC',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, body: errText, model }, 'OpenRouter request failed');
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const latencyMs = Date.now() - startTime;

    logger.info({ model, latencyMs, tokens: data.usage?.total_tokens }, 'OpenRouter response received');

    return {
      id: data.id || `or-${Date.now()}`,
      object: 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: data.choices || [],
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      // Extra metadata for debugging
      _provider: 'openrouter',
      _latency_ms: latencyMs,
    };
  }
}
