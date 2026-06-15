export interface KeyInfo {
  key_id: string;
  key_alias?: string;
  team_id?: string;
  org_id?: string;
  models: string[];
  max_budget?: number;
  spend: number;
  rpm_limit?: number;
  tpm_limit?: number;
  metadata: Record<string, any>;
}

export interface Deployment {
  id: string;
  modelName: string;
  providerModel: string;
  provider: any; // BaseProvider
  rpm?: number;
  tpm?: number;
  weight?: number;
  order: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  user?: string;
  metadata?: Record<string, any>;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
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
}

export interface GatewayConfig {
  model_list: ModelConfig[];
  router_settings: RouterSettings;
  guardrails?: GuardrailConfig[];
  general_settings: GeneralSettings;
}

export interface ModelConfig {
  model_name: string;
  litellm_params: {
    model: string;
    api_key?: string;
    api_base?: string;
    aws_region?: string;
  };
  routing?: {
    rpm?: number;
    tpm?: number;
    order?: number;
    weight?: number;
  };
}

export interface RouterSettings {
  routing_strategy: 'simple-shuffle' | 'latency-based' | 'cost-based';
  retry_policy?: {
    max_retries: number;
    retry_after_seconds: number;
    backoff_multiplier: number;
  };
  circuit_breaker?: {
    failure_threshold: number;
    recovery_timeout_seconds: number;
  };
  fallbacks?: Array<{ model: string; fallback: string }>;
}

export interface GuardrailConfig {
  guardrail_name: string;
  mode: string | string[];
  type: string;
  guardrail_id?: string;
  version?: string;
  default_on?: boolean;
  actions?: Record<string, string>;
}

export interface GeneralSettings {
  master_key?: string;
  port: number;
  log_level: string;
  enforce_budget: boolean;
  default_key_params?: {
    max_budget?: number;
    budget_duration?: string;
    rpm_limit?: number;
    tpm_limit?: number;
  };
}
