import { EventBridgeEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 } from 'uuid';

interface StoryGenerated {
  id: string;
  title: string;
  description: string;
  scene: string;
}

const secretsClient = new SecretsManagerClient({});
const dynamoClient = new DynamoDBClient({});

export async function handler(event: EventBridgeEvent<'StoryGenerated', StoryGenerated>) {
  console.log('Triggered');

  const secret = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: 'replicate-api-key',
    })
  );

  if (!secret.SecretString) throw new Error('Failed to get replicate secret');

  const apiKey = JSON.parse(secret.SecretString)['replicate-api-key'];

  // POST request to Replicate to start the image restoration generation process
  let startResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Token ' + apiKey,
    },
    body: JSON.stringify({
      version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
      input: {
        prompt: event.detail.scene,
        image_dimensions: '512x512',
        num_outputs: 1,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        scheduler: 'DPMSolverMultistep',
      },
    }),
  });

  console.log('startResponse', startResponse);

  let jsonStartResponse = await startResponse.json();

  console.log('jsonStartResponse', jsonStartResponse)

  let endpointUrl = jsonStartResponse.urls.get;

  // GET request to get the status of the image restoration process & return the result when it's ready
  let image = null;
  while (!image) {
    // Loop in 1s intervals until the alt text is ready
    let finalResponse = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Token ' + apiKey,
      },
    });
    let jsonFinalResponse = await finalResponse.json();


    if (jsonFinalResponse.status === 'succeeded') {
      image = jsonFinalResponse.output;
    } else if (jsonFinalResponse.status === 'failed') {
      break;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('image', image)

  // Make a fetch to get the information and generate images
  // Get url and put onto the ddb item.

  //   // Insert new story into DDB
  //   await dynamoClient.send(
  //     new PutItemCommand({
  //       TableName: process.env.STORIES_TABLE,
  //       Item: marshall({
  //         id: v4(),
  //         title,
  //         characters,
  //         description,
  //         ttl: storyTTL,
  //         scene: selectedScene.description,
  //         createdAt: new Date().toISOString(),
  //       }),
  //     })
  //   );
}
