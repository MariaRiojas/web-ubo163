# Guía de Deploy — CUARTEL-ERP

Guía paso a paso para desplegar el ERP de la Compañía de Bomberos Voluntarios N.° 163 (Ancón) en AWS.

---

## Resumen

El ERP se despliega como una aplicación **Next.js 15** standalone corriendo en **AWS Lambda** detrás de **CloudFront**, con base de datos **PostgreSQL 15** en RDS t4g.micro con RDS Proxy, y un scraper del CGBVP corriendo como tarea programada de ECS Fargate.

- **Región:** `us-east-1`
- **Cuenta AWS:** `607520774564` (proyecto `manbuild`, customer `manantial`)
- **Costo estimado:** ~US$57/mes en fase A
- **Ver:** `docs/COSTEO_APROBACION.md` para el detalle

---

## Prerrequisitos

### 1. Entorno local

- **Node.js 20+** (verificar con `node --version`)
- **pnpm** o **npm** (verificar con `npm --version`)
- **AWS CLI v2** configurado (`aws configure`)
- **AWS CDK v2** instalado globalmente: `npm install -g aws-cdk`
- **PostgreSQL client** (`psql`) para migraciones

### 2. Cuenta AWS

- Acceso a la cuenta `manbuild` (607520774564) con rol que permita CloudFormation, IAM, VPC, RDS, Lambda, CloudFront, ECS, Secrets Manager
- **CDK bootstrap** ya aplicado en la región: `cdk bootstrap aws://607520774564/us-east-1`

### 3. VPC compartida

- VPC001 existente: `vpc-08fdfab5d388c249a`
- Subnets privadas con NAT gateway configuradas
- Los stacks usan `Vpc.fromLookup()` para referenciar la VPC compartida

---

## Variables de entorno necesarias

### Para el build local y CDK synth

```bash
# .env.local (en la raíz del proyecto)
DATABASE_URL=postgres://postgres:PASS@localhost:5432/cuartel_crm
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
```

### Secrets Manager (en AWS)

Se crean automáticamente por el `secrets-stack`:

- `cuartel-erp/db-password` — contraseña RDS
- `cuartel-erp/nextauth-secret` — token JWT
- `cuartel-erp/cgbvp-credentials/<compania_id>` — credenciales cifradas por compañía (ver `docs/CGBVP_SYNC.md`)

---

## Checklist pre-deploy

- [ ] `npm install` ejecutado y sin errores
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `npm run build` genera `.next/standalone` correctamente
- [ ] `cd infra/cdk && npx tsc --noEmit` pasa sin errores
- [ ] `aws sts get-caller-identity` retorna la cuenta manbuild
- [ ] VPC `vpc-08fdfab5d388c249a` accesible (probado con `aws ec2 describe-vpcs`)
- [ ] Logo de la compañía subido a `/public/logo.png`
- [ ] Configuración visible revisada en `/company.config.ts`

---

## Orden de despliegue

Los stacks tienen dependencias — deben desplegarse en este orden:

```
  1. SecretsStack           ← Crea secretos vacíos
  2. NetworkStack           ← Solo lookup de VPC existente
  3. StorageStack           ← S3 para adjuntos e imagenes
  4. DatabaseStack          ← RDS + RDS Proxy + SG
  5. ComputeScraperStack    ← ECS Fargate + EventBridge schedule
  6. ComputeAppStack        ← Lambda + CloudFront + API Gateway
  7. ObservabilityStack     ← CloudWatch alarms + dashboards
```

Deploy con dependencias automáticas:

```bash
cd infra/cdk

# Deploy completo (sigue el orden de dependencias)
npx cdk deploy --all --require-approval never

# O uno a uno, en orden:
npx cdk deploy cuartel-secrets
npx cdk deploy cuartel-network
npx cdk deploy cuartel-storage
npx cdk deploy cuartel-database
npx cdk deploy cuartel-scraper
npx cdk deploy cuartel-app
npx cdk deploy cuartel-observability
```

---

## Pasos post-deploy

### 1. Ejecutar migraciones de DB

```bash
# Conectar al bastion (o usar proxy si está abierto a desarrollo)
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id cuartel-erp/db-url --query SecretString --output text)

# Aplicar migraciones Drizzle
npm run db:push

# Verificar schema
npm run db:studio
```

### 2. Seed inicial v2

```bash
# Seed base (secciones, cursos ESBAS + Escuela Técnica, dormitorios,
# camarotes, camas, máquinas con compartimientos y QR)
npm run db:seed:v2

# Si se quiere seed operativo (partes de emergencia de ejemplo)
npm run db:seed:operativo
```

### 3. Configurar credenciales CGBVP

La primera vez, el Primer Jefe debe configurar las credenciales del portal CGBVP
desde la UI:

1. Login como Primer Jefe
2. Ir a **Configuración** → **Sincronización CGBVP**
3. Ingresar usuario y contraseña del portal
4. El sistema las cifra y guarda en Secrets Manager
5. Verificar: **Test de conexión** debe retornar OK

A partir de ahí el scraper ECS corre automáticamente cada 2 minutos.

### 4. Crear usuario inicial

El seed v2 crea el perfil de María Riojas (A23118) como ejemplo.
Para crear el primer Primer Jefe real:

```sql
-- Crear usuario con NextAuth
INSERT INTO users (id, email, emailVerified, name)
VALUES (gen_random_uuid(), 'primer.jefe@bomberos163.pe', NOW(), 'Nombre Apellido');

-- Crear perfil
INSERT INTO profiles (id, fullName, dni, grade, status, userId)
VALUES (gen_random_uuid(), 'APELLIDO APELLIDO, Nombre', '12345678', 'brigadier', 'activo',
  (SELECT id FROM users WHERE email = 'primer.jefe@bomberos163.pe'));

-- Asignar rol de primer_jefe
INSERT INTO section_roles (profileId, sectionId, role, isActive)
VALUES (
  (SELECT id FROM profiles WHERE dni = '12345678'),
  (SELECT id FROM sections WHERE key = 'jefatura'),
  'primer_jefe',
  true
);
```

### 5. Configurar DNS

Una vez que CloudFront esté desplegado:

1. Obtener el dominio del distribution de CloudFront:
   ```bash
   aws cloudformation describe-stacks --stack-name cuartel-app \
     --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
     --output text
   ```
2. En el proveedor DNS, crear CNAME:
   ```
   intranet.bomberos163.pe → <xxxxxxxxxxxx>.cloudfront.net
   ```
3. Solicitar certificado ACM en `us-east-1` y validarlo
4. Actualizar `cuartel-app` stack con el certificado

---

## Primera validación funcional

Tras deploy + DNS, verificar en orden:

1. `https://intranet.bomberos163.pe` → responde 200 con landing
2. `/login` → permite autenticación
3. `/dashboard` → carga KPIs
4. `/perfil` → muestra el perfil del usuario autenticado
5. `/areas` → hub institucional con 7 áreas
6. `/areas/maquinas` → vista completa del Área de Máquinas
7. `/anuncios` → feed de anuncios (si hay, según audiencia)
8. `/faena` → inspecciones + incidencias + solicitudes
9. `/capacitacion` → catálogo de cursos ESBAS + Escuela Técnica
10. `/guardia-nocturna` → calendario + panel de camas

---

## Destrucción (rollback)

En caso de querer eliminar todo el deploy:

```bash
cd infra/cdk
npx cdk destroy --all

# Los buckets S3 pueden requerir vaciado manual si tienen objetos
# Los secrets tienen período de retención (7-30 días) antes de eliminarse
```

**CUIDADO:** esto elimina la base de datos y todos los datos. Hacer backup antes.

---

## Troubleshooting común

### Build de Next.js falla con "Out of memory"
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### `cdk deploy` falla con timeout de Vpc.fromLookup
- Verificar que las credenciales AWS son válidas: `aws sts get-caller-identity`
- Verificar permisos IAM sobre `ec2:DescribeVpcs`
- Usar `--context skipVpcLookup=true` para synth offline de prueba

### RDS Proxy no permite conexiones
- Verificar que el Security Group del Lambda tiene ingress al SG del proxy
- Verificar que el secret está correctamente formateado como JSON con `username` y `password`

### Scraper ECS task no inicia
- Revisar logs de CloudWatch: `/aws/ecs/cuartel-scraper`
- Verificar que el task role tiene permisos para leer Secrets
- Verificar que las subnets privadas tienen NAT gateway activo

### Migraciones Drizzle fallan
- Asegurar que `DATABASE_URL` apunta al RDS Proxy (no directo al RDS)
- Si hay cambios breaking en schema, revisar `lib/db/schema/index.ts`

---

## Monitoreo post-deploy

- **CloudWatch Dashboard:** `cuartel-erp-main` con métricas de Lambda, RDS, CloudFront
- **Alarmas:** errores 5xx, latencia p95 > 2s, CPU RDS > 80%
- **Logs:**
  - App: `/aws/lambda/cuartel-app-handler`
  - Scraper: `/aws/ecs/cuartel-scraper`
  - CloudFront: `/aws/cloudfront/<distribution-id>`

Para detalles ver `docs/AWS_DEPLOYMENT.md`.

---

## Actualización (re-deploy)

Para deployar cambios de código tras modificaciones:

```bash
# Build + synth
npm run build
cd infra/cdk && npx cdk synth

# Deploy solo el stack de app (sin tocar DB ni network)
npx cdk deploy cuartel-app

# Si hay cambios de schema
npm run db:push
```

Para rollback de app (última versión del Lambda):

```bash
aws lambda list-versions-by-function --function-name cuartel-app-handler
aws lambda update-alias --function-name cuartel-app-handler \
  --name live --function-version <N>
```

---

## Documentación relacionada

- `docs/ARQUITECTURA_MENU.md` — arquitectura completa del ERP (6 capas de navegación)
- `docs/AWS_DEPLOYMENT.md` — detalle de cada stack CDK
- `docs/COSTEO_APROBACION.md` — presupuesto y breakdown de costos AWS
- `docs/CGBVP_SYNC.md` — integración con el portal CGBVP
- `docs/INVENTARIO.md` — módulo de inventario
- `docs/SCI.md` — Sistema de Comando de Incidentes (futuro)
- `docs/GUIA_REDACCION.md` — vocabulario institucional

---

**Dios · Patria · Humanidad**
