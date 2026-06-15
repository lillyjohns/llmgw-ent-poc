const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://7qegf6lerf.execute-api.us-east-1.amazonaws.com';
const MASTER_KEY = 'sk-llmgw-master';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MASTER_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

export interface KeyItem {
  key_id: string;
  key_alias?: string;
  key_hash: string;
  team_id?: string;
  org_id?: string;
  models: string[];
  max_budget: number;
  spend: number;
  rpm_limit?: number;
  tpm_limit?: number;
  blocked?: boolean;
  created_at?: string;
  last_used?: string;
  metadata?: Record<string, any>;
}

export interface KeyListResponse {
  keys: KeyItem[];
  total: number;
}

export async function listKeys(): Promise<KeyListResponse> {
  return apiFetch('/admin/key/list');
}

export async function generateKey(params: {
  key_alias?: string;
  team_id?: string;
  org_id?: string;
  models?: string[];
  max_budget?: number;
  rpm_limit?: number;
  tpm_limit?: number;
  metadata?: Record<string, any>;
}) {
  return apiFetch('/admin/key/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getKeyInfo(key: string) {
  return apiFetch(`/admin/key/info?key=${encodeURIComponent(key)}`);
}

export async function getGatewayInfo() {
  return apiFetch('/gateway/info');
}
