# CUARTEL-ERP — Despliegue AWS (Piloto Bomberos 163)

**Versión:** 1.0 — Fase A (Validación / Piloto)
**Compañía piloto:** UBO 163 (Ancón)
**Cuenta AWS:** lab / dev
**Región:** `us-east-1`
**VPC:** `vpc-08fdfab5d388c249a` (VPC001, compartida)
**Prefijo de recursos:** `ubo163`

---

## 1. Alcance y objetivos

Este documento describe la arquitectura, decisiones técnicas y plan de despliegue del **piloto de CUARTEL-ERP en AWS para la Compañía de Bomberos Voluntarios N.° 163 (Ancón)**.

Objetivos del piloto:

1. Validar la aplicación en producción con usuarios reales durante 4-6 semanas.
2. Recibir feedback de los bomberos y jefatura para ajustar módulos.
3. Medir costo operativo real para extrapolar a escala nacional.
4. Dejar la infraestructura 100 % como código (CDK) para replicar a otras compañías.

Fuera de alcance del piloto (van a Fase B):

- Alta disponibilidad multi-AZ.
- Multi-tenant (una compañía = un stack).
- Cognito / MFA.
- Multi-región.
- WAF avanzado, GuardDuty, Config, Security Hub.
- Notificaciones push / WebSockets.
- OpenSearch y data lake analítico.

---

## 2. Vista general

```
┌────────────────────── Internet ──────────────────────┐
│                                                      │
│  Usuario (navegador)        Extranet CGBVP           │
│        │                  (bomberosperu.gob.pe)      │
│        │                         ▲                   │
└────────┼─────────────────────────┼───────────────────┘
         │                         │
         ▼                         │
┌───────────────────────────────────────── AWS (us-east-1) ─────────────────────────┐
│                                                                                   │
│  CloudFront (D*.cloudfront.net)                                                   │
│      │                                                                            │
│      ├─ Origin 1:  S3 bucket "ubo163-dev-static"  (assets Next _next/static)      │
│      │                                                                            │
│      └─ Origin 2:  Lambda Function URL  (Next.js SSR + API Routes)                │
│                        │                                                          │
│                        ▼                                                          │
│                   ┌─────────────────────────────┐                                 │
│                   │   Lambda "ubo163-dev-web"   │                                 │
│                   │   Node.js 20, 1024 MB       │                                 │
│                   │   Lambda Web Adapter        │                                 │
│                   └────────┬────────────────────┘                                 │
│                            │                                                      │
│                            │ pg via tcp                                           │
│                            ▼                                                      │
│                   ┌─────────────────────────────┐                                 │
│                   │  RDS Proxy "ubo163-dev-rds" │                                 │
│                   └────────┬────────────────────┘                                 │
│                            │                                                      │
│                            ▼                                                      │
│                   ┌─────────────────────────────┐                                 │
│                   │  RDS Postgres 15            │                                 │
│                   │  db.t4g.micro, 20 GB        │                                 │
│                   │  Single-AZ, encrypted       │                                 │
│                   │  VPC: vpc-08fdfab5d388...   │                                 │
│                   └─────────────────────────────┘                                 │
│                                                                                   │
│                                                                                   │
│  EventBridge Scheduler                                                            │
│      │                                                                            │
│      ├─ cron(*/2 * * * *)  ─► Fargate task "scraper-estado-cia"                   │
│      ├─ cron(*/15 * * * *) ─► Fargate task "scraper-partes-cia"                   │
│      ├─ cron(*/5 * * * *)  ─► Fargate task "scraper-sgo"                          │
│      └─ cron(0 3 1-5 * *)  ─► Fargate task "scraper-asistencia-mensual"           │
│                                    │                                              │
│                                    ▼                                              │
│                            ┌─────────────────────┐                                │
│                            │  ECS Cluster        │                                │
│                            │  "ubo163-dev-scrap" │                                │
│                            │  Fargate Spot       │                                │
│                            │  0.5 vCPU / 1 GB    │                                │
│                            └──────────┬──────────┘                                │
│                                       │ POST /api/sync (token)                    │
│                                       └──► CloudFront ──► Lambda ──► RDS          │
│                                                                                   │
│                                                                                   │
│  Secrets Manager              S3 "ubo163-dev-media"         SES (SMTP 587)        │
│   - db-credentials             (avatars, incidents,          - IAM user           │
│   - app-secrets                  inventory docs)               smtp credentials   │
│   - cgbvp-credentials          block public access                                │
│   - scraper-sync-token                                                            │
│                                                                                   │
│  CloudWatch Logs + Metrics + 3 alarmas basicas                                    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decisiones por componente

### 3.1 Frontend + Backend (Next.js 15)

**Decisión:** Lambda con Lambda Web Adapter + CloudFront + S3 para assets.

| Opción | Por qué descartada / elegida |
|---|---|
| **Lambda + Lambda Web Adapter** ✅ | Cero cambio al código de Next.js. El adapter traduce eventos Lambda a HTTP para que Next corra como proceso normal. Soporta streaming responses y RSC. Simplicidad operativa máxima para el piloto |
| @opennextjs/aws | Más maduro, genera CloudFront+Lambda+S3 optimizado. Pero requiere entender su modelo de edge/server/image/revalidation functions. Overhead para un piloto |
| App Runner | Runtime-friendly, pero más caro en idle (siempre hay container) y sin integración nativa con CloudFront para assets |
| ECS Fargate | Siempre-on, caro para baja carga del piloto (~US$ 30/mes vs US$ 5 en Lambda) |
| Amplify Hosting | Opinionado, difícil de parametrizar, no soporta todos los patrones de Next 15 App Router |

**Configuración:**

- Runtime: Node.js 20 on Amazon Linux 2023
- Memoria: 1024 MB (balance CPU/cold start; ajustable tras medir)
- Timeout: 30 s
- Reserved concurrency: no (on-demand, sin límite explícito)
- Lambda Function URL con auth NONE (el control de acceso está en la app con NextAuth v5)
- CloudFront delante con comportamientos diferenciados:
  - `_next/static/*`, `/public/*`, `*.svg`, `*.jpg`, `*.png` → S3 origin con cache 1 año
  - `/_next/image/*` → Lambda origin, cache por querystring
  - `/*` (resto) → Lambda origin, cache deshabilitado (SSR dinámico)

**Cambios al código requeridos:**

1. `next.config.mjs`: agregar `output: 'standalone'` para build portable.
2. `lib/db/index.ts`: reducir `max` del pool de 10 a 2 (Lambda concurrente × 10 = saturación).
3. Bootstrap wrapper para Lambda Web Adapter (se documenta en sección 7).

### 3.2 Base de datos (PostgreSQL)

**Decisión:** RDS Postgres 15 `db.t4g.micro` Single-AZ + RDS Proxy.

| Parámetro | Valor | Justificación |
|---|---|---|
| Engine | PostgreSQL 15.x | Mismo que local (`postgres:15-alpine`) — cero drift |
| Instance class | `db.t4g.micro` (2 vCPU Graviton, 1 GB RAM) | ~US$ 12/mes; suficiente para < 500 usuarios concurrentes del piloto |
| Storage | 20 GB gp3, encrypted con KMS managed | Crecimiento previsto: ~200 MB/mes con partes de emergencia |
| Multi-AZ | **No** (Single-AZ) | Ahorra 50%. Piloto no es crítico. Backup automático diario cubre RPO < 24h |
| Backups | 7 días retention, PITR habilitado | Suficiente para ambiente dev |
| Public access | No | Solo accesible desde la VPC |
| Parameter group | default `postgres15` | No tunear hasta ver métricas |
| RDS Proxy | Sí, obligatorio | Lambda+RDS sin proxy = saturar conexiones. RDS Proxy mantiene pool persistente, cuesta ~US$ 12/mes |
| IAM auth | No (por ahora) | Piloto usa password de Secrets Manager. Fase B migrará a IAM tokens |
| Enhanced monitoring | No (ahorra OS metrics) | Basic CW metrics son suficientes |
| Performance Insights | No | Solo fase B |

**Migraciones:** Drizzle Kit se ejecuta manualmente desde la máquina del developer con la credencial del Secret (o via un comando `cdk` ad-hoc en el futuro).

### 3.3 Almacenamiento (S3)

**Decisión:** Un bucket único `ubo163-dev-media` privado con URLs pre-firmadas.

- Bloqueo público: **enabled** (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
- Encryption: SSE-S3 (AES-256 gestionado por AWS).
- Versioning: habilitado (protege contra borrado accidental).
- Lifecycle: versiones no-actuales borradas tras 30 días.
- CORS: permitir `PUT` desde el dominio de CloudFront para uploads directos desde el browser.

**Keys organizadas como ya lo hace `lib/storage/s3.ts`:**
```
avatars/{profileId}.{ext}
incidents/{incidentId}/{timestamp}_{filename}
inventory/{itemId}/{timestamp}_{filename}
```

**Acceso:**
- Lambda tiene IAM role con `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` solo sobre este bucket.
- Cliente obtiene URL pre-firmada vía `/api/storage/presign` (ya existe) y sube directo a S3.

### 3.4 Email transaccional (SES)

**Decisión:** Amazon SES en modo SMTP endpoint.

- Identidad verificada: email de remitente (ej. `no-reply@bomberos163.local` o similar, hasta tener dominio real).
- Sandbox mode inicialmente (hasta verificar destinatarios manualmente); solicitar producción cuando se tenga dominio.
- IAM user dedicado (`ubo163-dev-ses-smtp`) con policy `AmazonSesSendingAccess` y credenciales SMTP almacenadas en Secrets Manager.
- Endpoint: `email-smtp.us-east-1.amazonaws.com:587` con TLS.

**Variables de entorno para la Lambda:**
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false   # STARTTLS, no SSL directo
SMTP_USER=<del secret>
SMTP_PASS=<del secret>
SMTP_FROM="CUARTEL-ERP <no-reply@...>"
```

**Cero cambio de código** — `lib/email/send.ts` ya usa nodemailer SMTP.

### 3.5 Secretos (Secrets Manager)

Cuatro secretos, todos tipo JSON:

| Nombre | Estructura | Quién lo consume |
|---|---|---|
| `ubo163/dev/db-credentials` | `{ username, password, host, port, dbname }` auto-rotado por RDS | Lambda, scraper tasks |
| `ubo163/dev/app-secrets` | `{ AUTH_SECRET }` (32 bytes hex, generado aleatoriamente) | Lambda |
| `ubo163/dev/cgbvp-credentials` | `{ username, password }` — **placeholder manual** | Scraper tasks |
| `ubo163/dev/scraper-sync-token` | `{ token }` (generado aleatoriamente por CDK) | Lambda + scraper tasks |
| `ubo163/dev/ses-smtp-credentials` | `{ username, password }` — **placeholder manual** | Lambda |

**Política de acceso:** cada recurso (Lambda function, Fargate task role) tiene permiso `secretsmanager:GetSecretValue` SOLO sobre los secretos que necesita.

**Flujo tras `cdk deploy`:**
1. CDK crea los secretos vacíos (o con valores autogenerados donde es posible).
2. Vos completás manualmente en la consola AWS:
   - `cgbvp-credentials` con el usuario/contraseña real de la extranet.
   - `ses-smtp-credentials` con las credenciales SMTP generadas en IAM.
3. La app los lee en runtime al arrancar.

### 3.6 Scraper (Fargate + EventBridge Scheduler)

**Decisión:** cambiar el modelo "loop continuo 24/7" por **4 tasks independientes scheduled**, cada una con su cadencia propia.

**Razones:**
- Un loop 24/7 consume CPU aunque no haya trabajo (esperando `sleep`).
- Si una cadena de scrapers falla, las 4 se caen juntas.
- EventBridge permite desactivar una sin tocar las demás (útil si CGBVP tumba el endpoint temporalmente).
- Spot pricing aplica solo mientras la task corre (~1-3 min por invocación).

**Tasks:**

| Task | Cron | Fargate Spot | Estimación tiempo |
|---|---|---|---|
| `scraper-estado-cia` | `*/2 * * * *` (cada 2 min) | 0.25 vCPU / 512 MB | 30-60 s |
| `scraper-partes-cia` | `*/15 * * * *` (cada 15 min) | 0.5 vCPU / 1 GB | 1-3 min |
| `scraper-sgo` | `*/5 * * * *` (cada 5 min) | 0.25 vCPU / 512 MB | 20-40 s |
| `scraper-asistencia-mensual` | `0 3 1-5 * *` (día 1-5, 3 AM) | 0.5 vCPU / 1 GB | 2-5 min |

**Estimación mensual de horas Fargate:**
- Estado: 30 ejecuciones/h × 24h × 30d × 1 min ≈ 360 min/mes
- Partes: 4/h × 24 × 30 × 2 min ≈ 5 760 min/mes
- SGO: 12/h × 24 × 30 × 0.5 min ≈ 2 160 min/mes
- Asistencia: 5 veces/mes × 5 min = 25 min/mes
- **Total ≈ 8 300 min/mes = ~140 horas** en Spot → ~US$ 8/mes

**Dockerfile del scraper:** multi-stage, Chromium en `PUPPETEER_EXECUTABLE_PATH`, entrypoint que recibe `SCRAPER_TYPE` env y ejecuta el script correspondiente:
```sh
if [ "$SCRAPER_TYPE" = "estado-cia" ]; then exec node dist/scrapers/estado-cia.js
elif [ "$SCRAPER_TYPE" = "partes-cia" ]; then exec node dist/scrapers/partes-cia.js
...
fi
```

**Padrón de bomberos (`scraper:bomberos`):** se ejecuta **manualmente** tras el deploy inicial y luego una vez al mes via EventBridge (día 1, 2 AM). La tarea escribe directo a `profiles` via `/api/sync`.

### 3.7 Networking

**VPC compartida:** `vpc-08fdfab5d388c249a` (VPC001 en labs).

Necesitamos **descubrir** (tarea #1 pendiente a hacer con credenciales):
- IDs de subnets públicas y privadas.
- Route tables asociadas.
- Si hay IGW / NAT Gateway.

**Colocación de recursos (fase A, modo público):**

| Recurso | Subnet | Acceso a internet |
|---|---|---|
| Lambda Next.js | **Sin VPC** (por defecto) | Acceso directo a internet. Accede a RDS Proxy via endpoint público o via VPC config |
| RDS Postgres | Subnet privada de VPC001 | Sin acceso público directo |
| RDS Proxy | Mismas subnets que RDS | Endpoint accesible desde la Lambda |
| Fargate scraper | Subnet pública de VPC001 (Spot) | Acceso a internet para CGBVP y para llamar a `/api/sync` |

**Security Groups:**
- `ubo163-dev-rds-sg`: ingress 5432 desde `ubo163-dev-proxy-sg`.
- `ubo163-dev-proxy-sg`: ingress 5432 desde `ubo163-dev-lambda-sg` y `ubo163-dev-scraper-sg`.
- `ubo163-dev-lambda-sg`: egress all (solo si Lambda está dentro de VPC).
- `ubo163-dev-scraper-sg`: egress all (necesita alcanzar CGBVP e internet).

**Nota sobre Lambda fuera de VPC:**
En el piloto, la Lambda Next.js corre **fuera de VPC** para simplicidad y evitar el coste del NAT Gateway. Para que pueda alcanzar RDS Proxy tenemos 2 opciones:

- **A (elegida):** RDS Proxy con endpoint público (en subnets públicas). El Security Group restringe por CIDR de Lambda salience (no ideal — en la práctica se abre a `0.0.0.0/0:5432` con auth IAM en fase B).
- **B:** Lambda dentro de VPC001 en subnets públicas con ENIs. Añade ~1-2s al cold start. Más seguro.

**Decisión piloto:** empezar con **Opción A** para simplicidad. Al primer problema de seguridad o al pasar a fase B, migrar a B (cambio menor de CDK).

### 3.8 CloudFront

Distribución única con 2 orígenes:

- **Origin S3:** bucket `ubo163-dev-static` (assets de Next build), OAC configurado.
- **Origin Lambda Function URL:** con OAC firmando las requests (previene bypass).

Behaviors:

| Path pattern | Origin | Cache | Notas |
|---|---|---|---|
| `/_next/static/*` | S3 | 1 año, immutable | Hashes en nombres de archivo |
| `/public/*` (vía rewrite) | S3 | 1 día | Logos, placeholders |
| `/_next/image` | Lambda | 1 día por URL+query | Optimización de imágenes desactivada en `next.config` pero path sigue vivo |
| Default (`*`) | Lambda | **Deshabilitado** | SSR/RSC dinámico; la app controla cache con headers |

WAF: no en piloto. Se suma en fase B.

Price class: `PriceClass_100` (solo NA+EU, suficiente para Perú desde edge NA). Ahorra ~30% vs. global.

### 3.9 Observabilidad

**CloudWatch Logs:**
- `/aws/lambda/ubo163-dev-web` — 7 días retención
- `/aws/ecs/ubo163-dev-scraper/*` — 7 días retención
- `/aws/rds/instance/ubo163-dev-db/postgresql` — 7 días retención

**Alarmas iniciales (mínimas, alertan a email del admin):**
1. `Lambda-Errors` — > 5 errores en 5 min.
2. `RDS-FreeStorageSpace` — < 2 GB.
3. `Scraper-TaskFailed` — cualquier task de ECS que termine con exit code != 0 en 15 min.

**Dashboard CloudWatch único:** KPIs de Lambda (invocations, errors, duration), RDS (CPU, connections, free storage), ECS (task runs, failures), CloudFront (requests, error rate).

---

## 4. Flujos operativos

### 4.1 Deploy inicial (primera vez)

```bash
# 1. Instalar CDK globalmente
npm install -g aws-cdk

# 2. Configurar credenciales AWS (perfil local o SSO)
aws configure --profile ubo163-dev

# 3. Bootstrap de la cuenta/región (una sola vez por cuenta+región)
cd infra/cdk
npm install
cdk bootstrap --profile ubo163-dev

# 4. Deploy de todos los stacks
cdk deploy --all --profile ubo163-dev --require-approval never

# 5. Completar placeholders en Secrets Manager (AWS Console):
#    - ubo163/dev/cgbvp-credentials
#    - ubo163/dev/ses-smtp-credentials

# 6. Aplicar migraciones Drizzle
#    (desde una máquina con acceso temporal al endpoint RDS Proxy)
DATABASE_URL="postgresql://..." npm run db:migrate

# 7. Ejecutar scraper de padrón una vez
#    (desde AWS Console: ECS → Run Task "scraper-bomberos-manual")
```

### 4.2 Deploy de cambios de código (CI/CD futuro, manual por ahora)

```bash
# Cambios en Next.js
cd infra/cdk
cdk deploy ubo163-dev-compute-app --profile ubo163-dev

# Cambios en scraper
cdk deploy ubo163-dev-compute-scraper --profile ubo163-dev
```

### 4.3 Ejecutar scraper ad-hoc (ej. histórico)

Desde AWS Console → ECS → Cluster `ubo163-dev-scrap` → "Run Task" con override de env `SCRAPER_TYPE=historico-60d`.

### 4.4 Teardown completo (dejar de pagar)

```bash
cdk destroy --all --profile ubo163-dev
```

**Cuidado:** elimina el bucket S3 (con `autoDeleteObjects: true`) y la DB. Si querés conservar datos, tomá snapshot antes.

---

## 5. Costos estimados (piloto, 1 compañía, us-east-1)

| Servicio | Dimensión | USD/mes |
|---|---|---|
| Lambda (Next.js) | ~300k invocations, 500 ms avg, 1 GB | 5 |
| CloudFront | 50 GB transfer + 1M req | 6 |
| S3 (media + static) | 5 GB storage, moderate requests | 2 |
| RDS t4g.micro | 730 h + 20 GB gp3 + backups | 18 |
| RDS Proxy | 1 vCPU equivalent | 12 |
| Fargate Spot scraper | ~140 h/mes, 0.5 vCPU avg | 8 |
| EventBridge Scheduler | 22 000 invocaciones/mes | 0.02 |
| Secrets Manager | 5 secrets × 30 días | 2 |
| SES | < 1 000 emails/mes | 0 (free tier) |
| CloudWatch | logs 3 GB + 3 alarmas + dashboard | 3 |
| Data transfer salida | ~10 GB | 1 |
| **Total** | | **~ US$ 57** |

**Notas:**
- El free tier de AWS por primer año baja esto a ~US$ 20 (Lambda gratuita 1M req, RDS 750h, etc.).
- Si se apaga el scraper temporalmente, baja ~US$ 8.
- Si se elige `db.t4g.small` (por carga), sube a ~US$ 82.

---

## 6. Seguridad

### Implementado en fase A

- Secretos en Secrets Manager (nunca en código ni en variables de entorno hardcoded).
- RDS en subnet privada, encryption at rest.
- S3 bucket privado, block public access, encryption SSE-S3.
- IAM roles con least-privilege por componente.
- CloudFront con OAC para origin S3 (previene acceso directo al bucket).
- CloudWatch Logs cifrados con KMS managed.
- Certificados TLS terminados en CloudFront (ACM gestionado).
- NextAuth v5 JWT con `AUTH_SECRET` rotable.
- Bcrypt para passwords (12 rounds).
- Token compartido para `/api/sync` (`SCRAPPER_SYNC_SECRET`).

### Diferido a fase B

- WAF con managed rules + rate-limit en `/login` y `/api/sync`.
- GuardDuty, Security Hub, AWS Config, CloudTrail multi-region.
- Macie para detectar PII (DNIs) filtrada inadvertidamente.
- VPC endpoints para S3, Secrets Manager, SES (tráfico sin salir de AWS).
- IAM auth para RDS (eliminar password).
- MFA vía Cognito.
- KMS CMK por compañía.
- Object Lock para partes de emergencia (compliance mode).

### Ley 29733 (PE) — Protección de datos personales

El sistema almacena DNIs, nombres completos, teléfonos y emails de bomberos (personal sensible). Requisitos mínimos que cumplimos:

- ✅ Datos cifrados en reposo (RDS + S3) y tránsito (TLS).
- ✅ Control de acceso por roles (permissions.ts).
- ✅ Auditoría de accesos (CloudWatch Logs + acceso a DB via RDS Proxy).
- ⚠️ Falta política formal de retención (documentar y programar borrado de datos de retirados).
- ⚠️ Falta designar DPO (Delegado de Protección de Datos) — responsabilidad de la compañía.

---

## 7. Cambios al código del repositorio

### 7.1 `next.config.mjs`

- Agregar `output: 'standalone'`.
- Considerar quitar `ignoreBuildErrors` e `ignoreDuringBuilds` (hoy esconden bugs; para piloto los mantenemos para no bloquear).

### 7.2 `lib/db/index.ts`

- Detectar si corre en Lambda (`process.env.AWS_LAMBDA_FUNCTION_NAME`) y reducir `max` a 2.
- Documentar que en Lambda, RDS Proxy hace el pooling real; nuestro `pg.Pool` solo tiene 1-2 conexiones por container.

### 7.3 `scripts/scraper/`

- Dividir `main.ts` en 4 archivos entrypoint separados bajo `scripts/scraper/entrypoints/`:
  - `estado-cia.ts`
  - `partes-cia.ts`
  - `sgo.ts`
  - `asistencia-mensual.ts`
  - `bomberos.ts` (ya era manual, se mantiene)
- Cada entrypoint: `initBrowser → login → scrape(page) → closeBrowser → process.exit(0)`.
- `main.ts` queda como fallback local para desarrollo (loop con todos los scrapers), **no se usa en AWS**.

### 7.4 `scripts/scraper/Dockerfile`

- Multi-stage build.
- `ENTRYPOINT ["node", "/app/entrypoint.sh"]` con switch por `SCRAPER_TYPE`.
- Platform: `linux/amd64` (Fargate no corre ARM Puppeteer todavía sin issues).

### 7.5 Lambda Web Adapter

- Agregar `/opt/bootstrap` via layer de Lambda Web Adapter (AWS la publica).
- Variable `PORT=3000`, `RUST_LOG=info`.
- `exec: node server.js` desde el output standalone de Next.js.

---

## 8. Plan de migración a Fase B (cuando corresponda)

Disparadores para iniciar fase B:

1. > 5 compañías desplegadas.
2. Feedback estable de Bomberos 163 y decisión de ir nacional.
3. Picos de carga > 1 vCPU sostenido en RDS.
4. Requerimiento formal de alta disponibilidad (ej. respaldar emergencias en vivo).

Pasos de migración (resumen, detalle en futuro `AWS_DEPLOYMENT_PHASE_B.md`):

1. **Networking:** migrar a VPC dedicada con subnets privadas + NAT Gateway + VPC endpoints.
2. **Base de datos:** snapshot RDS → restore en Aurora Serverless v2 PostgreSQL cluster Multi-AZ + read replica.
3. **Multi-tenant:** refactor `company.config.ts` a resolver por hostname + schema-per-tenant en Aurora.
4. **Auth:** migrar a Amazon Cognito (NextAuth v5 sigue siendo cliente).
5. **Sync scraper:** introducir SQS entre scrapers y `/api/sync` para desacoplar.
6. **Observabilidad:** X-Ray, Container Insights, dashboard por compañía.
7. **Seguridad:** WAF, GuardDuty, KMS CMK, Object Lock.
8. **DR:** replicación cross-region.

---

## 9. Riesgos conocidos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cold start Lambda impacta UX | Media | 1024 MB, provisioned concurrency si es crítico (US$ +15/mes) |
| RDS Proxy endpoint público es atacado | Baja | SG restrictivo + password fuerte + CloudWatch alarm sobre conexiones fallidas |
| Scraper bloqueado por CGBVP (captcha, IP ban) | Alta | Spot tasks con IPs variables + fallback a scraping manual + alerta si falla 3 veces seguidas |
| Puppeteer consume > 1 GB y task se mata | Media | Ya reservamos 1 GB para partes-cia; monitorear OOM en logs |
| VPC001 compartida causa conflicto de SG/CIDR | Media | Prefijar todos los SG con `ubo163-dev-` y documentar CIDRs usados |
| Límites SES sandbox bloquean onboarding | Alta | Solicitar producción temprano (hasta 5 días hábiles) |
| Lambda no alcanza RDS Proxy (fuera de VPC) | Media | Si ocurre, plan B es meter Lambda dentro de VPC001 (~1 día de trabajo) |
| Costos superan estimación | Baja | Budget AWS de US$ 100/mes con alarma al 80% |

---

## 10. Referencias del repositorio

| Archivo | Rol |
|---|---|
| `infra/cdk/bin/app.ts` | Entrypoint CDK, instancia todos los stacks |
| `infra/cdk/lib/stacks/network-stack.ts` | Importa VPC existente + SGs |
| `infra/cdk/lib/stacks/database-stack.ts` | RDS + Proxy + secrets |
| `infra/cdk/lib/stacks/storage-stack.ts` | Bucket S3 media |
| `infra/cdk/lib/stacks/secrets-stack.ts` | Secrets Manager entries |
| `infra/cdk/lib/stacks/compute-app-stack.ts` | Lambda Next.js + CloudFront + bucket static |
| `infra/cdk/lib/stacks/compute-scraper-stack.ts` | ECS Cluster + Task Definitions + Schedules |
| `infra/cdk/lib/stacks/observability-stack.ts` | Alarmas + Dashboard |
| `infra/cdk/README.md` | Instrucciones de deploy y operación |
| `scripts/scraper/entrypoints/*.ts` | Un archivo por scraper, sin loop |
| `scripts/scraper/Dockerfile` | Multi-stage para Fargate |
| `docs/AWS_DEPLOYMENT.md` | Este documento |

---

## 11. Próximos pasos post-deploy

1. ✅ Validar que CloudFront URL carga la landing pública.
2. ✅ Login con usuarios seed (o correr `db:seed` vía Bastion/tunnel temporal).
3. ✅ Ejecutar `scraper:bomberos` manual y verificar que `profiles` se llena.
4. ✅ Dejar correr scrapers 24h y revisar métricas en CloudWatch.
5. ✅ Invitar a 3-5 bomberos de UBO 163 a usar el sistema.
6. ✅ Semanal: revisar CloudWatch dashboard, costos, feedback.
7. Al mes 1: decisión sobre pasar a multi-tenant, registrar dominio real, activar SES prod.
