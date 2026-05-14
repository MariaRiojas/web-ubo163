import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

/**
 * Configuración compartida del proyecto, leída desde cdk.json context.
 */
export interface ProjectConfig {
  readonly companyId: string
  readonly env: string
  readonly region: string
  readonly account?: string
  readonly vpcId: string
  readonly resourcePrefix: string
  readonly tags: Record<string, string>
}

const CONTEXT_KEY = 'ubo163'

export function loadConfig(scope: Construct): ProjectConfig {
  const ctx = scope.node.tryGetContext(CONTEXT_KEY)
  if (!ctx) {
    throw new Error(
      `Context '${CONTEXT_KEY}' no encontrado en cdk.json. Verificá que el proyecto esté bien configurado.`
    )
  }

  // Account puede venir de env (recomendado) o context
  const account =
    process.env.CDK_DEFAULT_ACCOUNT ||
    ctx.account ||
    undefined

  return {
    companyId: ctx.companyId,
    env: ctx.env,
    region: ctx.region,
    account,
    vpcId: ctx.vpcId,
    resourcePrefix: ctx.resourcePrefix,
    tags: ctx.tags ?? {},
  }
}

/**
 * Aplica los tags del proyecto a un construct (stack o recurso).
 */
export function applyTags(scope: Construct, config: ProjectConfig) {
  for (const [key, value] of Object.entries(config.tags)) {
    cdk.Tags.of(scope).add(key, value)
  }
}

/**
 * Genera un nombre de recurso consistente con el prefijo del proyecto.
 * Ejemplo: resourceName(config, 'media-bucket') => 'ubo163-dev-media-bucket'
 */
export function resourceName(config: ProjectConfig, name: string): string {
  return `${config.resourcePrefix}-${name}`
}

/**
 * Genera un nombre válido para bucket S3 (solo minúsculas, sin underscores).
 */
export function bucketName(config: ProjectConfig, name: string): string {
  return resourceName(config, name).toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

/**
 * Genera la ruta de Secret Manager con jerarquía por compañía y ambiente.
 * Ejemplo: secretPath(config, 'db-credentials') => 'ubo163/dev/db-credentials'
 */
export function secretPath(config: ProjectConfig, name: string): string {
  return `ubo163/${config.env}/${name}`
}
