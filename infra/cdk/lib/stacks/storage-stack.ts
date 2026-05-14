import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { ProjectConfig, bucketName, applyTags } from '../config'

export interface StorageStackProps extends cdk.StackProps {
  config: ProjectConfig
}

/**
 * Bucket S3 privado para assets de usuarios (avatars, adjuntos, docs).
 *
 * - Block Public Access: habilitado
 * - Encryption: SSE-S3
 * - Versioning: habilitado (protege borrado accidental)
 * - Lifecycle: versiones no-actuales borradas tras 30 días
 * - CORS: permite PUT desde el dominio de CloudFront para uploads directos
 */
export class StorageStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config } = props

    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: bucketName(config, 'media'),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      enforceSSL: true,
      publicReadAccess: false,

      // Dev: permitir destroy limpio
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,

      lifecycleRules: [
        {
          id: 'expire-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],

      // CORS para uploads directos del browser via URL pre-firmada
      cors: [
        {
          allowedOrigins: ['*'], // Fase A: abierto. Fase B: restringir a dominio CF
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    })

    new cdk.CfnOutput(this, 'MediaBucketName', { value: this.mediaBucket.bucketName })
    new cdk.CfnOutput(this, 'MediaBucketArn', { value: this.mediaBucket.bucketArn })
  }
}
