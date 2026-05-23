#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { loadConfig } from '../lib/config'
import { SecretsStack } from '../lib/stacks/secrets-stack'
import { StorageStack } from '../lib/stacks/storage-stack'
import { DynamoStack } from '../lib/stacks/dynamo-stack'
import { ComputeAppStack } from '../lib/stacks/compute-app-stack'
import { ComputeScraperStack } from '../lib/stacks/compute-scraper-stack'
import { ObservabilityStack } from '../lib/stacks/observability-stack'

const app = new cdk.App()
const config = loadConfig(app)

const env: cdk.Environment = {
  account:
    config.account ||
    process.env.CDK_DEFAULT_ACCOUNT ||
    '000000000000',
  region: config.region,
}

const stackPrefix = config.resourcePrefix

// ────────────────────────────────────────────────────────────────
// Stack 1: Secrets — secretos de la app
// ────────────────────────────────────────────────────────────────
const secretsStack = new SecretsStack(app, `${stackPrefix}-secrets`, {
  env,
  description: 'Secrets Manager: app-secrets, scraper-sync, cgbvp-credentials, ses-smtp',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 2: Storage — bucket S3 media
// ────────────────────────────────────────────────────────────────
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, {
  env,
  description: 'Bucket S3 para avatars, incidents, inventory docs',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 3: DynamoDB — todas las tablas (reemplaza RDS)
// ────────────────────────────────────────────────────────────────
const dynamoStack = new DynamoStack(app, `${stackPrefix}-dynamo`, {
  env,
  description: 'Tablas DynamoDB PAY_PER_REQUEST — sin servidor, costo por uso',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 4: Compute App — Lambda Next.js + CloudFront + static bucket
// ────────────────────────────────────────────────────────────────
const computeAppStack = new ComputeAppStack(app, `${stackPrefix}-compute-app`, {
  env,
  description: 'Lambda Next.js (Web Adapter) + CloudFront + S3 static',
  config,
  mediaBucket: storageStack.mediaBucket,
  appSecrets: secretsStack.appSecrets,
  scraperSyncToken: secretsStack.scraperSyncToken,
  sesSmtpCredentials: secretsStack.sesSmtpCredentials,
  dynamoTables: dynamoStack.allTables,
})

// ────────────────────────────────────────────────────────────────
// Stack 5: Compute Scraper — Lambda container + EventBridge Schedules
// ────────────────────────────────────────────────────────────────
const computeScraperStack = new ComputeScraperStack(app, `${stackPrefix}-compute-scraper`, {
  env,
  description: 'Lambda container (Chromium) + 5 EventBridge Schedules para scrapers CGBVP',
  config,
  cgbvpCredentials: secretsStack.cgbvpCredentials,
  scraperSyncToken: secretsStack.scraperSyncToken,
  dynamoTables: dynamoStack.allTables,
  webSyncUrl: `https://${computeAppStack.distribution.distributionDomainName}/api/sync`,
})

// ────────────────────────────────────────────────────────────────
// Stack 6: Observability — dashboard + alarmas
// ────────────────────────────────────────────────────────────────
new ObservabilityStack(app, `${stackPrefix}-observability`, {
  env,
  description: 'CloudWatch dashboard + alarmas (Lambda web + scraper + CloudFront)',
  config,
  webFunction: computeAppStack.lambdaFunction,
  scraperFunction: computeScraperStack.scraperFunction,
  distribution: computeAppStack.distribution,
})

// Tags globales
for (const [key, value] of Object.entries(config.tags)) {
  cdk.Tags.of(app).add(key, value)
}
