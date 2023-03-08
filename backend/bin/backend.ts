#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as config from '../../config.json';
import { DDBTables } from '../lib/ddb-tables';
import { BackendStack } from '../lib/backend';
import { AppRunnerApp } from '../lib/frontend';

const app = new cdk.App();

// Create all the DDB tables required for the application
const aiStoriesTables = new DDBTables(app, `${config.stage}-aiStoriesTables`);

// Create front end application that is hosted in app runner.
const frontEndApplication = new AppRunnerApp(app, `${config.stage}-webStack`, {
    generatedStoriesTableName: aiStoriesTables.generatedStories.value,
});

// Create EDA application that generates stories
new BackendStack(app, `${config.stage}-aiStoriesBackend`, {
  charactersTable: aiStoriesTables.charactersTable.value,
  scenesTable: aiStoriesTables.scenesTable.value,
  generatedStoriesTable: aiStoriesTables.generatedStories.value,
  generatedStoriesStreamArn: aiStoriesTables.generatedStoriesStreamArn.value,
  frontEndURL: frontEndApplication.applicationURL.value
});
