import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly logsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Single-table DynamoDB
    this.table = new dynamodb.Table(this, 'LlmGwTable', {
      tableName: 'llmgw-keys',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoveryEnabled: true,
      timeToLiveAttribute: 'ttl',
    });

    // GSI for direct key lookup by hash
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1-KeyHash',
      partitionKey: { name: 'key_hash', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for team-level queries
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2-Team',
      partitionKey: { name: 'team_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // S3 bucket for logs/analytics (Firehose destination)
    this.logsBucket = new s3.Bucket(this, 'LlmGwLogs', {
      bucketName: `llmgw-logs-${this.account}-${this.region}`,
      lifecycleRules: [
        {
          id: 'archive-old-logs',
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
            { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(90) },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
  }
}
