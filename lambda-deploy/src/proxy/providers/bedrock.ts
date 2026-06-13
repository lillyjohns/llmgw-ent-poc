import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
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

    // Use Converse API — works with ALL Bedrock models (Claude, DeepSeek, Llama, Mistral, Nova)
    const system = params.messages
      .filter(m => m.role === 'system')
      .map(m => ({ text: m.content }));

    const messages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: [{ text: m.content }],
      }));

    const command = new ConverseCommand({
      modelId,
      messages,
      ...(system.length > 0 && { system }),
      inferenceConfig: {
        maxTokens: params.max_tokens || 4096,
        temperature: params.temperature,
        topP: params.top_p,
      },
    });

    const startTime = Date.now();
    const response = await this.client.send(command);
    const latency = Date.now() - startTime;

    const outputText = response.output?.message?.content?.[0]?.text || '';

    logger.info({ modelId, latency, tokens: response.usage?.totalTokens }, 'Bedrock Converse completed');

    return {
      id: `chatcmpl-${Date.now().toString(36)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: outputText,
        },
        finish_reason: response.stopReason === 'end_turn' ? 'stop' : (response.stopReason || 'stop'),
      }],
      usage: {
        prompt_tokens: response.usage?.inputTokens || 0,
        completion_tokens: response.usage?.outputTokens || 0,
        total_tokens: response.usage?.totalTokens || 0,
      },
    };
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    const modelId = params.model;

    const system = params.messages
      .filter(m => m.role === 'system')
      .map(m => ({ text: m.content }));

    const messages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: [{ text: m.content }],
      }));

    const command = new ConverseStreamCommand({
      modelId,
      messages,
      ...(system.length > 0 && { system }),
      inferenceConfig: {
        maxTokens: params.max_tokens || 4096,
        temperature: params.temperature,
        topP: params.top_p,
      },
    });

    const response = await this.client.send(command);
    const id = `chatcmpl-${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1000);

    if (response.stream) {
      for await (const event of response.stream) {
        if (event.contentBlockDelta?.delta?.text) {
          const chunk = {
            id,
            object: 'chat.completion.chunk',
            created,
            model: modelId,
            choices: [{
              index: 0,
              delta: { content: event.contentBlockDelta.delta.text },
              finish_reason: null,
            }],
          };
          yield `data: ${JSON.stringify(chunk)}\n\n`;
        }

        if (event.messageStop) {
          const chunk = {
            id,
            object: 'chat.completion.chunk',
            created,
            model: modelId,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop',
            }],
          };
          yield `data: ${JSON.stringify(chunk)}\n\n`;
        }
      }
    }

    yield 'data: [DONE]\n\n';
  }
}
