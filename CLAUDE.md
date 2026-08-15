# CUARTEL-ERP — Guía para Claude Code

## Proyecto
ERP interno para la Compañía de Bomberos Voluntarios Ancón N.° 163 (CGBVP).
Stack: Next.js 15 · DynamoDB · AWS Lambda + CloudFront · CDK.

> **Nota:** `docs/PLATAFORMA.md` y algunos documentos antiguos mencionan PostgreSQL + Drizzle. El sistema desplegado usa **DynamoDB exclusivamente**. Las tablas están en `lib/db/dynamodb.ts` (`TABLE`). No crear código con Drizzle ni references a `db/schema`.

---

## Regla crítica: mantener `docs/PERMISOS_POR_CARGO.md`

**Cada vez que se agregue o modifique:**
- Un nuevo panel de área (`/areas/<seccion>/<panel>`)
- Un nuevo API route (`/api/**`)
- Un permiso nuevo en `lib/auth/permissions.ts`
- Una condición de acceso en `resolvePermissions`

**→ Actualizar `docs/PERMISOS_POR_CARGO.md`** con:
1. El permiso nuevo en la tabla del cargo correspondiente
2. La fila en la tabla "Qué permiso habilita qué endpoint/panel"

---

## Sistema de diseño (CONSERVAR — no crear estilos nuevos)

Todo el intranet usa **un solo sistema de diseño institucional** (oscuro: ink/brass/bone, bordes finos, radio 2px, etiquetas mono en mayúsculas). El landing público (`app/(landing)`) tiene su propia paleta (rojo/zinc) y **no** se toca con esto.

**Reglas al construir UI del intranet:**
- **Botones**: usar las clases `btn btn--primary` / `btn btn--ghost` (+ `btn--sm`). NO usar `<Button>` de shadcn con estilos propios.
- **Colores/espaciado**: usar las CSS vars institucionales — `var(--ink-black)`, `var(--ink-deep)`, `var(--ink-line)`, `var(--bone)`, `var(--steel)`, `var(--brass)`, `var(--red-163)`, `var(--font-mono)`, `var(--font-display)`. NO introducir colores hex sueltos ni Tailwind de paleta distinta.
- **Componentes shadcn/ui** (Dialog, Input, Select, Card, Button): ya están **re-tematizados** dentro de `.intranet-theme` sobreescribiendo sus tokens HSL en `app/globals.css` (bloque "Alineación de los componentes base"). Los popups portaled (Dialog/Select/Dropdown) se tematizan vía `[role="dialog"]`, `[data-radix-popper-content-wrapper]`, etc. → **cualquier componente shadcn nuevo hereda el estilo institucional automáticamente**. No re-estilizar cada modal a mano.
- **Modales/tablas**: seguir el patrón de los existentes (overlay + panel con `var(--ink-deep)` + borde `var(--ink-line)`; tablas con scroll horizontal + `minWidth` para no aplastar columnas).
- Antes de crear un componente visual nuevo, **reutilizar** los patrones ya presentes (`area-hero`, `.btn`, `.guardia-empty`, `.faena-section-title`, `SafeHtml`, `AnuncioRichEditor`).

---

## Deploy

Perfil AWS: `manbuild`  
URL producción: `https://d1bno1kyerz6hk.cloudfront.net`  
Función Lambda: `ubo163-dev-web`  
Bucket estáticos: `ubo163-dev-static`

### Pasos para deployar un cambio de código (sin cambio de infra):

```powershell
# 1. Build
cd C:\Users\User\Desktop\PERSONAL\Bomberos\web-ubo163
npm run build

# 2. Zip + subir Lambda
$standalone = ".\.next\standalone"
$runsh = ".\infra\cdk\assets\run.sh"
$tempDir = "$env:TEMP\ubo163-deploy"
$zipPath = "$env:TEMP\ubo163-lambda.zip"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
robocopy $standalone $tempDir /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item $runsh "$tempDir\run.sh"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
$s3Key = "ubo163-deploy/lambda-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
aws s3 cp $zipPath "s3://cdk-hnb659fds-assets-607520774564-us-east-1/$s3Key" --profile manbuild
aws lambda update-function-code --function-name ubo163-dev-web --s3-bucket cdk-hnb659fds-assets-607520774564-us-east-1 --s3-key $s3Key --profile manbuild --query "FunctionName" --output text

# 3. Sync assets estáticos
aws s3 sync .\.next\static s3://ubo163-dev-static/_next/static --cache-control "public,max-age=31536000,immutable" --profile manbuild --delete
```

### Si hay cambio de infraestructura (nueva tabla, nuevo stack):
Usar CDK deploy. Si falla con EPERM en Windows al renombrar el asset, usar el flujo zip manual de arriba.

### Advertencias del flujo zip
- **Nunca** crear el zip en background y subir en paralelo — existe condición de carrera y se sube el zip del deploy anterior.
- `Compress-Archive` puede tardar 30-60 s en el standalone de ~20 MB. Esperar que termine antes de correr el `aws s3 cp`.
- `robocopy` devuelve exit code 1 cuando copia exitosamente; el task falla pero el zip está bien. Verificar con `Get-Item $zipPath | Select Length`.
- **No usar `AWS_LWA_INVOKE_MODE: response_stream`** — Lambda Web Adapter en streaming mode envía `Content-Type: application/octet-stream` en lugar de `text/html`, lo que hace que el navegador intente descargar la página. Mantener modo buffered (sin la variable).

---

## Grados del CGBVP
Definidos en `lib/cgbvp/grades.ts`. En orden ascendente:
`postulante → aspirante → seccionario → subteniente → teniente → capitan → teniente_brigadier → brigadier → brigadier_mayor → brigadier_general`

No duplicar esta lista en otros archivos — siempre importar desde `grades.ts`.

## Secciones del sistema
`jefatura · maquinas · instruccion · administracion · imagen · prehospitalaria · servicios_generales`

---

## Capas de navegación (A–F)

La arquitectura completa está en `docs/ARQUITECTURA_MENU.md`. Resumen ejecutivo:

| Capa | Quién la ve | Contenido |
|------|-------------|-----------|
| **A — Personal** | Todos (postulante → BG) | `/dashboard`, `/perfil`, `/mi-compania`, `/guardia-nocturna`, `/anuncios` |
| **B — Faena** | Efectivos activos (seccionario+) | `/faena`, `/horas`, `/incidencias` |
| **C — Capacitación** | Todos (contenido diferenciado) | `/capacitacion`, `/esbas`, `/biblioteca` |
| **D — Área de [Sección]** | Solo quien tiene cargo en esa sección | `/areas/<seccion>/…` |
| **E — Comando** | Solo Primer y Segundo Jefe | `/operatividad`, `/estadisticas`, `/partes-emergencia`, `/bomberos`, `/asistencias`, `/analisis` |
| **F — Administración** | Solo Primer Jefe (y 2do con restricciones) | `/configuracion/…` |

**Reglas de acceso:**
- Sin cargo → ve A + B + C
- Con cargo en sección → suma D de su sección
- Primer/Segundo Jefe → ven todo (A+B+C+D todas+E+F)

---

## Rutas de Áreas implementadas

Rutas reales en `app/(intranet)/areas/`:

| Área | Ruta principal | Subrutas implementadas |
|------|----------------|------------------------|
| Jefatura | `/areas/jefatura` | — |
| Máquinas | `/areas/maquinas` | `/inventario` |
| Instrucción | `/areas/instruccion` | `/aspirantes`, `/aspirantes/[cohortId]`, `/inventario` |
| Administración | `/areas/administracion` | `/inventario` |
| Imagen | `/areas/imagen` | `/inventario` |
| Prehospitalaria | `/areas/prehospitalaria` | `/inventario` |
| Servicios Generales | `/areas/servicios-generales` | `/inventario` |

Las rutas spec completas por sección (gabinetes, vehículos, bandejas, etc.) están en `docs/ARQUITECTURA_MENU.md §5`. El key de sección en la URL (`maquinas`, `servicios-generales`, etc.) coincide con el valor `sectionKey` en DynamoDB.

---

## Tablas DynamoDB

Prefijo: `ubo163-dev` (configurable por `TABLE_PREFIX` env). Fuente de verdad: `lib/db/dynamodb.ts`.

| Clave `TABLE.*` | Tabla |
|-----------------|-------|
| `users` | usuarios y credenciales |
| `profiles` | perfil del efectivo (grado, sección, género, etc.) |
| `sections` | 7 secciones del RIF |
| `sectionRoles` | cargos por sección (primer_jefe, jefe_seccion, adjunto…) |
| `guardDormitories` / `guardBunks` / `guardBeds` | configuración física de dormitorios |
| `guardReservations` | reservas de guardia nocturna |
| `incidents` | incidencias reportadas |
| `requests` / `internalRequests` | solicitudes inter-áreas |
| `serviceHours` | horas de servicio |
| `inventory` / `inventoryAttachments` | inventario por sección |
| `machines` / `machineCompartments` / `machineChecklists` | máquinas y gabinetes |
| `trainingCourses` / `trainingCohorts` / `trainingEnrollments` / `trainingProgress` / `trainingCertificates` / `trainingEvaluations` | LMS de capacitación |
| `announcements` | comunicados internos |
| `contentCalendar` | calendario de imagen |
| `emergencies` / `emergencyCrew` | partes de emergencia CGBVP |
| `cgbvpAttendance` / `cgbvpSync` / `cgbvpStatus` | datos scrapeados del CGBVP |
| `ics` | Sistema de Comando de Incidentes (stub, no implementado) |

---

## Estado de módulos

### ✅ Implementado y funcional
- Dashboard, Mi Perfil (6 tabs), Mi Compañía
- Guardia Nocturna (reserva + admin por género)
- Faena: checklists con QR, incidencias, solicitudes
- Capacitación (LMS): cursos, ESBAS, lecciones, biblioteca
- Anuncios con flujo de aprobación (borrador → aprobación Primer Jefe → publicado)
- Panel Máquinas completo (5 tabs)
- Panel Instrucción: cohortes de aspirantes, inscripción de miembros
- Personal, Inventario (v1), Secciones
- Reportería: Operatividad, Estadísticas, Partes, Bomberos, Asistencias, Análisis
- Configuración del sistema

### ⚠️ Stubs / pendientes de completar
- `/areas/jefatura` — stub sin funcionalidad propia
- `/areas/[key]` — fallback genérico para áreas sin panel completo
- `TABLE.ics` — tabla declarada para SCI (Sistema de Comando de Incidentes) pero no implementada; no desarrollar sobre este módulo sin acuerdo previo
- `/reportes` — redundante con la capa E; candidato a eliminar o redirigir

### 🔜 Pendiente (no iniciar sin acordar alcance)
- Áreas restantes con vistas completas: SG, SN, AD, IM, Jefatura
- SCI digital (formularios ICS 201, 202, 204, 205, 206, 213, 214)
- Notificaciones push
- Rich text en anuncios y adjuntos en solicitudes
- Certificados PDF server-side
- App móvil nativa
- Tests E2E (Playwright)
- CI/CD (GitHub Actions)

---

## Guardia Nocturna — configuración inicial de la 163

| Dormitorio | Camarotes | Camas | Género |
|------------|-----------|-------|--------|
| Dormitorio Masculino | 6 | 12 | Masculino |
| Dormitorio Femenino | 3 | 6 | Femenino |

Configurable desde UI por el Jefe de Guardia correspondiente.

---

## Sincronización CGBVP

- Las credenciales del intranet CGBVP (`bomberosperu.gob.pe/extranet`) se guardan cifradas en **AWS Secrets Manager** y son gestionables desde `/configuracion/cgbvp`.
- El scraper (`scripts/scraper/`) es el origen de los datos de `/operatividad`, `/estadisticas`, `/partes-emergencia`, `/bomberos`, `/asistencias`.
- Guía completa: `docs/CGBVP_SYNC.md`.

> **⚠️ CGBVP bloquea IPs de AWS.** El Lambda scraper (`ubo163-dev-scraper`) falla con timeout en cada invocación — los schedules de EventBridge están **DESHABILITADOS** para evitar facturación. Ejecutar el scraper **localmente** y subir los datos via API (`/api/sync`).
> **No habilitar los schedules** en el CDK ni en la consola AWS hasta resolver el bloqueo de IP.

---

## Documentos de referencia

| Documento | Qué contiene |
|-----------|-------------|
| `docs/ARQUITECTURA_MENU.md` | Arquitectura maestra: 6 capas, rutas completas, modelo de permisos v2, schema BD v2 |
| `docs/PERMISOS_POR_CARGO.md` | Permisos por cargo y tabla endpoint→permiso |
| `docs/ESPECIFICACION_FUNCIONAL.md` | Estado de implementación por módulo |
| `docs/MODULO_ASPIRANTES_E_INSTRUCCION.md` | Spec funcional del módulo de instrucción |
| `docs/CGBVP_SYNC.md` | Manejo de credenciales CGBVP |
| `docs/RESUMEN_ENTREGAS.md` | Historial de entregas y pendientes |
| `docs/AWS_DEPLOYMENT.md` | Arquitectura AWS, costos (~US$57/mes), seguridad |
