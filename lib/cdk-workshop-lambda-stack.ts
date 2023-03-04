import { Stack, StackProps } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class CdkWorkshopLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambdaの設定
    const lambda = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/hello.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_16_X,
    });

    // api gatewayの設定
    const api = new LambdaRestApi(this, 'RestAPI', {
      handler: lambda,
      proxy: false,
    });
    const hello = api.root.addResource('cdk-workshop-lambda');
    hello.addMethod('GET');
  }
}
