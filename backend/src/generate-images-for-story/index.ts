import { EventBridgeEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StoryGenerated {
  id: string;
  title: string;
  description: string;
  scene: string;
}

const secretsClient = new SecretsManagerClient({});
const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

export async function handler(event: EventBridgeEvent<'StoryGenerated', StoryGenerated>) {

  const secret = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: 'open-api-key',
    })
  );

  if (!secret.SecretString) throw new Error('Failed to get replicate secret');

  const apiKey = JSON.parse(secret.SecretString)['open-api-key'];

  // Request to create an image for the story.
  let response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      prompt: event.detail.scene,
      n: 1,
      size: '256x256',
    }),
  });

  const data = await response.json();
  const images = data.data.map((item: any) => item.url);

  // Get the image that was just genearted
  const imageAsBlog = await fetch(images[0]);
  const imageAsBuffer = await imageAsBlog.arrayBuffer();

  // Add image to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `stories/${event.detail.id}/image.png`,
      Body: imageAsBuffer as any,
      ContentEncoding: 'base64',
      Metadata: {
        'Content-Type': 'image/png',
      },
    })
  );

  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `stories/${event.detail.id}/image.png`,
    }),
    {
      // two days
      expiresIn: 172800,
    }
  );

  // Add thumbnail to the story
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: process.env.STORIES_TABLE,
      Key: {
        id: { S: event.detail.id },
      },
      UpdateExpression: 'SET thumbnail = :thumbnail',
      ExpressionAttributeValues: {
        ':thumbnail': { S: url },
      },
    })
  );

}
