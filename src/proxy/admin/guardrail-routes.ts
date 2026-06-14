import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

// ============================================================
// Types
// ============================================================

interface AdminResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

type GuardrailType = 'content_filter' | 'pii_mask' | 'prompt_injection' | 'custom';
type GuardrailMode = 'pre_call' | 'post_call' | 'both';

interface GuardrailRecord {
  PK: string;
  SK: string;
  guardrail_id: string;
  name: string;
  type: GuardrailType;
  mode: GuardrailMode;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

const VALID_TYPES: GuardrailType[] = ['content_filter', 'pii_mask', 'prompt_injection', 'custom'];
const VALID_MODES: GuardrailMode[] = ['pre_call', 'post_call', 'both'];

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

function generateGuardrailId(): string {
  return `gr-${crypto.randomBytes(6).toString('hex')}`;
}

function validateGuardrailConfig(type: GuardrailType, config: Record<string, unknown>): string | null {
  switch (type) {
    case 'content_filter':
      if (!config.categories || !Array.isArray(config.categories)) {
        return 'content_filter requires config.categories as an array';
      }
      break;
    case 'pii_mask':
      if (!config.entities || !Array.isArray(config.entities)) {
        return 'pii_mask requires config.entities as an array';
      }
      if (config.action && !['mask', 'block'].includes(config.action as string)) {
        return 'pii_mask config.action must be "mask" or "block"';
      }
      break;
    case 'prompt_injection':
      if (config.sensitivity && !['low', 'medium', 'high'].includes(config.sensitivity as string)) {
        return 'prompt_injection config.sensitivity must be "low", "medium", or "high"';
      }
      break;
    case 'custom':
      // Custom can have any config
      break;
  }
  return null;
}

// ============================================================
// Guardrails Management
// ============================================================

export async function guardrailCreate(body: Record<string, unknown>): Promise<AdminResponse> {
  const name = body.name as string;
  if (!name) {
    return jsonResponse(400, { error: { message: 'Missing required field: name', type: 'invalid_request' } });
  }

  const type = body.type as GuardrailType;
  if (!type || !VALID_TYPES.includes(type)) {
    return jsonResponse(400, { error: { message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, type: 'invalid_request' } });
  }

  const mode = (body.mode as GuardrailMode) || 'both';
  if (!VALID_MODES.includes(mode)) {
    return jsonResponse(400, { error: { message: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`, type: 'invalid_request' } });
  }

  const config = (body.config as Record<string, unknown>) || {};
  const configError = validateGuardrailConfig(type, config);
  if (configError) {
    return jsonResponse(400, { error: { message: configError, type: 'invalid_request' } });
  }

  const guardrailId = (body.guardrail_id as string) || generateGuardrailId();
  const now = new Date().toISOString();

  const record: GuardrailRecord = {
    PK: `GUARDRAIL#${guardrailId}`,
    SK: 'META',
    guardrail_id: guardrailId,
    name,
    type,
    mode,
    enabled: body.enabled !== false, // defaults to true
    config,
    created_at: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );

  return jsonResponse(200, {
    guardrail_id: guardrailId,
    name: record.name,
    type: record.type,
    mode: record.mode,
    enabled: record.enabled,
    config: record.config,
    created_at: now,
  });
}

export async function guardrailGet(guardrailId: string): Promise<AdminResponse> {
  if (!guardrailId) {
    return jsonResponse(400, { error: { message: 'Missing guardrail ID', type: 'invalid_request' } });
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GUARDRAIL#${guardrailId}`, SK: 'META' },
    })
  );

  if (!result.Item) {
    return jsonResponse(404, { error: { message: 'Guardrail not found', type: 'not_found' } });
  }

  const record = result.Item as GuardrailRecord;
  return jsonResponse(200, {
    guardrail_id: record.guardrail_id,
    name: record.name,
    type: record.type,
    mode: record.mode,
    enabled: record.enabled,
    config: record.config,
    created_at: record.created_at,
    updated_at: record.updated_at || null,
  });
}

export async function guardrailUpdate(guardrailId: string, body: Record<string, unknown>): Promise<AdminResponse> {
  if (!guardrailId) {
    return jsonResponse(400, { error: { message: 'Missing guardrail ID', type: 'invalid_request' } });
  }

  // Validate type if provided
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type as GuardrailType)) {
      return jsonResponse(400, { error: { message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, type: 'invalid_request' } });
    }
  }

  // Validate mode if provided
  if (body.mode !== undefined) {
    if (!VALID_MODES.includes(body.mode as GuardrailMode)) {
      return jsonResponse(400, { error: { message: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`, type: 'invalid_request' } });
    }
  }

  // Validate config against type if both provided
  if (body.config && body.type) {
    const configError = validateGuardrailConfig(body.type as GuardrailType, body.config as Record<string, unknown>);
    if (configError) {
      return jsonResponse(400, { error: { message: configError, type: 'invalid_request' } });
    }
  }

  const updateFields: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const allowedFields: Record<string, string> = {
    name: 'name',
    type: 'type',
    mode: 'mode',
    enabled: 'enabled',
    config: 'config',
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

  // Always update updated_at
  const idx = updateFields.length;
  updateFields.push(`#f${idx} = :v${idx}`);
  expressionNames[`#f${idx}`] = 'updated_at';
  expressionValues[`:v${idx}`] = new Date().toISOString();

  if (updateFields.length <= 1) {
    return jsonResponse(400, { error: { message: 'No valid fields to update', type: 'invalid_request' } });
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `GUARDRAIL#${guardrailId}`, SK: 'META' },
        UpdateExpression: `SET ${updateFields.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: { message: 'Guardrail not found', type: 'not_found' } });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'updated', guardrail_id: guardrailId });
}

export async function guardrailDelete(guardrailId: string): Promise<AdminResponse> {
  if (!guardrailId) {
    return jsonResponse(400, { error: { message: 'Missing guardrail ID', type: 'invalid_request' } });
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GUARDRAIL#${guardrailId}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', guardrail_id: guardrailId });
}

export async function guardrailList(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'GUARDRAIL#' },
    })
  );

  const guardrails = (result.Items || []).map((item) => ({
    guardrail_id: item.guardrail_id,
    name: item.name,
    type: item.type,
    mode: item.mode,
    enabled: item.enabled,
    config: item.config || {},
    created_at: item.created_at,
    updated_at: item.updated_at || null,
  }));

  return jsonResponse(200, { guardrails });
}
