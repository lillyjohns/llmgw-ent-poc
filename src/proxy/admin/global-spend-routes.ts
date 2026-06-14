import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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

interface SpendReportBreakdown {
  group: string;
  spend: number;
  requests: number;
  tokens: number;
}

interface SpendReport {
  total_spend: number;
  period: { start: string; end: string };
  breakdown: SpendReportBreakdown[];
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

// ============================================================
// Global Spend Reports
// ============================================================

export async function globalSpendReport(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const startDate = queryParams.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const endDate = queryParams.end_date || new Date().toISOString().split('T')[0];
  const groupBy = queryParams.group_by || 'team'; // team | model | user

  let breakdown: SpendReportBreakdown[] = [];

  switch (groupBy) {
    case 'team': {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'TEAM#' },
        })
      );
      breakdown = (result.Items || []).map((item) => ({
        group: item.team_alias || item.team_id,
        spend: item.spend || 0,
        requests: item.total_requests || 0,
        tokens: item.total_tokens || 0,
      }));
      break;
    }
    case 'model': {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'MODEL#' },
        })
      );
      breakdown = (result.Items || []).map((item) => ({
        group: item.model_name || item.model_id,
        spend: item.spend || 0,
        requests: item.total_requests || 0,
        tokens: item.total_tokens || 0,
      }));
      break;
    }
    case 'user': {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'USER#' },
        })
      );
      breakdown = (result.Items || []).map((item) => ({
        group: item.email || item.user_id,
        spend: item.spend || 0,
        requests: item.total_requests || 0,
        tokens: item.total_tokens || 0,
      }));
      break;
    }
    default:
      return jsonResponse(400, { error: { message: 'Invalid group_by value. Must be team, model, or user', type: 'invalid_request' } });
  }

  // Filter out zero-spend entries and sort descending
  breakdown = breakdown
    .filter((b) => b.spend > 0 || b.requests > 0)
    .sort((a, b) => b.spend - a.spend);

  const totalSpend = breakdown.reduce((sum, b) => sum + b.spend, 0);

  const report: SpendReport = {
    total_spend: Math.round(totalSpend * 100) / 100,
    period: { start: startDate, end: endDate },
    breakdown,
  };

  return jsonResponse(200, report);
}

export async function globalSpendProvider(): Promise<AdminResponse> {
  // Aggregate spend by provider from keys/models
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'KEY#' },
    })
  );

  // Group keys by their model providers
  // In practice, spend tracking per provider would come from usage logs
  // For now, aggregate from key spend grouped by a provider field
  const providerMap: Record<string, { spend: number; requests: number; tokens: number }> = {};

  for (const item of result.Items || []) {
    const provider = (item.provider as string) || 'unknown';
    if (!providerMap[provider]) {
      providerMap[provider] = { spend: 0, requests: 0, tokens: 0 };
    }
    providerMap[provider].spend += item.spend || 0;
    providerMap[provider].requests += item.total_requests || 0;
    providerMap[provider].tokens += item.total_tokens || 0;
  }

  const providers = Object.entries(providerMap).map(([provider, data]) => ({
    provider,
    spend: Math.round(data.spend * 100) / 100,
    requests: data.requests,
    tokens: data.tokens,
  }));

  return jsonResponse(200, {
    providers: providers.sort((a, b) => b.spend - a.spend),
    total_spend: Math.round(providers.reduce((sum, p) => sum + p.spend, 0) * 100) / 100,
  });
}

export async function globalActivity(queryParams: Record<string, string | undefined>): Promise<AdminResponse> {
  const granularity = queryParams.granularity || 'day'; // hour | day

  // Scan usage/activity records
  // In a real implementation, this would query a dedicated ACTIVITY# partition
  // For now, scan all keys and summarize by created_at date
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'KEY#' },
    })
  );

  const activityMap: Record<string, { requests: number; tokens: number; spend: number }> = {};

  for (const item of result.Items || []) {
    const createdAt = item.created_at as string;
    if (!createdAt) continue;

    let bucket: string;
    if (granularity === 'hour') {
      bucket = createdAt.substring(0, 13); // YYYY-MM-DDTHH
    } else {
      bucket = createdAt.substring(0, 10); // YYYY-MM-DD
    }

    if (!activityMap[bucket]) {
      activityMap[bucket] = { requests: 0, tokens: 0, spend: 0 };
    }
    activityMap[bucket].requests += item.total_requests || 1;
    activityMap[bucket].tokens += item.total_tokens || 0;
    activityMap[bucket].spend += item.spend || 0;
  }

  const activity = Object.entries(activityMap)
    .map(([period, data]) => ({
      period,
      requests: data.requests,
      tokens: data.tokens,
      spend: Math.round(data.spend * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return jsonResponse(200, {
    granularity,
    activity,
    total_requests: activity.reduce((sum, a) => sum + a.requests, 0),
    total_tokens: activity.reduce((sum, a) => sum + a.tokens, 0),
    total_spend: Math.round(activity.reduce((sum, a) => sum + a.spend, 0) * 100) / 100,
  });
}
