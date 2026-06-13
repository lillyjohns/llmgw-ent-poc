import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  table: dynamodb.Table;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'LlmGwCluster', {
      vpc: props.vpc,
      containerInsights: true,
    });

    // Fargate service with ALB
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'LlmGwService', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('../../src/proxy'),
        containerPort: 4000,
        environment: {
          NODE_ENV: 'production',
          DYNAMODB_TABLE_NAME: props.table.tableName,
          AWS_REGION: this.region,
          LOG_LEVEL: 'info',
        },
      },
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      publicLoadBalancer: true,
      // ALB idle timeout for streaming
      idleTimeout: cdk.Duration.seconds(300),
    });

    // Grant Bedrock access
    service.taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess')
    );

    // Grant DynamoDB access
    props.table.grantReadWriteData(service.taskDefinition.taskRole);

    // Grant Secrets Manager access
    service.taskDefinition.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['*'], // Scope down in production
    }));

    // Auto-scaling
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 20,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    scaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup: service.targetGroup,
    });

    // Output ALB URL
    new cdk.CfnOutput(this, 'GatewayUrl', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
      description: 'LLM Gateway URL',
    });
  }
}
