import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({
  region: process.env.REGION
});

export const getStory = async (id: string) => {
  try {
    const { Item: story } = await client.send(
      new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          id
        }),
      })
    );

    if (story) {
      return unmarshall(story);
    } else {
      return null;
    }
  } catch (error) {
    console.log('error', error);
    return null;
  }
};
