#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LlmGatewayStack } from '../lib/llmgw-stack';

const app = new cdk.App();

new LlmGatewayStack(app, 'LlmGatewayStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'LLM Gateway Enterprise POC - Serverless (Lambda + API GW + DynamoDB + S3/CloudFront)',
});
