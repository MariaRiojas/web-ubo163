import * as cdk from 'aws-cdk-lib'
import * as path from 'path'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import * as scheduler from 'aws-cdk-lib/aws-scheduler'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, applyTags } from '../config'

export interface ComputeScraperStackProps extends cdk.StackProps {
  config: ProjectConfig
  cgbvpCredentials: sm.Secret
  scraperSyncToken: sm.Secret
  dynamoTables: dynamodb.Table[]
  webSyncUrl: string
}

/**
 * Scraper CGBVP como Lambda container image + EventBridge Scheduler.
 *
 * Reemplaza la arquitectura ECS Fargate anterior.
 *
 * Un único Lambda que recibe { scraperType } en el evento y ejecuta
 * el scraper correspondiente. EventBridge Scheduler dispara cada función
 * con su propio cron y scraperType.
 *
 * Imagen Docker: scripts/scraper/Dockerfile.lambda
 * Handler:       scripts/scraper/lambda-handler.handler
 *
 * Nota: la imagen incluye Chromium via @sparticuz/chromium optimizado
 * para Lambda (sin restricciones de tamaño en container images).
 */
export class ComputeScraperStack extends cdk.Stack {
  public readonly scraperFunction: lambda.DockerImageFunction

  constructor(scope: Construct, id: string, props: ComputeScraperStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config, cgbvpCredentials, scraperSyncToken, dynamoTables, webSyncUrl } = props

    const repoRoot = path.resolve(__dirname, '../../../..')

    // ─────────────────────────────────────────────────────────────────────
    // Log group
    // ─────────────────────────────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'ScraperLogs', {
      logGroupName: `/aws/lambda/${resourceName(config, 'scraper')}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Lambda container image
    //
    // Usa Dockerfile.lambda en scripts/scraper/ que incluye:
    //   - @sparticuz/chromium (Chromium optimizado para Lambda)
    //   - puppeteer-core
    //   - Código del scraper + lib compartida
    //   - Lambda RIC vía imagen base public.ecr.aws/lambda/nodejs:20
    // ─────────────────────────────────────────────────────────────────────
    this.scraperFunction = new lambda.DockerImageFunction(this, 'ScraperFunction', {
      functionName: resourceName(config, 'scraper'),
      code: lambda.DockerImageCode.fromImageAsset(repoRoot, {
        file: 'scripts/scraper/Dockerfile.lambda',
        exclude: [
          '.next',
          'infra/cdk/node_modules',
          'infra/cdk/cdk.out',
          '*.log',
        ],
      }),
      memorySize: 1536,   // Chromium necesita ≥ 1 GB; 1536 MB es seguro
      timeout: cdk.Duration.minutes(5), // partes-cia puede tardar varios minutos
      logGroup,
      environment: {
        NODE_ENV: 'production',
        HEADLESS: '1',
        WEB_SYNC_URL: webSyncUrl,
        TABLE_PREFIX: config.resourcePrefix,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CGBVP_SECRET_ARN: cgbvpCredentials.secretArn,
        SCRAPER_TOKEN_SECRET_ARN: scraperSyncToken.secretArn,
      },
    })

    // Leer credenciales CGBVP y token de sync desde Secrets Manager
    cgbvpCredentials.grantRead(this.scraperFunction)
    scraperSyncToken.grantRead(this.scraperFunction)

    // Acceso full a las tablas DynamoDB (lee y escribe)
    for (const tbl of dynamoTables) {
      tbl.grantReadWriteData(this.scraperFunction)
    }

    // ─────────────────────────────────────────────────────────────────────
    // EventBridge Scheduler — un schedule por tipo de scraper
    // ─────────────────────────────────────────────────────────────────────
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      roleName: resourceName(config, 'scraper-scheduler-role'),
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    })
    this.scraperFunction.grantInvoke(schedulerRole)

    const scheduleGroup = new scheduler.CfnScheduleGroup(this, 'ScheduleGroup', {
      name: resourceName(config, 'scraper-schedules'),
    })

    const schedules: Array<{
      name: string
      scraperType: string
      cron: string
      description: string
    }> = [
      {
        name: 'estado-cia',
        scraperType: 'estado-cia',
        cron: 'cron(*/2 * * * ? *)',
        description: 'Estado de compañía cada 2 min',
      },
      {
        name: 'partes-cia',
        scraperType: 'partes-cia',
        cron: 'cron(*/15 * * * ? *)',
        description: 'Partes de emergencia cada 15 min',
      },
      {
        name: 'sgo',
        scraperType: 'sgo',
        cron: 'cron(*/5 * * * ? *)',
        description: 'Emergencias SGO Norte cada 5 min',
      },
      {
        name: 'asistencia-mensual',
        scraperType: 'asistencia-mensual',
        // Días 1-5 a las 3 AM Lima = 8 AM UTC
        cron: 'cron(0 8 1-5 * ? *)',
        description: 'Asistencia del mes anterior, días 1-5 a las 3 AM Lima',
      },
      {
        name: 'bomberos',
        scraperType: 'bomberos',
        // Día 1 a las 2 AM Lima = 7 AM UTC
        cron: 'cron(0 7 1 * ? *)',
        description: 'Padrón de bomberos mensual, día 1 a las 2 AM Lima',
      },
    ]

    for (const s of schedules) {
      new scheduler.CfnSchedule(this, `Schedule-${s.name}`, {
        name: resourceName(config, `scrape-${s.name}`),
        groupName: scheduleGroup.name!,
        description: s.description,
        flexibleTimeWindow: { mode: 'OFF' },
        scheduleExpression: s.cron,
        scheduleExpressionTimezone: 'UTC',
        state: 'ENABLED',
        target: {
          arn: this.scraperFunction.functionArn,
          roleArn: schedulerRole.roleArn,
          input: JSON.stringify({ scraperType: s.scraperType }),
          retryPolicy: {
            maximumRetryAttempts: 1,
            maximumEventAgeInSeconds: 300,
          },
        } as any,
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ScraperFunctionArn', {
      value: this.scraperFunction.functionArn,
      description: 'ARN de la Lambda del scraper',
    })
    new cdk.CfnOutput(this, 'InvokeExample', {
      value: `aws lambda invoke --function-name ${this.scraperFunction.functionName} --payload '{"scraperType":"bomberos"}' /tmp/out.json`,
      description: 'Ejemplo para invocar el scraper manualmente',
    })
  }
}
