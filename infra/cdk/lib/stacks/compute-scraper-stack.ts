import * as cdk from 'aws-cdk-lib'
import * as path from 'path'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as scheduler from 'aws-cdk-lib/aws-scheduler'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, applyTags } from '../config'

export interface ComputeScraperStackProps extends cdk.StackProps {
  config: ProjectConfig
  vpc: ec2.IVpc
  proxy: rds.DatabaseProxy
  proxySecurityGroup: ec2.SecurityGroup
  dbCredentialsSecret: sm.ISecret
  cgbvpCredentials: sm.Secret
  scraperSyncToken: sm.Secret
}

/**
 * ECS Fargate (Spot) + EventBridge Scheduler para los 5 scrapers.
 *
 * Un único Task Definition parametrizado por SCRAPER_TYPE.
 * EventBridge invoca `RunTask` con container override para setear la env.
 */
export class ComputeScraperStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster
  public readonly taskDefinition: ecs.FargateTaskDefinition
  public readonly image: ecs.ContainerImage

  constructor(scope: Construct, id: string, props: ComputeScraperStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const {
      config,
      vpc,
      proxy,
      proxySecurityGroup,
      dbCredentialsSecret,
      cgbvpCredentials,
      scraperSyncToken,
    } = props

    // SG propio de las tasks del scraper
    const scraperSecurityGroup = new ec2.SecurityGroup(this, 'ScraperSecurityGroup', {
      vpc,
      securityGroupName: resourceName(config, 'scraper-sg'),
      description: 'SG de tasks Fargate del scraper. Egress a internet.',
      allowAllOutbound: true,
    })

    // Ingress al proxy desde el scraperSG.
    // Usamos CfnSecurityGroupIngress explícito en este stack (scraper) para
    // evitar que CDK emita la regla en el stack dueño del proxySG (database),
    // lo que generaría un ciclo database ↔ scraper.
    new ec2.CfnSecurityGroupIngress(this, 'ProxyIngressFromScraper', {
      groupId: proxySecurityGroup.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      sourceSecurityGroupId: scraperSecurityGroup.securityGroupId,
      description: 'Desde tasks Fargate del scraper',
    })

    const repoRoot = path.resolve(__dirname, '../../../..')

    // ─────────────────────────────────────────────────────────────────────
    // ECS Cluster
    // ─────────────────────────────────────────────────────────────────────
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: resourceName(config, 'scraper'),
      vpc,
      containerInsights: false, // dev: ahorra costo
      enableFargateCapacityProviders: true,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Docker image — build del Dockerfile del repo
    // Context: raíz del repo (necesita acceso a lib/, scripts/, package.json)
    // ─────────────────────────────────────────────────────────────────────
    const dockerImage = new ecr_assets.DockerImageAsset(this, 'ScraperImage', {
      directory: repoRoot,
      file: 'scripts/scraper/Dockerfile',
      platform: ecr_assets.Platform.LINUX_AMD64,
      exclude: [
        '.next',
        'node_modules',
        '.git',
        'cdk.out',
        'infra/cdk/node_modules',
        'infra/cdk/cdk.out',
        '*.log',
      ],
    })

    this.image = ecs.ContainerImage.fromDockerImageAsset(dockerImage)

    // ─────────────────────────────────────────────────────────────────────
    // Task roles
    //
    // executionRole: tira la imagen de ECR + escribe logs a CW + lee secretos
    //                en la fase de arranque del container.
    //
    // taskRole:      permisos del código mientras corre (incluye firmar
    //                requests a /api/sync pero eso usa el token, no IAM).
    // ─────────────────────────────────────────────────────────────────────

    const taskRole = new iam.Role(this, 'TaskRole', {
      roleName: resourceName(config, 'scraper-task-role'),
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role que asume el contenedor del scraper en runtime',
    })
    // El scraper no necesita permisos AWS — los secretos se inyectan como
    // env y la API /api/sync se autentica con token. Por eso el taskRole
    // queda sin policies adicionales.

    // ─────────────────────────────────────────────────────────────────────
    // Log group compartido (todos los scrapers escriben acá)
    // ─────────────────────────────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'ScraperLogs', {
      logGroupName: `/aws/ecs/${resourceName(config, 'scraper')}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Task Definition
    //
    // Una sola task definition con defaults razonables.
    // EventBridge Scheduler sobreescribe SCRAPER_TYPE y opcionalmente cpu/memory.
    // ─────────────────────────────────────────────────────────────────────
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'ScraperTaskDef', {
      family: resourceName(config, 'scraper'),
      cpu: 512, // 0.5 vCPU — suficiente para puppeteer estándar; partes-cia puede pedir más
      memoryLimitMiB: 1024, // 1 GB
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
      taskRole,
    })

    this.taskDefinition.addContainer('scraper', {
      containerName: 'scraper',
      image: this.image,
      essential: true,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'scraper',
        logGroup,
      }),
      // Variables no-sensibles: las setea EventBridge por task
      environment: {
        NODE_ENV: 'production',
        HEADLESS: '1',
        WEB_SYNC_URL: 'https://placeholder.cloudfront.net/api/sync',
        // DATABASE_URL se construye en runtime desde DB_SECRET, ver abajo.
        // Para el piloto vamos a inyectarla directo como secret+template.
      },
      // Secretos inyectados como env vars
      //   Valores legibles en runtime vía process.env.*
      secrets: {
        // db-credentials tiene structure {username,password,engine,host,port,dbname}
        // Armamos DATABASE_URL usando el campo password + el ProxyEndpoint
        // via escape: el secret expone password, la app arma la URL.
        // Alternativa más simple: exponer host/user/pass como separados
        // y dejar que el código arme DATABASE_URL. Acá usamos esa opción.
        DB_USER: ecs.Secret.fromSecretsManager(dbCredentialsSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbCredentialsSecret, 'password'),
        USUARIO_INTRANET: ecs.Secret.fromSecretsManager(cgbvpCredentials, 'USUARIO_INTRANET'),
        CONTRASENA_INTRANET: ecs.Secret.fromSecretsManager(cgbvpCredentials, 'CONTRASENA_INTRANET'),
        SCRAPPER_SYNC_SECRET: ecs.Secret.fromSecretsManager(scraperSyncToken, 'SCRAPPER_SYNC_SECRET'),
      },
    })

    // Inyectamos DATABASE_URL como env var derivada en el docker-entrypoint
    // o en el código. Acá la seteamos como env con el endpoint del Proxy y
    // el script arma la URL en runtime con DB_USER y DB_PASSWORD.
    // Modificamos el container con addEnvironment:
    const containerDef = this.taskDefinition.defaultContainer!
    containerDef.addEnvironment('DB_HOST', proxy.endpoint)
    containerDef.addEnvironment('DB_PORT', '5432')
    containerDef.addEnvironment('DB_NAME', 'cuartel_crm')

    // ─────────────────────────────────────────────────────────────────────
    // EventBridge Schedules — uno por tipo de scraper
    //
    // Usamos la nueva API aws-scheduler (más flexible que Rules de Events)
    // porque permite pasar ECS Task target con overrides.
    // ─────────────────────────────────────────────────────────────────────

    // Role que Scheduler asume para invocar ECS RunTask
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      roleName: resourceName(config, 'scraper-scheduler-role'),
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    })
    this.taskDefinition.grantRun(schedulerRole)
    // Permiso adicional para pasar el task role
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [
          this.taskDefinition.taskRole.roleArn,
          this.taskDefinition.executionRole!.roleArn,
        ],
      })
    )

    // Subnet IDs para las tasks — con NAT Gateway disponible en VPC001,
    // corremos en subnets privadas (SUBPRIVZA001-004, SUBPRIVZC001-004).
    // La salida a CGBVP e internet va por el NAT Gateway compartido.
    // Sin IP pública por task (más seguro, no cuesta EIP).
    const scraperSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    })

    const baseTarget = (scraperType: string) => ({
      arn: this.cluster.clusterArn,
      roleArn: schedulerRole.roleArn,
      ecsParameters: {
        taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
        launchType: 'FARGATE',
        // Spot: ahorra ~70%. Si el task es interrumpido, EventBridge no
        // reintenta automáticamente; el próximo cron lo recupera.
        capacityProviderStrategy: [
          { capacityProvider: 'FARGATE_SPOT', weight: 1 },
        ],
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: scraperSubnets.subnetIds,
            securityGroups: [scraperSecurityGroup.securityGroupId],
            assignPublicIp: 'DISABLED',
          },
        },
        platformVersion: 'LATEST',
      },
      input: JSON.stringify({
        containerOverrides: [
          {
            name: 'scraper',
            environment: [
              { name: 'SCRAPER_TYPE', value: scraperType },
            ],
          },
        ],
      }),
    })

    // Cron expressions — hora UTC (America/Lima es UTC-5)
    const schedules: Array<{
      name: string
      type: string
      cron: string
      description: string
    }> = [
      {
        name: 'estado-cia',
        type: 'estado-cia',
        cron: 'cron(*/2 * * * ? *)',
        description: 'Estado de compañía cada 2 min',
      },
      {
        name: 'partes-cia',
        type: 'partes-cia',
        cron: 'cron(*/15 * * * ? *)',
        description: 'Partes de emergencia cada 15 min',
      },
      {
        name: 'sgo',
        type: 'sgo',
        cron: 'cron(*/5 * * * ? *)',
        description: 'Emergencias SGO Norte cada 5 min',
      },
      {
        name: 'asistencia-mensual',
        type: 'asistencia-mensual',
        // Días 1-5 a las 3 AM Lima = 8 AM UTC
        cron: 'cron(0 8 1-5 * ? *)',
        description: 'Asistencia del mes anterior, días 1-5 a las 3 AM Lima',
      },
      {
        name: 'bomberos',
        type: 'bomberos',
        // Día 1 a las 2 AM Lima = 7 AM UTC
        cron: 'cron(0 7 1 * ? *)',
        description: 'Padrón de bomberos mensual, día 1 a las 2 AM Lima',
      },
    ]

    const scheduleGroup = new scheduler.CfnScheduleGroup(this, 'ScheduleGroup', {
      name: resourceName(config, 'scraper-schedules'),
    })

    for (const s of schedules) {
      new scheduler.CfnSchedule(this, `Schedule-${s.name}`, {
        name: resourceName(config, `scrape-${s.name}`),
        groupName: scheduleGroup.name!,
        description: s.description,
        flexibleTimeWindow: { mode: 'OFF' },
        scheduleExpression: s.cron,
        scheduleExpressionTimezone: 'UTC',
        state: 'ENABLED',
        target: baseTarget(s.type) as any,
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ClusterArn', { value: this.cluster.clusterArn })
    new cdk.CfnOutput(this, 'TaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
    })
    new cdk.CfnOutput(this, 'ImageUri', { value: dockerImage.imageUri })
    new cdk.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName })
    new cdk.CfnOutput(this, 'RunTaskExample', {
      value:
        `aws ecs run-task --cluster ${this.cluster.clusterName} ` +
        `--task-definition ${this.taskDefinition.family} ` +
        `--launch-type FARGATE --overrides '{"containerOverrides":[{"name":"scraper","environment":[{"name":"SCRAPER_TYPE","value":"bomberos"}]}]}'`,
      description: 'Comando para correr scraper manualmente',
    })
  }
}
