import { loadConfig } from '../../shared/config';
import { logger } from '../../shared/logger';
import type { Deployment } from '../../shared/types';
import { BedrockProvider } from '../providers/bedrock';
import { OpenAIProvider } from '../providers/openai';

export class Router {
  private async getConfig() {
    return loadConfig();
  }

  /**
   * Pick the best deployment for a given model name.
   */
  async pickDeployment(modelName: string): Promise<Deployment | null> {
    const config = await this.getConfig();
    const strategy = config.router_settings?.routing_strategy || 'simple-shuffle';

    const deployments = config.model_list
      .filter((m: any) => m.model_name === modelName)
      .map((m: any) => this.toDeployment(m));

    if (deployments.length === 0) {
      return null;
    }

    // Sort by order (priority)
    deployments.sort((a: Deployment, b: Deployment) => a.order - b.order);

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

  /**
   * Get fallback deployment for a model
   */
  async getFallback(modelName: string): Promise<Deployment | null> {
    const config = await this.getConfig();
    const fallbacks = config.router_settings?.fallbacks || [];
    const fallbackEntry = fallbacks.find((f: any) => f.model === modelName);

    if (!fallbackEntry) return null;

    return this.pickDeployment(fallbackEntry.fallback);
  }

  private weightedShuffle(deployments: Deployment[]): Deployment {
    const totalWeight = deployments.reduce((sum, d) => sum + (d.weight || d.rpm || 1), 0);
    let random = Math.random() * totalWeight;

    for (const d of deployments) {
      random -= d.weight || d.rpm || 1;
      if (random <= 0) return d;
    }

    return deployments[deployments.length - 1];
  }

  private latencyBased(deployments: Deployment[]): Deployment {
    // TODO: Read latency metrics from CloudWatch/DDB
    return this.weightedShuffle(deployments);
  }

  private costBased(deployments: Deployment[]): Deployment {
    // Pick by order (lowest cost first = highest order number)
    return deployments[deployments.length - 1];
  }

  private toDeployment(modelConfig: any): Deployment {
    const model = modelConfig.litellm_params.model;
    const [providerName, ...rest] = model.split('/');
    const providerModel = rest.join('/');

    let provider;
    switch (providerName) {
      case 'bedrock':
        provider = new BedrockProvider(modelConfig.litellm_params);
        break;
      case 'openai':
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
      weight: modelConfig.routing?.weight,
      order: modelConfig.routing?.order || 1,
    };
  }
}
