import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class LlmGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // 1. DynamoDB Table (single-table design)
    // ========================================
    const table = new dynamodb.Table(this, 'LlmGwTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // ========================================
    // 2. Lambda Function (Gateway)
    // ========================================
    // Lambda code: pre-built locally (npm ci && npx tsc in lambda-deploy/)
    // Includes: dist/, node_modules/, gateway-config.yaml
    const gatewayFn = new lambda.Function(this, 'LlmGwFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/lambda-handler.handler',
      code: lambda.Code.fromAsset('../lambda-deploy', {
        exclude: ['src', 'tsconfig.json', '*.ts', '.git'],
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        USE_DYNAMODB: 'true',
        MASTER_KEY: 'sk-llmgw-master', // TODO: move to Secrets Manager
        CONFIG_PATH: './gateway-config.yaml',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '', // Set via: export OPENROUTER_API_KEY=sk-or-...
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant Lambda access to DynamoDB (full CRUD + Scan)
    table.grantReadWriteData(gatewayFn);

    // Grant Lambda access to Bedrock
    gatewayFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // ========================================
    // 3. HTTP API Gateway
    // ========================================
    const httpApi = new apigatewayv2.HttpApi(this, 'LlmGwApi', {
      apiName: 'llmgw-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Default route → Lambda (catch-all)
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('LambdaIntegration', gatewayFn),
    });

    // Root path
    httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('LambdaRootIntegration', gatewayFn),
    });

    // ========================================
    // 4. S3 Bucket (Admin UI)
    // ========================================
    const uiBucket = new s3.Bucket(this, 'AdminUiBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ========================================
    // 5. CloudFront Distribution (Admin UI)
    // ========================================
    const distribution = new cloudfront.Distribution(this, 'AdminUiCdn', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(uiBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Deploy UI assets to S3
    new s3deploy.BucketDeployment(this, 'DeployUi', {
      sources: [s3deploy.Source.asset('../ui/out')],
      destinationBucket: uiBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'LLM Gateway API endpoint',
    });

    new cdk.CfnOutput(this, 'AdminUiUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Admin UI URL (CloudFront)',
    });

    new cdk.CfnOutput(this, 'DynamoDbTable', {
      value: table.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'LambdaFunction', {
      value: gatewayFn.functionName,
      description: 'Lambda function name',
    });
  }
}
