const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const characters = require('../data/characters.json');
const scenes = require('../data/scenes.json');
const config = require('../../config.json');

const client = new DynamoDBClient({});

const insertIntoDDB = async () => {
  // insert characters
  await client.send(
    new BatchWriteItemCommand({
      RequestItems: {
        [`${config.stage}-aiStoriesTables-AiStory-Characters`]: characters.map((character) => ({
          PutRequest: {
            Item: marshall(character),
          },
        })),
      },
    })
  );

  // insert scenes
  await client.send(
    new BatchWriteItemCommand({
      RequestItems: {
        [`${config.stage}-aiStoriesTables-AiStory-Scenes`]: scenes.map((scene) => ({
          PutRequest: {
            Item: marshall(scene),
          },
        })),
      },
    })
  );
};

insertIntoDDB();
