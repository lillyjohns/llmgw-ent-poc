export interface ProviderConfig {
  model: string;
  api_key?: string;
  api_base?: string;
  aws_region?: string;
  [key: string]: any;
}

export interface CompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  [key: string]: any;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  [key: string]: any; // Allow provider-specific metadata
}

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract complete(params: CompletionParams): Promise<CompletionResponse>;
  abstract stream(params: CompletionParams): AsyncGenerator<string>;
}
