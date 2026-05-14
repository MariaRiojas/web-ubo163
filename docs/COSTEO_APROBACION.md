# CUARTEL-ERP — Costeo y Solicitud de Aprobación

**Proyecto:** Sistema de gestión integral CUARTEL-ERP para la Compañía de Bomberos Voluntarios N.° 163 (Ancón)
**Fase:** Piloto (validación 4-6 semanas)
**Plataforma:** Amazon Web Services (AWS)
**Cuenta:** `manbuild` — ambiente `dev` (laboratorios)
**Región:** `us-east-1` (Norte de Virginia)
**Fecha:** Mayo 2026
**Solicitante:** María Riojas

---

## 1. Resumen ejecutivo (1 página)

### Qué se va a desplegar

Una plataforma web interna (intranet) + sitio público + sistema de extracción automática de datos oficiales del CGBVP, para gestión operativa de la compañía: personal, guardias, horas de servicio, inventario, emergencias, comunicados y reportería.

Arquitectura **100 % serverless** y **pay-per-use**: cuando nadie usa el sistema, el costo tiende a cero. La infraestructura se describe como código (AWS CDK) para replicar a otras compañías con mínimo esfuerzo.

### Alcance del piloto

- **Usuarios concurrentes estimados:** 150-200 bomberos de UBO 163
- **Duración:** 4-6 semanas de validación, luego decisión de continuar o escalar
- **Región:** us-east-1 (menor costo + más servicios disponibles)
- **Ambiente:** dev de laboratorios (no es producción crítica)

### Costo mensual estimado (piloto)

| Concepto | USD/mes |
|---|---|
| **Costo base fijo** (BD + Proxy + CloudFront + Secrets) | ~ US$ 42 |
| **Costo variable** (uso real estimado) | ~ US$ 15 |
| **Total piloto** | **~ US$ 57** |

Con **AWS Free Tier** del primer año (Lambda 1M req, RDS 750h, CloudFront 1TB, etc.): reducción real a **~ US$ 20/mes**.

### Control de costo garantizado

- **Budget Alert de US$ 80/mes** con notificación al 50%, 80% y 100%.
- **Anomaly Detection** de AWS activado para alertar gastos fuera de patrón.
- **Teardown con un comando:** `cdk destroy --all` elimina todos los recursos y detiene el cobro.
- Cada recurso lleva tags (`project=manbuild`, `enviroment=e02`, `owner=manantial`) para atribución y reporting.

### Beneficio esperado

- Centraliza información hoy dispersa en Excel y WhatsApp.
- Automatiza reportería normativa (NDR-Ascensos, cumplimiento de horas).
- Ingesta automática de datos oficiales CGBVP cada 2-15 min.
- Base replicable para otras 200+ compañías a nivel nacional (fase B).

### Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sobregasto inesperado | Bajo | Budget alert + anomaly detection |
| Baja adopción del piloto | Medio | `cdk destroy` cierra todo sin costo residual |
| Fuga de datos personales (DNI, nombres) | Alto | Cifrado en reposo y tránsito, IAM roles, no acceso público directo a BD |
| Dependencia del scraper CGBVP | Medio | Sistema opera sin él; degrada funcionalidad de reportería pero no la operación básica |

---

## 2. Detalle de servicios AWS desplegados

Todos los servicios son **AWS nativos**, sin terceros. Cada uno con justificación funcional y costo estimado.

### 2.1 Frontend y backend

| Servicio | Función | Unidad de costo | Estimación piloto |
|---|---|---|---|
| **AWS Lambda** | Ejecuta el backend de la aplicación (Next.js 15 SSR + API REST) bajo demanda | US$ 0.20 / 1M requests + US$ 0.0000166667 / GB-s | ~300 k req/mes × 500 ms × 1 GB ≈ **US$ 5** |
| **Amazon CloudFront** | CDN: entrega contenido estático (imágenes, CSS, JS) desde edge locations cercanos al usuario. Reduce latencia y costos | US$ 0.085 / GB salida (primeros 10 TB) + US$ 0.0075 / 10k requests | ~50 GB transfer + 1M req ≈ **US$ 6** |
| **Amazon S3** | 2 buckets: uno para archivos estáticos de la app, otro privado para archivos subidos por usuarios (fotos de inventario, adjuntos) | US$ 0.023 / GB-mes + requests | 5 GB storage ≈ **US$ 2** |
| **AWS Certificate Manager** | Certificado TLS para HTTPS | Gratuito cuando se usa con CloudFront | US$ 0 |
| **Subtotal frontend/backend** | | | **~ US$ 13** |

### 2.2 Base de datos

| Servicio | Función | Unidad de costo | Estimación piloto |
|---|---|---|---|
| **Amazon RDS PostgreSQL** | Base de datos relacional gestionada. Instancia `db.t4g.micro` (2 vCPU Graviton ARM, 1 GB RAM). Single-AZ (no HA en piloto) | US$ 0.017 / hora + US$ 0.115 / GB-mes storage | 730 h + 20 GB + backups 7 días ≈ **US$ 18** |
| **Amazon RDS Proxy** | Pool de conexiones persistente entre Lambda ↔ RDS. Evita saturación de conexiones | US$ 0.015 / hora por vCPU equivalente | 1 vCPU × 730 h ≈ **US$ 12** |
| **Subtotal BD** | | | **~ US$ 30** |

### 2.3 Extracción de datos CGBVP (scraper)

| Servicio | Función | Unidad de costo | Estimación piloto |
|---|---|---|---|
| **Amazon ECS Fargate Spot** | Contenedores Docker que ejecutan el scraper de la extranet CGBVP. Se activan solo cuando EventBridge los dispara (cada 2-15 min). Spot = 70% descuento vs on-demand | US$ 0.01222 / hora por 0.5 vCPU + 1 GB RAM (spot, us-east-1) | ~140 h/mes ≈ **US$ 8** |
| **Amazon EventBridge Scheduler** | Dispara las tasks del scraper en horarios cron | US$ 1 / 1M schedules | 22 k invocaciones/mes ≈ **US$ 0.02** |
| **Amazon ECR** | Repositorio privado de la imagen Docker del scraper | US$ 0.10 / GB-mes | < 1 GB ≈ **US$ 0.10** |
| **Subtotal scraper** | | | **~ US$ 8** |

### 2.4 Seguridad, secretos y correo

| Servicio | Función | Unidad de costo | Estimación piloto |
|---|---|---|---|
| **AWS Secrets Manager** | 5 secretos: credenciales DB, clave de sesión NextAuth, credenciales extranet CGBVP, credenciales SMTP, token del scraper | US$ 0.40 / secret / mes + US$ 0.05 / 10k API calls | 5 secretos ≈ **US$ 2** |
| **Amazon SES** | Correo transaccional (bienvenida, cambio de contraseña, notificaciones) | US$ 0.10 / 1000 emails (después de free tier 62k desde Lambda) | < 1 000 emails/mes ≈ **US$ 0** |
| **AWS KMS** | Claves de cifrado (gestionadas por AWS, incluidas con RDS y S3) | Gratuito cuando usa AWS-managed keys | US$ 0 |
| **Subtotal seguridad** | | | **~ US$ 2** |

### 2.5 Observabilidad

| Servicio | Función | Unidad de costo | Estimación piloto |
|---|---|---|---|
| **Amazon CloudWatch Logs** | Logs centralizados de Lambda, RDS, scraper, retention 7 días | US$ 0.50 / GB ingest + US$ 0.03 / GB storage | ~3 GB ≈ **US$ 2** |
| **CloudWatch Metrics** | Métricas de todos los servicios (CPU, errores, latencia) | 10 métricas gratis + US$ 0.30 / métrica adicional | Dentro de free tier ≈ **US$ 0** |
| **CloudWatch Alarms** | 3 alarmas: errores Lambda, storage RDS bajo, fallo scraper | US$ 0.10 / alarma / mes | 3 × 0.10 ≈ **US$ 0.30** |
| **CloudWatch Dashboard** | 1 dashboard con vista consolidada del sistema | US$ 3 / dashboard / mes | 1 × 3 ≈ **US$ 3** |
| **Subtotal observabilidad** | | | **~ US$ 5** |

### 2.6 Totalización

| Categoría | USD/mes |
|---|---|
| Frontend/Backend (Lambda + CloudFront + S3) | 13 |
| Base de datos (RDS + Proxy) | 30 |
| Scraper CGBVP (Fargate + EventBridge + ECR) | 8 |
| Seguridad (Secrets + SES) | 2 |
| Observabilidad (Logs + Alarms + Dashboard) | 5 |
| Data transfer salida (~ 10 GB) | 1 |
| **Total mensual estimado** | **~ US$ 57** |

### 2.7 Ajuste con AWS Free Tier (solo año 1)

Si la cuenta `manbuild` es elegible para Free Tier (primeros 12 meses):

| Servicio | Free Tier anual | Impacto en costo |
|---|---|---|
| Lambda | 1M requests + 400 000 GB-s gratis | −US$ 5 |
| CloudFront | 1 TB transfer + 10M req | −US$ 6 |
| S3 | 5 GB standard + 20k GET + 2k PUT | −US$ 2 |
| RDS t4g.micro | 750 h/mes | −US$ 15 |
| CloudWatch | 5 GB logs + 10 métricas + 10 alarmas | −US$ 2 |
| SES | 62k emails desde Lambda | US$ 0 |
| **Ahorro año 1** | | **−US$ 30** |
| **Costo real año 1** | | **~ US$ 20-25/mes** |

---

## 3. Proyección fase nacional (solo referencia — NO se implementa ahora)

Si el piloto es exitoso y se decide escalar a las 200+ compañías del CGBVP:

| Concepto | Piloto (1 compañía) | Nacional (200 compañías) |
|---|---|---|
| Base de datos | RDS t4g.micro Single-AZ | Aurora Serverless v2 Multi-AZ (autoscale 0.5-32 ACU) |
| Multi-tenant | N/A | Schema-per-company en 1 cluster Aurora |
| Seguridad | IAM básico | WAF + GuardDuty + Cognito MFA |
| Costo/mes | ~US$ 57 | ~US$ 2 500-5 500 |
| **Costo por compañía** | **US$ 57** | **~US$ 20** |

La arquitectura serverless permite **economía de escala real**: 200 compañías cuestan menos que 200 × 1 compañía, porque los recursos fijos (Aurora, CloudFront, Cognito) se comparten.

---

## 4. Comparación con alternativas

### vs. Solución on-premise en servidor del cuartel

| Aspecto | On-premise | AWS piloto |
|---|---|---|
| Costo inicial | US$ 2 000-4 000 (servidor + UPS + red) | US$ 0 |
| Costo mensual | US$ 20-50 (electricidad + mantenimiento) | US$ 20-57 |
| Disponibilidad | Corte de luz = sistema caído | 99.9 % (CloudFront multi-región) |
| Acceso remoto | VPN compleja o exposición insegura | Acceso web nativo |
| Backups | Manual, responsabilidad del voluntario | Automáticos 7 días + PITR |
| Escalabilidad a otras compañías | Reinstalar desde cero | Replicar con un comando CDK |
| Seguridad | Depende del administrador local | IAM + KMS + VPC profesional |
| **Ventaja AWS** | | Sin inversión inicial, escalable, resiliente |

### vs. Microsoft Azure equivalente

Costo comparable, pero:
- AWS tiene más servicios serverless maduros (Lambda, Fargate Spot).
- CDK (TypeScript) es más expresivo que Bicep.
- La cuenta `manbuild` ya existe y opera con AWS, evita duplicar vendor management.

---

## 5. Cronograma y plan de control

### Fase de validación (este documento)

| Semana | Actividad | Costo acumulado |
|---|---|---|
| 0 | Aprobación corporativa + setup credenciales | US$ 0 |
| 1 | Deploy inicial + smoke test | US$ 15 (pro-rata) |
| 2-5 | Uso real con 3-5 bomberos de prueba + feedback | US$ 57/mes |
| 6 | Decisión: continuar → completar MVP · no continuar → `cdk destroy` | US$ 0 tras destroy |

### Control de gasto propuesto

1. **AWS Budget `ubo163-dev-monthly`:**
   - Umbral: US$ 80/mes
   - Alertas: 50% (US$ 40), 80% (US$ 64), 100% (US$ 80), 120% (US$ 96)
   - Destinatario: email del solicitante + email del corporativo
2. **AWS Cost Anomaly Detection:** detecta gastos fuera de patrón normal.
3. **Tag enforcement:** todos los recursos llevan `project=manbuild`, `enviroment=e02`, `owner=manantial`, `Project=CUARTEL-ERP`, `Company=ubo163` para reporting por centro de costos.
4. **Reporte mensual:** captura del Cost Explorer filtrado por tag `Project=CUARTEL-ERP` enviada al área solicitante.

### Criterios de éxito del piloto

- ≥ 50% del personal activo usa el sistema al menos 1 vez por semana
- 0 incidentes de seguridad durante el piloto
- Costo real ≤ US$ 80/mes
- Feedback estructurado documentado
- Decisión fundamentada sobre continuar/escalar al mes 2

---

## 6. Solicitud

Solicito aprobación para:

1. ✅ **Desplegar el piloto en cuenta `manbuild` dev** con presupuesto máximo de **US$ 80/mes** durante **2 meses** (costo total máximo: US$ 160).
2. ✅ **Aplicar los tags corporativos** ya definidos (`project=manbuild`, etc.) a todos los recursos creados.
3. ✅ **Habilitar Budget Alert + Anomaly Detection** antes del primer deploy, con notificación al email corporativo además del mío.
4. ✅ **Uso exclusivo para validación** — no se almacenan datos de producción crítica hasta Fase B aprobada por separado.

### Compromiso de rollback

Si al finalizar los 2 meses no se aprueba continuidad, ejecuto `cdk destroy --all` y confirmo por escrito que no quedan recursos facturables en AWS.

---

## Anexo A — Detalle técnico (para equipo de IT corporativo)

- **IaC:** AWS CDK v2 en TypeScript (`infra/cdk/` en el repositorio)
- **Runtime Lambda:** Node.js 20 + Lambda Web Adapter
- **Imagen scraper:** Debian slim + Chromium headless + TypeScript
- **Red:** reutiliza VPC compartida `vpc-08fdfab5d388c249a` (VPC001) en sus subnets privadas con NAT existente — cero costo adicional de NAT
- **Datos sensibles:** cifrado at-rest (SSE-S3 + RDS KMS) y in-transit (TLS 1.2+)
- **Logs retenidos 7 días** (dev); en producción se ajusta según política corporativa
- **Stacks CloudFormation creados:** 7 (`ubo163-dev-*`: network, secrets, storage, database, compute-app, compute-scraper, observability)
- **Documentación completa:** `docs/AWS_DEPLOYMENT.md` (arquitectura detallada)
- **Runbooks operativos:** `infra/cdk/README.md` (deploy, rollback, troubleshooting)

## Anexo B — Estimaciones con pricing calculator oficial

Todos los montos de este documento son **estimaciones conservadoras** basadas en:
- AWS Pricing Calculator (https://calculator.aws)
- Pricing oficial us-east-1 a mayo 2026
- Patrones de uso de sistemas similares (intranet de ~200 usuarios concurrentes)

El costo **real** se medirá desde el día 1 del deploy y se reportará semanalmente durante el piloto.

---

**Contacto:** María Riojas · maria.riojas@manantial.pe
**Documento vinculado:** `docs/AWS_DEPLOYMENT.md` (arquitectura completa)
**Código:** Repositorio `web-ubo163` — rama `main`
