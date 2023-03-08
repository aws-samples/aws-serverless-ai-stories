import * as cdk from 'aws-cdk-lib';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DDBTables extends cdk.Stack {
  public readonly charactersTable: CfnOutput;
  public readonly scenesTable: CfnOutput;
  public readonly generatedStories: CfnOutput;
  public readonly generatedStoriesStreamArn: CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Table to store all characters
    const charactersTable = new Table(this, `${id}-AiStory-Characters`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: `${id}-AiStory-Characters`,
    });

    // Table to store all scenes
    const scenesTable = new Table(this, `${id}-AiStory-Scenes`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: `${id}-AiStory-Scenes`,
    });

    // Table to store generated stories
    const generatedStories = new Table(this, `${id}-AiStory-Stories`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: `${id}-AiStory-Stories`,
      timeToLiveAttribute: 'ttl',
      stream: StreamViewType.NEW_IMAGE,
    });

    this.charactersTable = new CfnOutput(this, 'CharactersTable', {
      value: charactersTable.tableName
    });
    this.scenesTable = new CfnOutput(this, 'ScenesTable', {
      value: scenesTable.tableName
    });
    this.generatedStories = new CfnOutput(this, 'GeneratedStories', {
      value: generatedStories.tableName
    });

    this.generatedStoriesStreamArn = new CfnOutput(this, 'GeneratedStoriesStreamArn', {
      value: generatedStories.tableStreamArn || ''
    });

  }
}
