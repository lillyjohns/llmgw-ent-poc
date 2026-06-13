import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

let cachedConfig: any = null;

export async function loadConfig(): Promise<any> {
  if (cachedConfig) return cachedConfig;

  const configPath = process.env.CONFIG_PATH || join(__dirname, '../../config/gateway-config.yaml');

  try {
    const raw = readFileSync(configPath, 'utf8');
    cachedConfig = parse(raw);
    return cachedConfig;
  } catch (err) {
    console.error(`Failed to load config from ${configPath}:`, err);
    // Return minimal default config
    return {
      model_list: [],
      router_settings: { routing_strategy: 'simple-shuffle' },
      general_settings: { port: 4000 },
    };
  }
}

export function reloadConfig(): void {
  cachedConfig = null;
}
