#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { loadConfig } from '../lib/config'
import { NetworkStack } from '../lib/stacks/network-stack'
import { SecretsStack } from '../lib/stacks/secrets-stack'
import { StorageStack } from '../lib/stacks/storage-stack'
import { DatabaseStack } from '../lib/stacks/database-stack'
import { ComputeAppStack } from '../lib/stacks/compute-app-stack'
import { ComputeScraperStack } from '../lib/stacks/compute-scraper-stack'
import { ObservabilityStack } from '../lib/stacks/observability-stack'

const app = new cdk.App()
const config = loadConfig(app)

// Environment común a todos los stacks
const env: cdk.Environment = {
  account:
    config.account ||
    process.env.CDK_DEFAULT_ACCOUNT ||
    // Fallback para cdk synth offline (ej. CI sin creds): usar un placeholder.
    // En deploy real, CDK siempre toma el account del perfil AWS configurado.
    '000000000000',
  region: config.region,
}

const stackPrefix = config.resourcePrefix

// ────────────────────────────────────────────────────────────────
// Stack 1: Network — importa VPC existente + SGs
// ────────────────────────────────────────────────────────────────
const networkStack = new NetworkStack(app, `${stackPrefix}-network`, {
  env,
  description: 'VPC importada + Security Groups de UBO163 dev',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 2: Secrets — secretos de la app
// ────────────────────────────────────────────────────────────────
const secretsStack = new SecretsStack(app, `${stackPrefix}-secrets`, {
  env,
  description: 'Secrets Manager: app-secrets, scraper-sync, cgbvp-credentials, ses-smtp',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 3: Storage — bucket S3 media
// ────────────────────────────────────────────────────────────────
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, {
  env,
  description: 'Bucket S3 para avatars, incidents, inventory docs',
  config,
})

// ────────────────────────────────────────────────────────────────
// Stack 4: Database — RDS Postgres + Proxy (crea SGs internos)
// ────────────────────────────────────────────────────────────────
const databaseStack = new DatabaseStack(app, `${stackPrefix}-database`, {
  env,
  description: 'RDS Postgres 15 t4g.micro + RDS Proxy + SGs de DB',
  config,
  vpc: networkStack.vpc,
})

// ────────────────────────────────────────────────────────────────
// Stack 5: Compute App — Lambda Next.js + CloudFront + static bucket
// ────────────────────────────────────────────────────────────────
const computeAppStack = new ComputeAppStack(app, `${stackPrefix}-compute-app`, {
  env,
  description: 'Lambda Next.js (Web Adapter) + CloudFront + S3 static',
  config,
  mediaBucket: storageStack.mediaBucket,
  proxy: databaseStack.proxy,
  dbCredentialsSecret: databaseStack.credentialsSecret,
  appSecrets: secretsStack.appSecrets,
  scraperSyncToken: secretsStack.scraperSyncToken,
  sesSmtpCredentials: secretsStack.sesSmtpCredentials,
})

// ────────────────────────────────────────────────────────────────
// Stack 6: Compute Scraper — ECS Fargate + EventBridge Schedules
// ────────────────────────────────────────────────────────────────
const computeScraperStack = new ComputeScraperStack(
  app,
  `${stackPrefix}-compute-scraper`,
  {
    env,
    description: 'ECS Fargate + 5 EventBridge Schedules para scrapers CGBVP',
    config,
    vpc: networkStack.vpc,
    proxy: databaseStack.proxy,
    proxySecurityGroup: databaseStack.proxySecurityGroup,
    dbCredentialsSecret: databaseStack.credentialsSecret,
    cgbvpCredentials: secretsStack.cgbvpCredentials,
    scraperSyncToken: secretsStack.scraperSyncToken,
  }
)

// ────────────────────────────────────────────────────────────────
// Stack 7: Observability — dashboard + alarmas
// ────────────────────────────────────────────────────────────────
new ObservabilityStack(app, `${stackPrefix}-observability`, {
  env,
  description: 'CloudWatch dashboard + 3 alarmas (Lambda, RDS, Scraper)',
  config,
  lambdaFunction: computeAppStack.lambdaFunction,
  rdsInstance: databaseStack.instance,
  ecsCluster: computeScraperStack.cluster,
  distribution: computeAppStack.distribution,
})

// Tags globales
for (const [key, value] of Object.entries(config.tags)) {
  cdk.Tags.of(app).add(key, value)
}
