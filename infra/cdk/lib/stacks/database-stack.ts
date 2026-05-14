import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, secretPath, applyTags } from '../config'

export interface DatabaseStackProps extends cdk.StackProps {
  config: ProjectConfig
  vpc: ec2.IVpc
}

/**
 * RDS PostgreSQL 15 + RDS Proxy + Security Groups.
 *
 * Los SG del RDS y el Proxy viven en este stack para evitar ciclos
 * cross-stack en CDK. Los stacks consumidores (scraper, app) crean sus
 * propios SG y agregan reglas de ingress al `proxySecurityGroup`
 * exportado desde acá.
 *
 * - Instance class: db.t4g.micro (2 vCPU Graviton, 1 GB RAM)
 * - Storage:        20 GB gp3, cifrado con KMS managed
 * - Multi-AZ:       NO (Single-AZ, ahorra 50%)
 * - Backups:        7 días retention + PITR
 * - RDS Proxy:      conexión persistente para Lambda
 *
 * En Fase B esto migra a Aurora Serverless v2 Multi-AZ.
 */
export class DatabaseStack extends cdk.Stack {
  public readonly instance: rds.DatabaseInstance
  public readonly proxy: rds.DatabaseProxy
  public readonly credentialsSecret: sm.ISecret
  public readonly proxySecurityGroup: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config, vpc } = props

    // ─────────────────────────────────────────────────────────────────────
    // Security Groups (viven en este stack)
    // ─────────────────────────────────────────────────────────────────────
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      securityGroupName: resourceName(config, 'rds-sg'),
      description: 'SG de RDS Postgres. Ingress solo desde RDS Proxy.',
      allowAllOutbound: false,
    })

    this.proxySecurityGroup = new ec2.SecurityGroup(this, 'ProxySecurityGroup', {
      vpc,
      securityGroupName: resourceName(config, 'proxy-sg'),
      description: 'SG de RDS Proxy. Ingress desde Lambda y scraper tasks.',
      allowAllOutbound: true,
    })

    // RDS acepta conexiones solo desde el Proxy (mismo stack — sin ciclo)
    rdsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(this.proxySecurityGroup.securityGroupId),
      ec2.Port.tcp(5432),
      'Desde RDS Proxy'
    )

    // Opt-in: ingress público al proxy (para Lambda fuera de VPC en Fase A)
    const allowPublicProxy = this.node.tryGetContext('allowPublicProxyAccess')
    if (allowPublicProxy === true) {
      this.proxySecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(5432),
        '[FASE A] Ingress público al proxy — proteger con IAM auth en Fase B'
      )
    }

    // Subnet selection: necesitamos subnets con al menos 2 AZs para el
    // subnet group aunque la instancia sea Single-AZ. Usamos PRIVATE
    // WITH_EGRESS; si la VPC001 no tiene subnets privadas, CDK tirará un
    // error claro y podemos cambiar a PUBLIC.
    // Para labs con VPC sin NAT, muchas veces las subnets son PUBLIC.
    // Dejamos configurable por context.
    const subnetStrategy = this.node.tryGetContext('rdsSubnetStrategy') as
      | 'public'
      | 'private-with-egress'
      | 'private-isolated'
      | undefined

    let vpcSubnets: ec2.SubnetSelection
    switch (subnetStrategy) {
      case 'public':
        vpcSubnets = { subnetType: ec2.SubnetType.PUBLIC }
        break
      case 'private-isolated':
        vpcSubnets = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
        break
      case 'private-with-egress':
      default:
        vpcSubnets = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        break
    }

    // ─────────────────────────────────────────────────────────────────────
    // Master credentials — secret generado por CDK
    //   username: ubo163admin
    //   password: autogenerado
    // Drizzle lee DATABASE_URL construida desde este secret.
    // ─────────────────────────────────────────────────────────────────────
    const masterCredentials = rds.Credentials.fromGeneratedSecret('ubo163admin', {
      secretName: secretPath(config, 'db-credentials'),
    })

    // ─────────────────────────────────────────────────────────────────────
    // Parameter group — default por ahora. Tuning en Fase B.
    // ─────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────
    // RDS Instance
    // ─────────────────────────────────────────────────────────────────────
    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      instanceIdentifier: resourceName(config, 'db'),
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets,
      securityGroups: [rdsSecurityGroup],
      credentials: masterCredentials,
      databaseName: 'cuartel_crm',
      allocatedStorage: 20,
      maxAllocatedStorage: 50, // auto-scaling hasta 50 GB
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: subnetStrategy === 'public',
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      deletionProtection: false, // dev: permitir destroy limpio
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      enablePerformanceInsights: false,
      monitoringInterval: cdk.Duration.seconds(0), // disable enhanced monitoring
      autoMinorVersionUpgrade: true,
    })

    this.credentialsSecret = this.instance.secret!

    // ─────────────────────────────────────────────────────────────────────
    // RDS Proxy
    // ─────────────────────────────────────────────────────────────────────
    this.proxy = new rds.DatabaseProxy(this, 'Proxy', {
      dbProxyName: resourceName(config, 'proxy'),
      proxyTarget: rds.ProxyTarget.fromInstance(this.instance),
      secrets: [this.credentialsSecret],
      vpc,
      vpcSubnets,
      securityGroups: [this.proxySecurityGroup],
      iamAuth: false, // Fase B: activar
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(30),
      maxConnectionsPercent: 80,
      maxIdleConnectionsPercent: 20,
      debugLogging: false,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.instance.dbInstanceEndpointAddress,
      description: 'Endpoint directo de la instancia RDS (solo admin)',
    })
    new cdk.CfnOutput(this, 'ProxyEndpoint', {
      value: this.proxy.endpoint,
      description: 'Endpoint del RDS Proxy (usar este en la app)',
    })
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.credentialsSecret.secretArn,
      description: 'ARN del secret de credenciales de DB',
    })
    new cdk.CfnOutput(this, 'DbName', { value: 'cuartel_crm' })
  }
}
