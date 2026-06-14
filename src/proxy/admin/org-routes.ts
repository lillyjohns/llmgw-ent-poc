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

interface OrgRecord {
  PK: string;
  SK: string;
  org_id: string;
  org_alias: string;
  max_budget?: number;
  spend: number;
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

function generateOrgId(): string {
  return `org-${crypto.randomBytes(6).toString('hex')}`;
}

// ============================================================
// Organization Management
// ============================================================

export async function orgNew(body: Record<string, unknown>): Promise<AdminResponse> {
  const orgId = (body.org_id as string) || generateOrgId();
  const now = new Date().toISOString();

  const record: OrgRecord = {
    PK: `ORG#${orgId}`,
    SK: 'META',
    org_id: orgId,
    org_alias: (body.org_alias as string) || orgId,
    max_budget: (body.max_budget as number) || undefined,
    spend: 0,
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
    org_id: orgId,
    org_alias: record.org_alias,
    max_budget: record.max_budget || null,
    spend: 0,
    metadata: record.metadata || {},
    created_at: now,
  });
}

export async function orgInfo(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const orgId = queryParams.org_id;
  if (!orgId) {
    return jsonResponse(400, { error: { message: 'Missing required query parameter: org_id', type: 'invalid_request' } });
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ORG#${orgId}`, SK: 'META' },
    })
  );

  if (!result.Item) {
    return jsonResponse(404, { error: { message: 'Organization not found', type: 'not_found' } });
  }

  const record = result.Item as OrgRecord;
  return jsonResponse(200, {
    org_id: record.org_id,
    org_alias: record.org_alias,
    max_budget: record.max_budget || null,
    spend: record.spend || 0,
    metadata: record.metadata || {},
    created_at: record.created_at,
  });
}

export async function orgUpdate(body: Record<string, unknown>): Promise<AdminResponse> {
  const orgId = body.org_id as string;
  if (!orgId) {
    return jsonResponse(400, { error: { message: 'Missing required field: org_id', type: 'invalid_request' } });
  }

  const updateFields: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const allowedFields: Record<string, string> = {
    org_alias: 'org_alias',
    max_budget: 'max_budget',
    metadata: 'metadata',
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
        Key: { PK: `ORG#${orgId}`, SK: 'META' },
        UpdateExpression: `SET ${updateFields.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: { message: 'Organization not found', type: 'not_found' } });
    }
    throw err;
  }

  return jsonResponse(200, { status: 'updated', org_id: orgId });
}

export async function orgDelete(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const orgId = queryParams.org_id;
  if (!orgId) {
    return jsonResponse(400, { error: { message: 'Missing required query parameter: org_id', type: 'invalid_request' } });
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ORG#${orgId}`, SK: 'META' },
    })
  );

  return jsonResponse(200, { status: 'deleted', org_id: orgId });
}

export async function orgList(): Promise<AdminResponse> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'ORG#' },
    })
  );

  const orgs = (result.Items || []).map((item) => ({
    org_id: item.org_id,
    org_alias: item.org_alias,
    max_budget: item.max_budget || null,
    spend: item.spend || 0,
    metadata: item.metadata || {},
    created_at: item.created_at,
  }));

  return jsonResponse(200, { organizations: orgs });
}

export async function orgMembers(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const orgId = queryParams.org_id;
  if (!orgId) {
    return jsonResponse(400, { error: { message: 'Missing required query parameter: org_id', type: 'invalid_request' } });
  }

  // Verify org exists
  const orgResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ORG#${orgId}`, SK: 'META' },
    })
  );

  if (!orgResult.Item) {
    return jsonResponse(404, { error: { message: 'Organization not found', type: 'not_found' } });
  }

  // Find teams in this org
  const teamResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND org_id = :orgId',
      ExpressionAttributeValues: { ':prefix': 'TEAM#', ':orgId': orgId },
    })
  );

  const teams = (teamResult.Items || []).map((item) => ({
    team_id: item.team_id,
    team_alias: item.team_alias,
    spend: item.spend || 0,
  }));

  // Find users that belong to teams in this org
  const teamIds = teams.map((t) => t.team_id);

  // Also scan users to find those with team_ids overlapping with org teams
  const userResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'USER#' },
    })
  );

  const users = (userResult.Items || [])
    .filter((item) => {
      const userTeamIds = item.team_ids as string[] || [];
      return userTeamIds.some((tid: string) => teamIds.includes(tid));
    })
    .map((item) => ({
      user_id: item.user_id,
      email: item.email || null,
      role: item.role,
      team_ids: item.team_ids || [],
    }));

  return jsonResponse(200, {
    org_id: orgId,
    teams,
    users,
    total_teams: teams.length,
    total_users: users.length,
  });
}
