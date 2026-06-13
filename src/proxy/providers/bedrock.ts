import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BaseProvider, ProviderConfig, CompletionParams, CompletionResponse } from './base';
import { logger } from '../../shared/logger';

export class BedrockProvider extends BaseProvider {
  private client: BedrockRuntimeClient;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new BedrockRuntimeClient({
      region: config.aws_region || process.env.AWS_REGION || 'us-east-1',
    });
  }

  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const modelId = params.model;

    // Transform OpenAI format → Bedrock format (Claude Messages API)
    const bedrockBody = this.toBedrockFormat(params);

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockBody),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Transform Bedrock response → OpenAI format
    return this.toOpenAIFormat(responseBody, params.model);
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    const modelId = params.model;
    const bedrockBody = this.toBedrockFormat(params);

    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockBody),
    });

    const response = await this.client.send(command);

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          const sseData = this.chunkToSSE(chunk, params.model);
          if (sseData) {
            yield sseData;
          }
        }
      }
    }

    // Send [DONE] marker
    yield 'data: [DONE]\n\n';
  }

  private toBedrockFormat(params: CompletionParams): any {
    // Claude Messages API format
    const system = params.messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n');

    const messages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      }));

    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: params.max_tokens || 4096,
      temperature: params.temperature,
      top_p: params.top_p,
      ...(system && { system }),
      messages,
    };
  }

  private toOpenAIFormat(bedrockResponse: any, model: string): CompletionResponse {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: bedrockResponse.content?.[0]?.text || '',
        },
        finish_reason: bedrockResponse.stop_reason === 'end_turn' ? 'stop' : bedrockResponse.stop_reason,
      }],
      usage: {
        prompt_tokens: bedrockResponse.usage?.input_tokens || 0,
        completion_tokens: bedrockResponse.usage?.output_tokens || 0,
        total_tokens: (bedrockResponse.usage?.input_tokens || 0) + (bedrockResponse.usage?.output_tokens || 0),
      },
    };
  }

  private chunkToSSE(chunk: any, model: string): string | null {
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      const data = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: { content: chunk.delta.text },
          finish_reason: null,
        }],
      };
      return `data: ${JSON.stringify(data)}\n\n`;
    }

    if (chunk.type === 'message_stop') {
      const data = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      };
      return `data: ${JSON.stringify(data)}\n\n`;
    }

    return null;
  }
}
