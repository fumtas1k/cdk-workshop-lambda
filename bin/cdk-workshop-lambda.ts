#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkWorkshopLambdaStack } from '../lib/cdk-workshop-lambda-stack';

const app = new cdk.App();
new CdkWorkshopLambdaStack(app, 'CdkWorkshopLambdaStack');
