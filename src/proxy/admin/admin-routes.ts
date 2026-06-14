import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { userNew, userInfo, userUpdate, userDelete, userList, userAvailableRoles } from './user-routes';
import { orgNew, orgInfo, orgUpdate, orgDelete, orgList, orgMembers } from './org-routes';
import { guardrailCreate, guardrailGet, guardrailUpdate, guardrailDelete, guardrailList } from './guardrail-routes';
import { globalSpendReport, globalSpendProvider, globalActivity } from './global-spend-routes';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

function hashKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
}

interface KeyRecord {
  key_id: string;
  key_hash: string;
  team_id?: string;
  org_id?: string;
  models: string[];
  max_budget?: number;
  spend: number;
  rpm_limit?: number;
  tpm_limit?: number;
  metadata?: Record<string, any>;
  blocked?: boolean;
  key_alias?: string;
  created_at?: string;
  expires_at?: string;
  budget_duration?: string;
  budget_reset_at?: string;
  [key: string]: any;
}

// ============================================================
// Types
// ============================================================

interface AdminResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

interface TeamRecord {
  PK: string;
  SK: string;
  team_id: string;
  team_alias: string;
  org_id?: string;
  max_budget?: number;
  spend: number;
  budget_duration?: string;
  budget_reset_at?: string;
  models?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ModelRecord {
  PK: string;
  SK: string;
  model_id: string;
  model_name: string;
  provider: string;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Helpers
// ============================================================

function jsonResponse(statusCode: number, body: unknown): AdminResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

function generateKeyId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generateTeamId(): string {
  return `team-${crypto.randomBytes(6).toString('hex')}`;
}

function generateApiKey(): string {
  return `sk-llmgw-${crypto.randomBytes(16).toString('base64url')}`;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(d|h|m|s)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'd': return value * 86400 * 1000;
    case 'h': return value * 3600 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 0;
  }
}

function computeExpiry(duration?: string): string | undefined {
  if (!duration) return undefined;
  const ms = parseDuration(duration);
  if (ms === 0) return undefined;
  return new Date(Date.now() + ms).toISOString();
}

// ============================================================
// Key Management
// ============================================================

async function keyGenerate(body: Record<string, unknown>): Promise<AdminResponse> {
  const apiKey = generateApiKey();
  const keyHash = hashKey(apiKey);
  const keyId = generateKeyId();
  const now = new Date().toISOString();

  const expiresAt = computeExpiry(body.duration as string | undefined);
  const budgetResetAt = computeExpiry(body.budget_duration as string | undefined);

  const record: KeyRecord = {
    PK: `KEY#${keyHash}`,
    SK: 'META',
    key_id: keyId,
    key_hash: keyHash,
    key_alias: (body.key_alias as string) || undefined,
    team_id: (body.team_id as string) || undefined,
    org_id: (body.org_id as string) || undefined,
    models: (body.models as string[]) || undefined,
    max_budget: (body.max_budget as number) || undefined,
    spend: 0,
    rpm_limit: (body.rpm_limit as number) || undefined,
    tpm_limit: (body.tpm_limit as number) || undefined,
    metadata: (body.metadata as Record<string, unknown>) || undefined,
    blocked: false,
    created_at: now,
    expires_at: expiresAt,
    budget_duration: (body.budget_duration as string) || undefined,
    budget_reset_at: budgetResetAt,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );

  return jsonResponse(200, {
    key: apiKey,
    key_name: record.key_alias || null,
    key_id: keyId,
    team_id: record.team_id || null,
    models: record.models || [],
    max_budget: record.max_budget || null,
    spend: 0,
    expires: expiresAt || null,
    created_at: now,
  });
}

async function keyInfo(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const key = queryParams.key;
  if (!key) {
    return jsonResponse(400, { error: 'Missing required query parameter: key' });
  }

  const keyHash = hashKey(key);
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `KEY#${keyHash}`, SK: 'META' },
    })
  );

  if (!result.Item) {
    return jsonResponse(404, { error: 'Key not found' });
  }

  const record = result.Item as KeyRecord;
  return jsonResponse(200, {
    key_id: record.key_id,
    key_name: record.key_alias || null,
    key_hash: record.key_hash,
    team_id: record.team_id || null,
    org_id: record.org_id || null,
    models: record.models || [],
    max_budget: record.max_budget || null,
    spend: record.spend,
    rpm_limit: record.rpm_limit || null,
    tpm_limit: record.tpm_limit || null,
    metadata: record.metadata || {},
    blocked: record.blocked,
    created_at: record.created_at,
    expires_at: record.expires_at || null,
    budget_duration: record.budget_duration || null,
    budget_reset_at: record.budget_reset_at || null,
  });
}

async function keyUpdate(body: Record<string, unknown>): Promise<AdminResponse> {
  const key = body.key as string;
  if (!key) {
    return jsonResponse(400, { error: 'Missing required field: key' });
  }

  const keyHash = hashKey(key);

  // Build update expression dynamically
  const updateFields: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const allowedFields: Record<string, string> = {
    models: 'models',
    max_budget: 'max_budget',
    rpm_limit: 'rpm_limit',
    tpm_limit: 'tpm_limit',
    metadata: 'metadata',
    team_id: 'team_id',
    budget_duration: 'budget_duration',
    key_alias: 'key_alias',
    duration: 'expires_at',
  };

  for (const [inputKey, dbField] of Object.entries(allowedFields)) {
    if (body[inputKey] !== undefined) {
      let value: unknown = body[inputKey];
      if (inputKey === 'duration') {
        const expiry = computeExpiry(value as string);
        if (!expiry) continue;
        value = expiry;
      }
      const placeholder = `#f${updateFields.length}`;
      const valuePlaceholder = `:v${updateFields.length}`;
      updateFields.push(`${placeholder} = ${valuePlaceholder}`);
      expressionNames[placeholder] = dbField;
      expressionValues[valuePlaceholder] = value;
    }
  }

  if (updateFields.length === 0) {
    return jsonResponse(400, { error: 'No valid fields to update' });
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
        UpdateExpression: `SET ${updateFields.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: 'Key not found' });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'updated', key_hash: keyHash });
}

async function keyDelete(body: Record<string, unknown>): Promise<AdminResponse> {
  const key = body.key as string;
  if (!key) {
    return jsonResponse(400, { error: 'Missing required field: key' });
  }

  const keyHash = hashKey(key);

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `KEY#${keyHash}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', key_hash: keyHash });
}

async function keyList(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const teamId = queryParams.team_id;

  // Scan for all KEY# items
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: teamId
        ? 'begins_with(PK, :prefix) AND team_id = :teamId'
        : 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: teamId
        ? { ':prefix': 'KEY#', ':teamId': teamId }
        : { ':prefix': 'KEY#' },
    })
  );

  const keys = (result.Items || []).map((item) => ({
    key_id: item.key_id,
    key_name: item.key_alias || null,
    key_hash: item.key_hash,
    team_id: item.team_id || null,
    models: item.models || [],
    max_budget: item.max_budget || null,
    spend: item.spend || 0,
    blocked: item.blocked || false,
    created_at: item.created_at,
    expires_at: item.expires_at || null,
  }));

  return jsonResponse(200, { keys });
}

async function keyBlock(body: Record<string, unknown>): Promise<AdminResponse> {
  const key = body.key as string;
  if (!key) {
    return jsonResponse(400, { error: 'Missing required field: key' });
  }

  const keyHash = hashKey(key);

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
        UpdateExpression: 'SET blocked = :blocked',
        ExpressionAttributeValues: { ':blocked': true },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: 'Key not found' });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'blocked', key_hash: keyHash });
}

async function keyUnblock(body: Record<string, unknown>): Promise<AdminResponse> {
  const key = body.key as string;
  if (!key) {
    return jsonResponse(400, { error: 'Missing required field: key' });
  }

  const keyHash = hashKey(key);

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `KEY#${keyHash}`, SK: 'META' },
        UpdateExpression: 'SET blocked = :blocked',
        ExpressionAttributeValues: { ':blocked': false },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: 'Key not found' });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'unblocked', key_hash: keyHash });
}

// ============================================================
// Team Management
// ============================================================

async function teamNew(body: Record<string, unknown>): Promise<AdminResponse> {
  const teamId = generateTeamId();
  const now = new Date().toISOString();
  const budgetResetAt = computeExpiry(body.budget_duration as string | undefined);

  const record: TeamRecord = {
    PK: `TEAM#${teamId}`,
    SK: 'META',
    team_id: teamId,
    team_alias: (body.team_alias as string) || teamId,
    org_id: (body.org_id as string) || undefined,
    max_budget: (body.max_budget as number) || undefined,
    spend: 0,
    budget_duration: (body.budget_duration as string) || undefined,
    budget_reset_at: budgetResetAt,
    models: (body.models as string[]) || undefined,
    metadata: (body.metadata as Record<string, unknown>) || undefined,
    created_at: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );

  return jsonResponse(200, {
    team_id: teamId,
    team_alias: record.team_alias,
    max_budget: record.max_budget || null,
    spend: 0,
    budget_duration: record.budget_duration || null,
    budget_reset_at: budgetResetAt || null,
    models: record.models || [],
    metadata: record.metadata || {},
    created_at: now,
  });
}

async function teamInfo(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const teamId = queryParams.team_id;
  if (!teamId) {
    return jsonResponse(400, { error: 'Missing required query parameter: team_id' });
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TEAM#${teamId}`, SK: 'META' },
    })
  );

  if (!result.Item) {
    return jsonResponse(404, { error: 'Team not found' });
  }

  const record = result.Item as TeamRecord;
  return jsonResponse(200, {
    team_id: record.team_id,
    team_alias: record.team_alias,
    org_id: record.org_id || null,
    max_budget: record.max_budget || null,
    spend: record.spend,
    budget_duration: record.budget_duration || null,
    budget_reset_at: record.budget_reset_at || null,
    models: record.models || [],
    metadata: record.metadata || {},
    created_at: record.created_at,
  });
}

async function teamUpdate(body: Record<string, unknown>): Promise<AdminResponse> {
  const teamId = body.team_id as string;
  if (!teamId) {
    return jsonResponse(400, { error: 'Missing required field: team_id' });
  }

  const updateFields: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const allowedFields: Record<string, string> = {
    team_alias: 'team_alias',
    max_budget: 'max_budget',
    budget_duration: 'budget_duration',
    models: 'models',
    metadata: 'metadata',
    org_id: 'org_id',
  };

  for (const [inputKey, dbField] of Object.entries(allowedFields)) {
    if (body[inputKey] !== undefined) {
      const placeholder = `#f${updateFields.length}`;
      const valuePlaceholder = `:v${updateFields.length}`;
      updateFields.push(`${placeholder} = ${valuePlaceholder}`);
      expressionNames[placeholder] = dbField;
      expressionValues[valuePlaceholder] = body[inputKey];
    }
  }

  // If budget_duration changed, also update budget_reset_at
  if (body.budget_duration) {
    const resetAt = computeExpiry(body.budget_duration as string);
    if (resetAt) {
      const idx = updateFields.length;
      const placeholder = `#f${idx}`;
      const valuePlaceholder = `:v${idx}`;
      updateFields.push(`${placeholder} = ${valuePlaceholder}`);
      expressionNames[placeholder] = 'budget_reset_at';
      expressionValues[valuePlaceholder] = resetAt;
    }
  }

  if (updateFields.length === 0) {
    return jsonResponse(400, { error: 'No valid fields to update' });
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TEAM#${teamId}`, SK: 'META' },
        UpdateExpression: `SET ${updateFields.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: 'Team not found' });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'updated', team_id: teamId });
}

async function teamDelete(body: Record<string, unknown>): Promise<AdminResponse> {
  const teamId = body.team_id as string;
  if (!teamId) {
    return jsonResponse(400, { error: 'Missing required field: team_id' });
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TEAM#${teamId}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', team_id: teamId });
}

async function teamList(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'TEAM#' },
    })
  );

  const teams = (result.Items || []).map((item) => ({
    team_id: item.team_id,
    team_alias: item.team_alias,
    org_id: item.org_id || null,
    max_budget: item.max_budget || null,
    spend: item.spend || 0,
    budget_duration: item.budget_duration || null,
    budget_reset_at: item.budget_reset_at || null,
    models: item.models || [],
    metadata: item.metadata || {},
    created_at: item.created_at,
  }));

  return jsonResponse(200, { teams });
}

// ============================================================
// Model Management
// ============================================================

async function modelList(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'MODEL#' },
    })
  );

  const models = (result.Items || []).map((item) => ({
    model_id: item.model_id,
    model_name: item.model_name,
    provider: item.provider,
    input_cost_per_1k: item.input_cost_per_1k || null,
    output_cost_per_1k: item.output_cost_per_1k || null,
    max_tokens: item.max_tokens || null,
    metadata: item.metadata || {},
    created_at: item.created_at,
  }));

  return jsonResponse(200, { models });
}

async function modelAdd(body: Record<string, unknown>): Promise<AdminResponse> {
  const modelName = body.model_name as string;
  if (!modelName) {
    return jsonResponse(400, { error: 'Missing required field: model_name' });
  }

  const modelId = (body.model_id as string) || modelName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const now = new Date().toISOString();

  const record: ModelRecord = {
    PK: `MODEL#${modelId}`,
    SK: 'META',
    model_id: modelId,
    model_name: modelName,
    provider: (body.provider as string) || 'unknown',
    input_cost_per_1k: (body.input_cost_per_1k as number) || undefined,
    output_cost_per_1k: (body.output_cost_per_1k as number) || undefined,
    max_tokens: (body.max_tokens as number) || undefined,
    metadata: (body.metadata as Record<string, unknown>) || undefined,
    created_at: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );

  return jsonResponse(200, {
    model_id: modelId,
    model_name: modelName,
    provider: record.provider,
    input_cost_per_1k: record.input_cost_per_1k || null,
    output_cost_per_1k: record.output_cost_per_1k || null,
    max_tokens: record.max_tokens || null,
    created_at: now,
  });
}

async function modelDelete(body: Record<string, unknown>): Promise<AdminResponse> {
  const modelId = body.model_id as string;
  if (!modelId) {
    return jsonResponse(400, { error: 'Missing required field: model_id' });
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `MODEL#${modelId}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', model_id: modelId });
}

// ============================================================
// Spend/Usage
// ============================================================

async function spendKeys(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'KEY#' },
    })
  );

  let keys = (result.Items || []).map((item) => ({
    key_id: item.key_id,
    key_name: item.key_alias || null,
    key_hash: item.key_hash,
    team_id: item.team_id || null,
    spend: item.spend || 0,
    max_budget: item.max_budget || null,
    created_at: item.created_at,
  }));

  // Filter by date if provided (based on created_at for simplicity)
  const startDate = queryParams.start_date;
  const endDate = queryParams.end_date;

  if (startDate) {
    keys = keys.filter((k) => k.created_at >= startDate);
  }
  if (endDate) {
    keys = keys.filter((k) => k.created_at <= endDate);
  }

  const totalSpend = keys.reduce((sum, k) => sum + k.spend, 0);

  return jsonResponse(200, { keys, total_spend: totalSpend });
}

async function spendTeams(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'TEAM#' },
    })
  );

  const teams = (result.Items || []).map((item) => ({
    team_id: item.team_id,
    team_alias: item.team_alias,
    spend: item.spend || 0,
    max_budget: item.max_budget || null,
  }));

  const totalSpend = teams.reduce((sum, t) => sum + t.spend, 0);

  return jsonResponse(200, { teams, total_spend: totalSpend });
}

async function spendModels(): Promise<AdminResponse> {
  // Aggregate spend by model from usage records or keys
  // For now, return model config with any tracked spend
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'MODEL#' },
    })
  );

  const models = (result.Items || []).map((item) => ({
    model_id: item.model_id,
    model_name: item.model_name,
    spend: item.spend || 0,
  }));

  const totalSpend = models.reduce((sum, m) => sum + m.spend, 0);

  return jsonResponse(200, { models, total_spend: totalSpend });
}

async function spendReset(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const key = queryParams.key;
  const teamId = queryParams.team_id;

  if (!key && !teamId) {
    return jsonResponse(400, { error: 'Must provide either key or team_id query parameter' });
  }

  if (key) {
    const keyHash = hashKey(key);
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `KEY#${keyHash}`, SK: 'META' },
          UpdateExpression: 'SET spend = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        return jsonResponse(404, { error: 'Key not found' });
      }
      throw err;
    }
    return jsonResponse(200, { status: 'reset', key_hash: keyHash });
  }

  if (teamId) {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `TEAM#${teamId}`, SK: 'META' },
          UpdateExpression: 'SET spend = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        return jsonResponse(404, { error: 'Team not found' });
      }
      throw err;
    }
    return jsonResponse(200, { status: 'reset', team_id: teamId });
  }

  return jsonResponse(400, { error: 'Unexpected state' });
}

// ============================================================
// Router
// ============================================================

export async function handleAdminRoute(
  method: string,
  path: string,
  body: Record<string, unknown>,
  queryParams: Record<string, string | undefined>
): Promise<AdminResponse> {
  // Normalize path (remove trailing slash)
  const normalizedPath = path.replace(/\/$/, '');

  // Handle routes with dynamic IDs (guardrails/<id>)
  const guardrailMatch = normalizedPath.match(/^\/admin\/guardrails\/(.+)$/);
  if (guardrailMatch) {
    const guardrailId = guardrailMatch[1];
    // Don't match 'list' as an ID
    if (guardrailId !== 'list') {
      switch (method) {
        case 'GET':
          return guardrailGet(guardrailId);
        case 'PUT':
          return guardrailUpdate(guardrailId, body);
        case 'DELETE':
          return guardrailDelete(guardrailId);
        default:
          return jsonResponse(405, { error: { message: `Method ${method} not allowed for guardrails/<id>`, type: 'method_not_allowed' } });
      }
    }
  }

  switch (`${method} ${normalizedPath}`) {
    // Key Management
    case 'POST /admin/key/generate':
      return keyGenerate(body);
    case 'GET /admin/key/info':
      return keyInfo(queryParams);
    case 'POST /admin/key/update':
      return keyUpdate(body);
    case 'POST /admin/key/delete':
      return keyDelete(body);
    case 'GET /admin/key/list':
      return keyList(queryParams);
    case 'POST /admin/key/block':
      return keyBlock(body);
    case 'POST /admin/key/unblock':
      return keyUnblock(body);

    // Team Management
    case 'POST /admin/team/new':
      return teamNew(body);
    case 'GET /admin/team/info':
      return teamInfo(queryParams);
    case 'POST /admin/team/update':
      return teamUpdate(body);
    case 'POST /admin/team/delete':
      return teamDelete(body);
    case 'GET /admin/team/list':
      return teamList();

    // User Management
    case 'POST /admin/user/new':
      return userNew(body);
    case 'GET /admin/user/info':
      return userInfo(queryParams);
    case 'POST /admin/user/update':
      return userUpdate(body);
    case 'POST /admin/user/delete':
      return userDelete(body);
    case 'GET /admin/user/list':
      return userList();
    case 'GET /admin/user/available_roles':
      return userAvailableRoles();

    // Organization Management
    case 'POST /admin/organization/new':
      return orgNew(body);
    case 'GET /admin/organization/info':
      return orgInfo(queryParams);
    case 'PATCH /admin/organization/update':
      return orgUpdate(body);
    case 'DELETE /admin/organization/delete':
      return orgDelete(queryParams);
    case 'GET /admin/organization/list':
      return orgList();
    case 'GET /admin/organization/members':
      return orgMembers(queryParams);

    // Guardrails Management
    case 'GET /admin/guardrails/list':
      return guardrailList();
    case 'POST /admin/guardrails':
      return guardrailCreate(body);

    // Global Spend Reports
    case 'GET /admin/global/spend/report':
      return globalSpendReport(queryParams);
    case 'GET /admin/global/spend/provider':
      return globalSpendProvider();
    case 'GET /admin/global/activity':
      return globalActivity(queryParams);

    // Model Management
    case 'GET /admin/model/list':
      return modelList();
    case 'POST /admin/model/add':
      return modelAdd(body);
    case 'POST /admin/model/delete':
      return modelDelete(body);

    // Spend/Usage
    case 'GET /admin/spend/keys':
      return spendKeys(queryParams);
    case 'GET /admin/spend/teams':
      return spendTeams();
    case 'GET /admin/spend/models':
      return spendModels();
    case 'GET /admin/spend/reset':
      return spendReset(queryParams);

    default:
      return jsonResponse(404, { error: { message: `Admin route not found: ${method} ${normalizedPath}`, type: 'not_found' } });
  }
}
