import * as cdk from 'aws-cdk-lib'
import * as fs from 'fs'
import * as path from 'path'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, bucketName, applyTags } from '../config'

export interface ComputeAppStackProps extends cdk.StackProps {
  config: ProjectConfig
  mediaBucket: s3.Bucket
  appSecrets: sm.Secret
  scraperSyncToken: sm.Secret
  sesSmtpCredentials: sm.Secret
  dynamoTables: dynamodb.Table[]
}

/**
 * Stack de cómputo para la app Next.js.
 *
 * Arquitectura:
 *   CloudFront → Lambda Function URL (SSR + API)   — código de la app
 *              → S3 bucket (assets estáticos)      — _next/static + public
 *
 * La Lambda usa Lambda Web Adapter (layer AWS oficial) para levantar el
 * servidor standalone de Next.js (.next/standalone/server.js) como un
 * proceso HTTP normal en el puerto 3000.
 *
 * Base de datos: DynamoDB — sin VPC, sin RDS Proxy.
 * La Lambda conecta directamente a DynamoDB vía AWS SDK (HTTP).
 */
export class ComputeAppStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution
  public readonly lambdaFunction: lambda.Function
  public readonly staticBucket: s3.Bucket

  constructor(scope: Construct, id: string, props: ComputeAppStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const {
      config,
      mediaBucket,
      appSecrets,
      scraperSyncToken,
      sesSmtpCredentials,
      dynamoTables,
    } = props

    const repoRoot = path.resolve(__dirname, '../../../..')
    const standaloneDir = path.join(repoRoot, '.next', 'standalone')
    const staticDir = path.join(repoRoot, '.next', 'static')
    const publicDir = path.join(repoRoot, 'public')
    const runShScript = path.resolve(__dirname, '../../assets/run.sh')

    if (!fs.existsSync(standaloneDir)) {
      console.warn(
        `[ubo163] .next/standalone no existe en ${standaloneDir}. ` +
          `Ejecutá 'npm run build' en la raíz del repo antes de 'cdk deploy'.`
      )
    }

    // ─────────────────────────────────────────────────────────────────────
    // Bucket para assets estáticos servidos por CloudFront
    // ─────────────────────────────────────────────────────────────────────
    this.staticBucket = new s3.Bucket(this, 'StaticBucket', {
      bucketName: bucketName(config, 'static'),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Lambda function — Next.js SSR via Lambda Web Adapter
    // ─────────────────────────────────────────────────────────────────────
    const adapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'WebAdapterLayer',
      'arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:24'
    )

    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${resourceName(config, 'web')}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    this.lambdaFunction = new lambda.Function(this, 'WebFunction', {
      functionName: resourceName(config, 'web'),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(standaloneDir, {
        bundling: {
          image: cdk.DockerImage.fromRegistry('alpine'),
          local: {
            tryBundle(outputDir: string) {
              try {
                copyRecursive(standaloneDir, outputDir)
                fs.copyFileSync(runShScript, path.join(outputDir, 'run.sh'))
                try { fs.chmodSync(path.join(outputDir, 'run.sh'), 0o755) } catch {}
                return true
              } catch (e) {
                console.error('Local bundling falló:', e)
                return false
              }
            },
          },
          command: [],
        },
      }),
      layers: [adapterLayer],
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      logGroup: lambdaLogGroup,
      environment: {
        // Lambda Web Adapter — buffered mode preserves Content-Type from Next.js
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '3000',
        RUST_LOG: 'info',

        // Next.js runtime
        NODE_ENV: 'production',

        // DynamoDB — el SDK usa las credenciales del rol de Lambda automáticamente
        // Solo necesitamos el prefijo de tablas y la región
        TABLE_PREFIX: config.resourcePrefix,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',

        // S3 media
        S3_BUCKET: mediaBucket.bucketName,
        S3_REGION: config.region,

        // SES SMTP
        SMTP_HOST: `email-smtp.${config.region}.amazonaws.com`,
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',

        // Secrets Manager ARNs (la app los lee on-demand)
        APP_SECRET_ARN: appSecrets.secretArn,
        SES_SMTP_SECRET_ARN: sesSmtpCredentials.secretArn,
        SCRAPPER_SYNC_TOKEN_ARN: scraperSyncToken.secretArn,

        // NextAuth — AUTH_SECRET se inyecta manualmente o via post-deploy script
        AUTH_URL: 'https://placeholder.cloudfront.net', // se reemplaza abajo post-distribución
        AUTH_TRUST_HOST: 'true',
      },
    })

    // Leer secretos desde Secrets Manager
    appSecrets.grantRead(this.lambdaFunction)
    scraperSyncToken.grantRead(this.lambdaFunction)
    sesSmtpCredentials.grantRead(this.lambdaFunction)

    // Media bucket (avatars, incidentes, inventario)
    mediaBucket.grantReadWrite(this.lambdaFunction)
    mediaBucket.grantDelete(this.lambdaFunction)

    // DynamoDB — acceso de lectura/escritura a todas las tablas
    for (const tbl of dynamoTables) {
      tbl.grantReadWriteData(this.lambdaFunction)
    }

    // Function URL — CloudFront enruta todas las requests dinámicas aquí
    const fnUrl = this.lambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.BUFFERED,
    })

    // ─────────────────────────────────────────────────────────────────────
    // CloudFront distribution
    // ─────────────────────────────────────────────────────────────────────
    const lambdaOrigin = new origins.FunctionUrlOrigin(fnUrl)
    const staticOrigin = origins.S3BucketOrigin.withOriginAccessControl(this.staticBucket)

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${config.resourcePrefix} — CUARTEL-CRM`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: lambdaOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // Policy custom `ubo163-honor-origin-cc` (creada 2026-07-21): honra el
        // Cache-Control del origen (páginas prerenderizadas con s-maxage se
        // cachean en el edge; dinámicas con no-store nunca). CRÍTICO: su
        // HeadersConfig es `none` — la managed UseOriginCacheControlHeaders
        // reenvía `Host` y el origen Lambda Function URL responde 403.
        cachePolicy: cloudfront.CachePolicy.fromCachePolicyId(
          this, 'HonorOriginCacheControl', '2e7f6d6c-fb68-4346-ac4b-c2c384eed0ea',
        ),
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin: staticOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        '/static/*': {
          origin: staticOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
      },
      defaultRootObject: '',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      enableIpv6: true,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Deploy de assets estáticos
    // ─────────────────────────────────────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'StaticAssets', {
      sources: [s3deploy.Source.asset(staticDir)],
      destinationBucket: this.staticBucket,
      destinationKeyPrefix: '_next/static',
      distribution: this.distribution,
      distributionPaths: ['/_next/static/*'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.days(365)),
        s3deploy.CacheControl.immutable(),
      ],
      prune: true,
      memoryLimit: 512,
    })

    new s3deploy.BucketDeployment(this, 'PublicAssets', {
      sources: [s3deploy.Source.asset(publicDir)],
      destinationBucket: this.staticBucket,
      destinationKeyPrefix: 'static',
      distribution: this.distribution,
      distributionPaths: ['/static/*'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.days(1)),
      ],
      prune: true,
      memoryLimit: 512,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'URL pública de la app',
    })
    new cdk.CfnOutput(this, 'LambdaArn', { value: this.lambdaFunction.functionArn })
    new cdk.CfnOutput(this, 'LambdaFunctionUrl', {
      value: fnUrl.url,
      description: 'Function URL directa (solo debug)',
    })
    new cdk.CfnOutput(this, 'StaticBucketName', { value: this.staticBucket.bucketName })
  }
}

function copyRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(srcPath)
      try { fs.symlinkSync(link, destPath) } catch { fs.copyFileSync(srcPath, destPath) }
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
