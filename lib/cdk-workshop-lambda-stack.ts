import { Stack, StackProps } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EndpointType, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CdkWorkshopLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "privateSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'publicSubnet',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ],
    });

    // セキュリティグループ
    const ec2SecurityGroup = new ec2.SecurityGroup(this, "Ec2Sg", {
      vpc,
      allowAllOutbound: true
    });
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, "VpcEndpointSg", {
      vpc,
    });
    vpcEndpointSecurityGroup.addIngressRule(ec2SecurityGroup, ec2.Port.allTraffic());

    // IAMロール
    const ec2Role = new iam.Role(this, "ec2Role", {
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")],
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    // VPCエンドポイント
    const privateVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, "PrivateApiVpc", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [vpcEndpointSecurityGroup],
      open: false,
    });

    // API Gatewayポリシー
    const apiPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          principals: [new iam.AnyPrincipal],
          actions: ["execute-api:Invoke"],
          resources: ["execute-api:/*"],
          effect: iam.Effect.DENY,
          conditions: {
            StringNotEquals: {
              "aws:SourceVpce": privateVpcEndpoint.vpcEndpointId
            }
          }
        }),
        new iam.PolicyStatement({
          principals: [new iam.AnyPrincipal],
          actions: ["execute-api:Invoke"],
          resources: ["execute-api:/*"],
          effect: iam.Effect.ALLOW
        }),
      ]
    });

    // EC2インスタンス
    const ec2Instance = new ec2.Instance(this, "Ec2Instance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
      }),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
    });


    // lambdaの設定
    const lambda = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/hello.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_16_X,
    });

    // private API Gateway
    const privateApi = new LambdaRestApi(this, 'privateApi', {
      endpointTypes: [EndpointType.PRIVATE],
      handler: lambda,
      policy: apiPolicy,
    });
  }
}
