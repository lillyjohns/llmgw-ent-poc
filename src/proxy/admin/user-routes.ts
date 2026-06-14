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

type UserRole = 'admin' | 'user' | 'viewer';

interface UserRecord {
  PK: string;
  SK: string;
  user_id: string;
  email?: string;
  role: UserRole;
  team_ids: string[];
  max_budget?: number;
  spend: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  blocked: boolean;
}

const AVAILABLE_ROLES: { role: UserRole; description: string }[] = [
  { role: 'admin', description: 'Can manage keys, teams, users, and all settings' },
  { role: 'user', description: 'Can use assigned models, view own spend' },
  { role: 'viewer', description: 'Read-only dashboard access' },
];

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

function generateUserId(): string {
  return `user-${crypto.randomBytes(6).toString('hex')}`;
}

// ============================================================
// User Management
// ============================================================

export async function userNew(body: Record<string, unknown>): Promise<AdminResponse> {
  const userId = (body.user_id as string) || generateUserId();
  const now = new Date().toISOString();

  const role = (body.role as UserRole) || 'user';
  if (!['admin', 'user', 'viewer'].includes(role)) {
    return jsonResponse(400, { error: { message: 'Invalid role. Must be admin, user, or viewer', type: 'invalid_request' } });
  }

  const record: UserRecord = {
    PK: `USER#${userId}`,
    SK: 'META',
    user_id: userId,
    email: (body.email as string) || undefined,
    role,
    team_ids: (body.team_ids as string[]) || [],
    max_budget: (body.max_budget as number) || undefined,
    spend: 0,
    metadata: (body.metadata as Record<string, unknown>) || undefined,
    created_at: now,
    blocked: false,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );

  return jsonResponse(200, {
    user_id: userId,
    email: record.email || null,
    role: record.role,
    team_ids: record.team_ids,
    max_budget: record.max_budget || null,
    spend: 0,
    metadata: record.metadata || {},
    blocked: false,
    created_at: now,
  });
}

export async function userInfo(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const userId = queryParams.user_id;
  if (!userId) {
    return jsonResponse(400, { error: { message: 'Missing required query parameter: user_id', type: 'invalid_request' } });
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'META' },
    })
  );

  if (!result.Item) {
    return jsonResponse(404, { error: { message: 'User not found', type: 'not_found' } });
  }

  const record = result.Item as UserRecord;
  return jsonResponse(200, {
    user_id: record.user_id,
    email: record.email || null,
    role: record.role,
    team_ids: record.team_ids || [],
    max_budget: record.max_budget || null,
    spend: record.spend || 0,
    metadata: record.metadata || {},
    blocked: record.blocked || false,
    created_at: record.created_at,
  });
}

export async function userUpdate(body: Record<string, unknown>): Promise<AdminResponse> {
  const userId = body.user_id as string;
  if (!userId) {
    return jsonResponse(400, { error: { message: 'Missing required field: user_id', type: 'invalid_request' } });
  }

  // Validate role if provided
  if (body.role !== undefined) {
    const role = body.role as string;
    if (!['admin', 'user', 'viewer'].includes(role)) {
      return jsonResponse(400, { error: { message: 'Invalid role. Must be admin, user, or viewer', type: 'invalid_request' } });
    }
  }

  const updateFields: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const allowedFields: Record<string, string> = {
    email: 'email',
    role: 'role',
    team_ids: 'team_ids',
    max_budget: 'max_budget',
    metadata: 'metadata',
    blocked: 'blocked',
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

  if (updateFields.length === 0) {
    return jsonResponse(400, { error: { message: 'No valid fields to update', type: 'invalid_request' } });
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'META' },
        UpdateExpression: `SET ${updateFields.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: { message: 'User not found', type: 'not_found' } });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'updated', user_id: userId });
}

export async function userDelete(body: Record<string, unknown>): Promise<AdminResponse> {
  const userId = body.user_id as string;
  if (!userId) {
    return jsonResponse(400, { error: { message: 'Missing required field: user_id', type: 'invalid_request' } });
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', user_id: userId });
}

export async function userList(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'USER#' },
    })
  );

  const users = (result.Items || []).map((item) => ({
    user_id: item.user_id,
    email: item.email || null,
    role: item.role,
    team_ids: item.team_ids || [],
    max_budget: item.max_budget || null,
    spend: item.spend || 0,
    metadata: item.metadata || {},
    blocked: item.blocked || false,
    created_at: item.created_at,
  }));

  return jsonResponse(200, { users });
}

export async function userAvailableRoles(): Promise<AdminResponse> {
  return jsonResponse(200, { roles: AVAILABLE_ROLES });
}
