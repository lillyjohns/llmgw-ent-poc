import { BaseProvider, ProviderConfig, CompletionParams, CompletionResponse } from './base';

export class OpenAIProvider extends BaseProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.api_base || 'https://api.openai.com/v1';
    this.apiKey = config.api_key || process.env.OPENAI_API_KEY || '';
  }

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<CompletionResponse>;
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          yield `${line}\n\n`;
        }
      }
    }
  }
}
