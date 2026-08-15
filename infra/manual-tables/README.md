# Tablas DynamoDB a crear manualmente (2026-08)

El SCP de la organización (`p-rn8plzgq`, cuenta `013314612438`) deniega
`dynamodb:CreateTable` a **todos** los principales de esta cuenta, incluido el
rol de ejecución de CloudFormation. Por eso estas 3 tablas no se pudieron crear
ni por CDK ni por CLI con el perfil `manbuild`.

**Crearlas con una identidad fuera del SCP** (admin de la organización, o una
cuenta/rol exceptuado). El grant de acceso del Lambda a estas 3 tablas **ya está
aplicado** (inline policy `NewTables2026Access` en el rol de la función), así que
apenas existan, la app las usa sin pasos extra.

> **Etiqueta obligatoria (política de la organización):** todo recurso AWS creado
> en estas cuentas debe llevar el tag `aws-apn-id = pc:3ane5a9qkvyu1sguzgkqxqkuv`.
> Los 3 JSON de este directorio ya lo incluyen en `Tags`, así que las tablas se
> crean etiquetadas. (La inline policy `NewTables2026Access` no admite tags —
> las policies inline de rol no se etiquetan; el tag va en tablas, buckets, funciones, etc.)

## Comandos (una identidad con permiso de CreateTable)

```bash
cd infra/manual-tables
aws dynamodb create-table --cli-input-json file://admission-applications.json --region us-east-1
aws dynamodb create-table --cli-input-json file://audit-log.json --region us-east-1
aws dynamodb create-table --cli-input-json file://site-content.json --region us-east-1
```

Verificar:
```bash
aws dynamodb describe-table --table-name ubo163-dev-admission-applications --query "Table.TableStatus"
aws dynamodb describe-table --table-name ubo163-dev-audit-log --query "Table.TableStatus"
aws dynamodb describe-table --table-name ubo163-dev-site-content --query "Table.TableStatus"
```

## Contenido de cada tabla

| Tabla | PK | GSIs | Uso |
|-------|----|----|-----|
| `ubo163-dev-admission-applications` | `applicationId` | `cohortId-createdAt-index` | Postulaciones del formulario público del landing |
| `ubo163-dev-audit-log` | `logId` | `timeline-index` (logPartition+createdAt), `entityType-createdAt-index` | Bitácora inmutable append-only (solo PutItem) |
| `ubo163-dev-site-content` | `contentKey` | — | Bloques editables del landing (área de Imagen) |

Todas `PAY_PER_REQUEST` (costo por uso, escala a cero).

## Nota sobre el fix definitivo del SCP

El código CDK correcto para estas tablas existía en un stack aislado
(`DynamoExtraStack`) pero se removió porque el deploy es imposible bajo el SCP.
Cuando se ajuste el SCP, lo ideal es reconciliar el stack `ubo163-dev-dynamo`
(que está drifteado: `library-documents`, `training-cohorts`, `training-evaluations`,
`training-enrollments`, `inventory-movements` existen físicamente pero no en el
template) e incorporar estas 3 tablas ahí vía IaC.
