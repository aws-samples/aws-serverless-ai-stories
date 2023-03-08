import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { OutputFormat, PollyClient, SynthesizeSpeechCommand, VoiceId } from '@aws-sdk/client-polly';

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StoryGenerated {
  id: string;
  title: string;
  description: string;
  scene: string;
}

const dynamoClient = new DynamoDBClient({});
const s3Client = new S3Client({});
const pollyClient = new PollyClient({});

export async function handler(event: EventBridgeEvent<'StoryGenerated', StoryGenerated>) {
  // create the audio
  const data = await pollyClient.send(
    new SynthesizeSpeechCommand({
      OutputFormat: OutputFormat.MP3,
      Text: `This is a story called ${event.detail.title}. ${event.detail.description}`,
      VoiceId: VoiceId.Justin,
      SampleRate: '24000',
    })
  );

  const response = new Response(data.AudioStream as ReadableStream);
  const arrayBuffer = await response.arrayBuffer();

  // upload cloud formation data into public s3 bucket
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `stories/${event.detail.id}/audio.mp3`,
      Body: arrayBuffer as any,
      ContentEncoding: 'base64',
      Metadata: {
        'Content-Type': 'audio/mpeg',
      },
    })
  );

  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `stories/${event.detail.id}/audio.mp3`,
    }),
    {
      // two days
      expiresIn: 172800,
    }
  );

  // Write audio url to DDB
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: process.env.STORIES_TABLE,
      Key: {
        id: { S: event.detail.id },
      },
      UpdateExpression: 'SET audioURL = :audioURL',
      ExpressionAttributeValues: {
        ':audioURL': { S: url },
      },
    })
  );
}
