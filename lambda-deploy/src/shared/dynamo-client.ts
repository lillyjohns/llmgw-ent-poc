import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'llmgw-keys';

export async function putItem(pk: string, sk: string, attributes: Record<string, any>) {
  return docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: { PK: pk, SK: sk, ...attributes },
  }));
}

export async function getItem(pk: string, sk: string) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  }));
  return result.Item;
}

export async function queryItems(pk: string, skPrefix?: string) {
  const params: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? 'PK = :pk AND begins_with(SK, :sk)'
      : 'PK = :pk',
    ExpressionAttributeValues: { ':pk': pk, ...(skPrefix && { ':sk': skPrefix }) },
  };

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

export async function deleteItem(pk: string, sk: string) {
  return docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  }));
}
