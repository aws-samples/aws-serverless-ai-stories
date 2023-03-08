import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput, StackProps } from 'aws-cdk-lib';
import { CfnAccessKey, User } from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

interface FrontEndStackProps extends StackProps {
  readonly generatedStoriesTableName: string;
}

export class AppRunnerApp extends cdk.Stack {
  public readonly applicationURL: CfnOutput;

  constructor(scope: Construct, id: string, props: FrontEndStackProps) {
    super(scope, id, props);

    const generatedStoriesTable = Table.fromTableName(this, 'generatedStories', props.generatedStoriesTableName);

    // Build the frontend application
    const imageAsset = new DockerImageAsset(this, 'ImageAssets', {
      directory: path.join(__dirname, '../../frontend'),
      // Fix for M1 macbooks, make sure we specify the build platform to use locally and in AWS
      platform: Platform.LINUX_AMD64,
    });

    // Create an IAM role to fetch container
    // https://docs.aws.amazon.com/ja_jp/apprunner/latest/dg/security_iam_service-with-iam.html
    const accessRole = new iam.Role(this, `${id}-iam-build-role`, {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
    });
    accessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ecr:BatchCheckLayerAvailability', 'ecr:BatchGetImage', 'ecr:DescribeImages', 'ecr:GetAuthorizationToken', 'ecr:GetDownloadUrlForLayer'],
        resources: ['*'],
      })
    );

    // Give the instance permission to read the DDB table holding the AI stories
    const instanceRole = new iam.Role(this, `${id}-instance-role`, {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:BatchGet*',
          'dynamodb:DescribeStream',
          'dynamodb:DescribeTable',
          'dynamodb:Get*',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:BatchWrite*',
          'dynamodb:CreateTable',
          'dynamodb:Delete*',
          'dynamodb:Update*',
          'dynamodb:PutItem',
        ],
        resources: [generatedStoriesTable.tableArn],
      })
    );

    // Create App Runner
    const app = new apprunner.CfnService(this, 'Service', {
      serviceName: `${id}-ai-stories`,

      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        autoDeploymentsEnabled: true,

        imageRepository: {
          imageIdentifier: imageAsset.imageUri,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '3000',
            runtimeEnvironmentVariables: [
              {
                name: 'TABLE_NAME',
                value: props.generatedStoriesTableName,
              },
              {
                name: 'REGION',
                value: this.region,
              },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        path: '/api/health',
      },
    });

    this.applicationURL = new cdk.CfnOutput(this, `${id}-app-runner-uri`, {
      value: `https://${app.attrServiceUrl}`,
    });
  }
}
