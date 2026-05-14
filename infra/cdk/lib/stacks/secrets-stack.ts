import * as cdk from 'aws-cdk-lib'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import { ProjectConfig, secretPath, applyTags } from '../config'

export interface SecretsStackProps extends cdk.StackProps {
  config: ProjectConfig
}

/**
 * Crea los secretos del proyecto en Secrets Manager.
 *
 * Secretos creados:
 *   - app-secrets           : AUTH_SECRET autogenerado (32 bytes hex)
 *   - scraper-sync-token    : token autogenerado para /api/sync
 *   - cgbvp-credentials     : placeholder — completar manualmente
 *   - ses-smtp-credentials  : placeholder — completar manualmente
 *
 * El secreto de db-credentials lo crea el database-stack como parte
 * del recurso RDS (incluye rotación automática).
 */
export class SecretsStack extends cdk.Stack {
  public readonly appSecrets: sm.Secret
  public readonly scraperSyncToken: sm.Secret
  public readonly cgbvpCredentials: sm.Secret
  public readonly sesSmtpCredentials: sm.Secret

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config } = props

    // ─────────────────────────────────────────────────────────────────────
    // 1. app-secrets — AUTH_SECRET de NextAuth v5
    //    Autogenerado por Secrets Manager (32 bytes hex = 64 chars).
    // ─────────────────────────────────────────────────────────────────────
    this.appSecrets = new sm.Secret(this, 'AppSecrets', {
      secretName: secretPath(config, 'app-secrets'),
      description: 'Secretos de la aplicación Next.js (AUTH_SECRET)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'AUTH_SECRET',
        excludePunctuation: true,
        passwordLength: 64,
      },
    })

    // ─────────────────────────────────────────────────────────────────────
    // 2. scraper-sync-token — token compartido entre scraper y /api/sync
    //    Autogenerado.
    // ─────────────────────────────────────────────────────────────────────
    this.scraperSyncToken = new sm.Secret(this, 'ScraperSyncToken', {
      secretName: secretPath(config, 'scraper-sync-token'),
      description: 'Token Bearer para autenticar scraper → /api/sync',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'SCRAPPER_SYNC_SECRET',
        excludePunctuation: true,
        passwordLength: 48,
      },
    })

    // ─────────────────────────────────────────────────────────────────────
    // 3. cgbvp-credentials — placeholder, completar manualmente
    //    Las credenciales reales de la extranet CGBVP se cargan en consola
    //    después del deploy.
    // ─────────────────────────────────────────────────────────────────────
    this.cgbvpCredentials = new sm.Secret(this, 'CgbvpCredentials', {
      secretName: secretPath(config, 'cgbvp-credentials'),
      description:
        'Credenciales CGBVP extranet. COMPLETAR MANUALMENTE tras deploy: ' +
        '{"USUARIO_INTRANET": "...", "CONTRASENA_INTRANET": "..."}',
      secretObjectValue: {
        USUARIO_INTRANET: cdk.SecretValue.unsafePlainText('PLACEHOLDER-completar-en-consola'),
        CONTRASENA_INTRANET: cdk.SecretValue.unsafePlainText('PLACEHOLDER-completar-en-consola'),
      },
    })

    // ─────────────────────────────────────────────────────────────────────
    // 4. ses-smtp-credentials — placeholder, completar manualmente
    //    Credenciales SMTP generadas desde IAM para el usuario SES.
    // ─────────────────────────────────────────────────────────────────────
    this.sesSmtpCredentials = new sm.Secret(this, 'SesSmtpCredentials', {
      secretName: secretPath(config, 'ses-smtp-credentials'),
      description:
        'Credenciales SMTP de SES. COMPLETAR MANUALMENTE tras deploy: ' +
        '{"SMTP_USER": "AKIA...", "SMTP_PASS": "..."}',
      secretObjectValue: {
        SMTP_USER: cdk.SecretValue.unsafePlainText('PLACEHOLDER-completar-en-consola'),
        SMTP_PASS: cdk.SecretValue.unsafePlainText('PLACEHOLDER-completar-en-consola'),
      },
    })

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'AppSecretsArn', { value: this.appSecrets.secretArn })
    new cdk.CfnOutput(this, 'ScraperSyncTokenArn', { value: this.scraperSyncToken.secretArn })
    new cdk.CfnOutput(this, 'CgbvpCredentialsArn', { value: this.cgbvpCredentials.secretArn })
    new cdk.CfnOutput(this, 'SesSmtpCredentialsArn', { value: this.sesSmtpCredentials.secretArn })
  }
}
