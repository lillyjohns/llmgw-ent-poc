import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

let cachedConfig: any = null;
let configLoadedAt: number = 0;
const CONFIG_TTL = 5000; // reload every 5s in dev

export async function loadConfig(): Promise<any> {
  const now = Date.now();
  if (cachedConfig && (now - configLoadedAt) < CONFIG_TTL) return cachedConfig;

  const configPath = process.env.CONFIG_PATH || join(__dirname, '../../config/gateway-config.yaml');

  try {
    const raw = readFileSync(configPath, 'utf8');
    cachedConfig = parse(raw);
    configLoadedAt = now;
    return cachedConfig;
  } catch (err) {
    console.error(`Failed to load config from ${configPath}:`, err);
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
