import * as cdk from 'aws-cdk-lib'
import * as fs from 'fs'
import * as path from 'path'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, bucketName, applyTags } from '../config'

export interface ComputeAppStackProps extends cdk.StackProps {
  config: ProjectConfig
  mediaBucket: s3.Bucket
  proxy: rds.DatabaseProxy
  dbCredentialsSecret: sm.ISecret
  appSecrets: sm.Secret
  scraperSyncToken: sm.Secret
  sesSmtpCredentials: sm.Secret
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
 * proceso HTTP normal en el puerto 3000. El adapter traduce eventos
 * Lambda ↔ HTTP.
 *
 * IMPORTANTE: este stack asume que el build de Next.js ya fue generado
 * en ../../.next/standalone/ por `npm run build` en la raíz del repo.
 * Ver README.md del CDK para el flujo completo.
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
      proxy,
      dbCredentialsSecret,
      appSecrets,
      scraperSyncToken,
      sesSmtpCredentials,
    } = props

    const repoRoot = path.resolve(__dirname, '../../../..')
    const standaloneDir = path.join(repoRoot, '.next', 'standalone')
    const staticDir = path.join(repoRoot, '.next', 'static')
    const publicDir = path.join(repoRoot, 'public')
    const runShScript = path.resolve(__dirname, '../../assets/run.sh')

    // Validación temprana: el build de Next debe existir antes del deploy
    if (!fs.existsSync(standaloneDir)) {
      // Warn pero no bloquea cdk synth — el error real aparece en deploy
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
    //
    // Layer oficial de AWS: arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:24
    // (la versión más reciente se actualiza; referencia en:
    //  https://github.com/awslabs/aws-lambda-web-adapter)
    // ─────────────────────────────────────────────────────────────────────
    const adapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'WebAdapterLayer',
      // us-east-1 x86_64
      'arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:24'
    )

    // Log group con retention corta (dev)
    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${resourceName(config, 'web')}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    this.lambdaFunction = new lambda.Function(this, 'WebFunction', {
      functionName: resourceName(config, 'web'),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'run.sh', // Lambda Web Adapter convención: script que arranca el server
      // El código se arma en build time: .next/standalone + run.sh (copiado vía bundling)
      code: lambda.Code.fromAsset(standaloneDir, {
        bundling: {
          // Usamos local bundling para evitar Docker en el deploy.
          // El hook copia run.sh al root del asset junto al server.js.
          image: cdk.DockerImage.fromRegistry('alpine'), // fallback; no se usa
          local: {
            tryBundle(outputDir: string) {
              try {
                // Copia recursiva de .next/standalone/ → outputDir
                copyRecursive(standaloneDir, outputDir)
                // Copia run.sh al root del asset
                fs.copyFileSync(runShScript, path.join(outputDir, 'run.sh'))
                // Asegurar permisos ejecutables (Windows a veces pierde esto)
                try {
                  fs.chmodSync(path.join(outputDir, 'run.sh'), 0o755)
                } catch {
                  // chmod falla en Windows pero el permiso se reestablece
                  // al empaquetar en Linux Lambda. No es bloqueante.
                }
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
        // Lambda Web Adapter config
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '3000',
        AWS_LWA_INVOKE_MODE: 'response_stream', // soporta RSC streaming
        AWS_LWA_READINESS_CHECK_PATH: '/api/health', // opcional, si existe
        RUST_LOG: 'info',

        // Next.js runtime
        NODE_ENV: 'production',
        PORT_NUMBER: '3000',

        // Las variables sensibles se resuelven en tiempo de inicio desde
        // Secrets Manager — las Lambdas las leen usando el SDK dentro del
        // código de Next.js (o via extension). Por ahora exponemos los
        // ARNs y la app los lee on-demand.
        //
        // Alternativa más simple: inyectar algunos valores directo como
        // referencias a secretos, lo cual CloudFormation resuelve en el
        // momento del deploy y los guarda en la config de la función.
        // Esto es aceptable para dev; en prod conviene rotar.
        DB_SECRET_ARN: dbCredentialsSecret.secretArn,
        APP_SECRET_ARN: appSecrets.secretArn,
        SES_SMTP_SECRET_ARN: sesSmtpCredentials.secretArn,
        SCRAPPER_SYNC_TOKEN_ARN: scraperSyncToken.secretArn,

        // Construcción de DATABASE_URL en runtime (la app la arma desde el secret)
        DB_PROXY_ENDPOINT: proxy.endpoint,
        DB_NAME: 'cuartel_crm',

        // S3 para media
        S3_BUCKET: mediaBucket.bucketName,
        S3_REGION: config.region,
        // S3_ENDPOINT NO se setea → AWS SDK usa el endpoint regional nativo

        // SES SMTP
        SMTP_HOST: `email-smtp.${config.region}.amazonaws.com`,
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',

        // NextAuth
        AUTH_URL: 'https://ubo163-dev.cloudfront.net', // se sobrescribe post-deploy con URL real
        AUTH_TRUST_HOST: 'true',
      },
    })

    // Permisos: leer secretos
    dbCredentialsSecret.grantRead(this.lambdaFunction)
    appSecrets.grantRead(this.lambdaFunction)
    scraperSyncToken.grantRead(this.lambdaFunction)
    sesSmtpCredentials.grantRead(this.lambdaFunction)

    // Permisos: media bucket (read/write/delete bajo los keys que maneja la app)
    mediaBucket.grantReadWrite(this.lambdaFunction)
    mediaBucket.grantDelete(this.lambdaFunction)

    // Permiso para firmar URLs pre-firmadas (no requiere IAM extra,
    // grantReadWrite incluye s3:PutObject/GetObject que son los que
    // la pre-firma autoriza).

    // Function URL — CloudFront va a firmar requests con OAC
    const fnUrl = this.lambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    })

    // ─────────────────────────────────────────────────────────────────────
    // CloudFront distribution
    // ─────────────────────────────────────────────────────────────────────
    const lambdaOrigin = new origins.FunctionUrlOrigin(fnUrl, {
      // Fase B: agregar OAC para firmar requests
    })

    const staticOrigin = origins.S3BucketOrigin.withOriginAccessControl(
      this.staticBucket
    )

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${config.resourcePrefix} — CUARTEL-CRM`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: lambdaOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
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
    // Deploy de assets estáticos al bucket
    //
    // Copiamos:
    //   .next/static/  → s3://bucket/_next/static/
    //   public/        → s3://bucket/static/
    //
    // Se invalida CloudFront en cada deploy para que sirva versión nueva.
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
    new cdk.CfnOutput(this, 'LambdaArn', {
      value: this.lambdaFunction.functionArn,
    })
    new cdk.CfnOutput(this, 'LambdaFunctionUrl', {
      value: fnUrl.url,
      description: 'Function URL (directo, sin CloudFront — solo debug)',
    })
    new cdk.CfnOutput(this, 'StaticBucketName', {
      value: this.staticBucket.bucketName,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helper: copia recursiva de directorio (usado por local bundling).
// Equivalente mínimo a `cp -R`; funciona en Windows, macOS y Linux.
// ─────────────────────────────────────────────────────────────────────
function copyRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(srcPath)
      try {
        fs.symlinkSync(link, destPath)
      } catch {
        // Fallback: copia el archivo al que apunta (Windows no siempre permite symlinks)
        fs.copyFileSync(srcPath, destPath)
      }
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
