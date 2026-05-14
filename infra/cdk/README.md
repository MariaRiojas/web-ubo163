# CUARTEL-CRM — Infraestructura AWS (CDK)

Despliegue de la aplicación **CUARTEL-CRM para Bomberos 163** en AWS usando AWS CDK v2 (TypeScript).

Ambiente: **dev** · Región: **us-east-1** · VPC: **vpc-08fdfab5d388c249a** · Prefijo: **ubo163-dev**

Ver `../../docs/AWS_DEPLOYMENT.md` para la arquitectura detallada.

---

## Stacks desplegados

| Stack | Contenido |
|---|---|
| `ubo163-dev-network` | Importa VPC compartida + Security Groups (RDS, Proxy, Lambda, Scraper) |
| `ubo163-dev-secrets` | 4 secretos en Secrets Manager (app, scraper-sync, CGBVP, SES SMTP) |
| `ubo163-dev-storage` | Bucket S3 privado para media (avatars, adjuntos) |
| `ubo163-dev-database` | RDS Postgres 15 t4g.micro + RDS Proxy |
| `ubo163-dev-compute-app` | Lambda Next.js (Web Adapter) + CloudFront + bucket S3 de assets estáticos |
| `ubo163-dev-compute-scraper` | ECS Cluster + Task Definition + 5 EventBridge Schedules (Fargate Spot) |
| `ubo163-dev-observability` | Dashboard CloudWatch + 3 alarmas |

---

## Requisitos

- **Node.js 20+** y **npm 10+**
- **AWS CDK v2** global: `npm install -g aws-cdk`
- **Docker** corriendo (necesario para empaquetar la imagen del scraper)
- **Credenciales AWS** configuradas (perfil o SSO) con permisos de administrador para la cuenta `dev`
- Haber ejecutado `npm run build` en la raíz del repo (genera `.next/standalone` que la Lambda empaqueta)

---

## Primera vez — Deploy desde cero

```bash
# 1) Desde la raíz del repositorio — instalar deps del proyecto web y buildear
cd <repo-root>
npm install
npm run build    # genera .next/standalone, .next/static y valida tipos

# 2) Instalar deps del proyecto CDK
cd infra/cdk
npm install

# 3) Configurar credenciales AWS (una vez por máquina)
aws configure --profile ubo163-dev
# o si usás IAM Identity Center:
#   aws configure sso --profile ubo163-dev
#   aws sso login --profile ubo163-dev

# 4) Bootstrap (solo la primera vez por cuenta + región)
AWS_PROFILE=ubo163-dev cdk bootstrap aws://<ACCOUNT_ID>/us-east-1

# 5) Deploy de todos los stacks
AWS_PROFILE=ubo163-dev cdk deploy --all --require-approval never

# 6) Completar placeholders en Secrets Manager (AWS Console)
#    - ubo163/dev/cgbvp-credentials
#        {"USUARIO_INTRANET": "...", "CONTRASENA_INTRANET": "..."}
#    - ubo163/dev/ses-smtp-credentials
#        {"SMTP_USER": "AKIA...", "SMTP_PASS": "..."}
#
#    (Para SES SMTP: ir a SES → SMTP settings → Create SMTP credentials,
#     crea un IAM user con la policy correcta y genera user+pass SMTP.)

# 7) Aplicar migraciones Drizzle a la BD
#    (desde la raíz del repo)
cd ../..
DATABASE_URL="postgresql://ubo163admin:<PASSWORD>@<PROXY_ENDPOINT>:5432/cuartel_crm?sslmode=require" \
  npm run db:migrate

# Password y endpoint vienen de:
#   AWS_PROFILE=ubo163-dev aws secretsmanager get-secret-value \
#     --secret-id ubo163/dev/db-credentials --query SecretString --output text
#   AWS_PROFILE=ubo163-dev aws rds describe-db-proxies \
#     --db-proxy-name ubo163-dev-proxy --query 'DBProxies[0].Endpoint' --output text

# 8) Cargar padrón inicial de bomberos (una vez tras deploy)
AWS_PROFILE=ubo163-dev aws ecs run-task \
  --cluster ubo163-dev-scraper \
  --task-definition ubo163-dev-scraper \
  --launch-type FARGATE \
  --network-configuration '{"awsvpcConfiguration":{"subnets":["<SUBNET_ID>"],"securityGroups":["<SCRAPER_SG_ID>"],"assignPublicIp":"ENABLED"}}' \
  --overrides '{"containerOverrides":[{"name":"scraper","environment":[{"name":"SCRAPER_TYPE","value":"bomberos"}]}]}'
```

La URL pública de la app aparece en el output `DistributionUrl` del stack `ubo163-dev-compute-app`:
```
DistributionUrl = https://<XXXX>.cloudfront.net
```

---

## Operación día-a-día

### Ver los stacks sin desplegar

```bash
cd infra/cdk
npm run synth
```

### Ver el diff de cambios antes de aplicar

```bash
AWS_PROFILE=ubo163-dev npm run diff
```

### Deploy de un solo stack

```bash
AWS_PROFILE=ubo163-dev cdk deploy ubo163-dev-compute-app
```

### Ver logs de la Lambda

```bash
AWS_PROFILE=ubo163-dev aws logs tail /aws/lambda/ubo163-dev-web --follow
```

### Ver logs del scraper (última hora)

```bash
AWS_PROFILE=ubo163-dev aws logs tail /aws/ecs/ubo163-dev-scraper --since 1h
```

### Ejecutar un scraper manualmente

```bash
# Bomberos (padrón)
AWS_PROFILE=ubo163-dev aws ecs run-task \
  --cluster ubo163-dev-scraper \
  --task-definition ubo163-dev-scraper \
  --launch-type FARGATE \
  --network-configuration '...' \
  --overrides '{"containerOverrides":[{"name":"scraper","environment":[{"name":"SCRAPER_TYPE","value":"bomberos"}]}]}'

# Histórico de partes (últimos 60 días)
AWS_PROFILE=ubo163-dev aws ecs run-task \
  --cluster ubo163-dev-scraper \
  --task-definition ubo163-dev-scraper \
  --launch-type FARGATE \
  --network-configuration '...' \
  --overrides '{"containerOverrides":[{"name":"scraper","environment":[{"name":"SCRAPER_TYPE","value":"partes-cia"},{"name":"SCRAPE_RANGE_DAYS","value":"60"}]}]}'
```

### Ver el dashboard CloudWatch

URL en el output del stack `ubo163-dev-observability`, o directo:
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ubo163-dev-dashboard
```

---

## Re-build después de cambios en la app Next.js

Cualquier cambio en código de la app bajo `app/`, `components/`, `lib/`, etc. requiere:

```bash
cd <repo-root>
npm run build                                   # regenera .next/standalone
cd infra/cdk
AWS_PROFILE=ubo163-dev cdk deploy ubo163-dev-compute-app
```

CDK detecta el cambio del asset (.next/standalone ya modificado) y reempaqueta la Lambda. CloudFront invalida automáticamente `/_next/static/*` cuando se actualizan los assets.

---

## Re-build después de cambios en el scraper

Cambios en `scripts/scraper/` o `lib/db/`:

```bash
cd infra/cdk
AWS_PROFILE=ubo163-dev cdk deploy ubo163-dev-compute-scraper
```

CDK detecta el cambio del Dockerfile/context, construye la imagen nueva y la sube a ECR. Los próximos triggers del EventBridge Scheduler usan la imagen actualizada.

---

## Teardown — Destruir todo

```bash
cd infra/cdk
AWS_PROFILE=ubo163-dev cdk destroy --all
```

Esto elimina:
- ✅ Lambda, CloudFront, buckets S3 (con `autoDeleteObjects: true`)
- ✅ RDS instance (snapshot automático se descarta por `deleteAutomatedBackups: true`)
- ✅ RDS Proxy, Secrets Manager entries
- ✅ ECS cluster, task definition, logs
- ✅ EventBridge Schedules
- ✅ Security Groups creados (no toca la VPC importada)

⚠️ **Importante:** antes de `destroy` en ambientes con data valiosa:
1. Tomá snapshot manual de RDS:
   ```bash
   aws rds create-db-snapshot --db-instance-identifier ubo163-dev-db \
     --db-snapshot-identifier ubo163-manual-$(date +%Y%m%d)
   ```
2. Descargá los buckets si tienen contenido:
   ```bash
   aws s3 sync s3://ubo163-dev-media ./backup-media/
   ```

---

## Estructura del proyecto

```
infra/cdk/
├── bin/
│   └── app.ts                          # Entrypoint: instancia los 7 stacks
├── lib/
│   ├── config.ts                       # Carga context de cdk.json, helpers de naming
│   └── stacks/
│       ├── network-stack.ts            # VPC import + Security Groups
│       ├── secrets-stack.ts            # 4 Secrets Manager entries
│       ├── storage-stack.ts            # Bucket S3 media
│       ├── database-stack.ts           # RDS Postgres + Proxy
│       ├── compute-app-stack.ts        # Lambda Next.js + CloudFront
│       ├── compute-scraper-stack.ts    # ECS Fargate + EventBridge
│       └── observability-stack.ts      # Dashboard + alarmas
├── assets/
│   └── run.sh                          # Script que Lambda Web Adapter ejecuta
├── cdk.json                            # Config CDK + context (companyId, vpcId, ...)
├── package.json                        # Deps del proyecto CDK
├── tsconfig.json                       # TypeScript config
└── README.md                           # Este archivo
```

---

## Ajuste por context (sin editar código)

Algunos comportamientos se controlan por `--context`:

```bash
# Permitir ingress público al RDS Proxy (requerido si Lambda está fuera de VPC)
cdk deploy --context allowPublicProxyAccess=true

# Elegir estrategia de subnets para RDS
cdk deploy --context rdsSubnetStrategy=public          # VPCs sin subnets privadas
cdk deploy --context rdsSubnetStrategy=private-with-egress   # default
cdk deploy --context rdsSubnetStrategy=private-isolated      # sin salida a internet
```

Para uso permanente, editá el bloque `"ubo163"` en `cdk.json`.

---

## Problemas conocidos

### `cdk synth` falla con "Cannot fetch VPC" / "no credentials"

La importación `ec2.Vpc.fromLookup` requiere credenciales AWS válidas (hace una llamada `DescribeVpcs` al momento de sintetizar). Opciones:

1. **Con credenciales:**
   ```bash
   AWS_PROFILE=ubo163-dev cdk synth
   ```

2. **Sin credenciales (validación de estructura):**
   ```bash
   cdk synth --context skipVpcLookup=true --context rdsSubnetStrategy=public
   ```
   Usa subnets placeholder. **Solo para validar que el TS compila y el CloudFormation sale bien — nunca usar este modo en `cdk deploy`.**

### "Module '.next/standalone' no encontrado" en deploy

Olvidaste ejecutar `npm run build` en la raíz del repo. Corré:

```bash
cd <repo-root>
npm run build
```

### La Lambda responde 502 — "Unable to determine service/operation name to be authorized"

Probablemente el Function URL está con auth AWS_IAM en vez de NONE. El stack ya lo configura bien, pero si hiciste cambios manuales en la consola, verificalo.

### Scraper falla con "Authentication failed" en CGBVP

Los placeholders de `cgbvp-credentials` no fueron reemplazados. Abrí el secret en la consola y completá `USUARIO_INTRANET` y `CONTRASENA_INTRANET`.

### Scraper se queda sin memoria (OOM)

Por defecto el task tiene 1024 MB. Para `partes-cia` con histórico largo, podés aumentarlo editando `compute-scraper-stack.ts`:
```ts
new ecs.FargateTaskDefinition(this, 'ScraperTaskDef', {
  memoryLimitMiB: 2048, // era 1024
  cpu: 1024,            // era 512
  ...
})
```

### Cold start de la Lambda > 3 segundos

Es normal para la primera invocación tras 15 min de idle. Opciones:
- Activar **Provisioned Concurrency** (US$ ~15/mes por ejecución siempre caliente).
- Aumentar memoria a 2048 MB (mejora tiempo de inicio por más CPU proporcional).
- Migrar a App Runner o Fargate si el patrón de uso lo justifica.

---

## Roadmap (Fase B)

Ver `../../docs/AWS_DEPLOYMENT.md` sección 8 para el plan completo de migración a producción nacional.

Resumen:
- Aurora Serverless v2 Multi-AZ reemplaza RDS t4g.micro
- Cognito reemplaza password auth
- WAF delante de CloudFront
- SQS + Lambda consumers entre scraper y `/api/sync`
- Multi-tenant: un stack compartido + schema-per-company
- CI/CD con CDK Pipelines
- Multi-región warm standby
