import { loadConfig } from '../../shared/config';
import { logger } from '../../shared/logger';
import type { Deployment, RoutingStrategy } from '../../shared/types';
import { BedrockProvider } from '../providers/bedrock';
import { OpenAIProvider } from '../providers/openai';

export class Router {
  /**
   * Pick the best deployment for a given model name.
   * Applies routing strategy (weighted shuffle, latency-based, etc.)
   */
  async pickDeployment(modelName: string): Promise<Deployment | null> {
    const config = await loadConfig();
    const strategy = config.router_settings?.routing_strategy || 'simple-shuffle';

    // Find all deployments for this model
    const deployments = config.model_list
      .filter((m: any) => m.model_name === modelName)
      .map((m: any) => this.toDeployment(m));

    if (deployments.length === 0) {
      return null;
    }

    // Apply routing strategy
    switch (strategy) {
      case 'simple-shuffle':
        return this.weightedShuffle(deployments);
      case 'latency-based':
        return this.latencyBased(deployments);
      case 'cost-based':
        return this.costBased(deployments);
      default:
        return deployments[0];
    }
  }

  private weightedShuffle(deployments: Deployment[]): Deployment {
    // Weight by RPM capacity
    const totalRpm = deployments.reduce((sum, d) => sum + (d.rpm || 1), 0);
    let random = Math.random() * totalRpm;

    for (const d of deployments) {
      random -= d.rpm || 1;
      if (random <= 0) return d;
    }

    return deployments[deployments.length - 1];
  }

  private latencyBased(deployments: Deployment[]): Deployment {
    // TODO: Read latency metrics from CloudWatch/DDB
    // For now: fall back to weighted shuffle
    return this.weightedShuffle(deployments);
  }

  private costBased(deployments: Deployment[]): Deployment {
    // TODO: Sort by cost per token, pick cheapest available
    return deployments[0];
  }

  private toDeployment(modelConfig: any): Deployment {
    const model = modelConfig.litellm_params.model;
    const [providerName, providerModel] = model.includes('/')
      ? model.split('/', 2)
      : ['openai', model];

    let provider;
    switch (providerName) {
      case 'bedrock':
        provider = new BedrockProvider(modelConfig.litellm_params);
        break;
      case 'openai':
        provider = new OpenAIProvider(modelConfig.litellm_params);
        break;
      case 'anthropic':
        // TODO: AnthropicProvider
        provider = new OpenAIProvider(modelConfig.litellm_params);
        break;
      default:
        provider = new OpenAIProvider(modelConfig.litellm_params);
    }

    return {
      id: `${providerName}/${providerModel}`,
      modelName: modelConfig.model_name,
      providerModel,
      provider,
      rpm: modelConfig.routing?.rpm,
      tpm: modelConfig.routing?.tpm,
      order: modelConfig.routing?.order || 1,
    };
  }
}
