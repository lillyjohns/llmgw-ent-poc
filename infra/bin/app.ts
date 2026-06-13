#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DataStack } from '../lib/data-stack';
import { ComputeStack } from '../lib/compute-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const network = new NetworkStack(app, 'LlmGwNetwork', { env });
const data = new DataStack(app, 'LlmGwData', { env });
const compute = new ComputeStack(app, 'LlmGwCompute', {
  env,
  vpc: network.vpc,
  table: data.table,
});
