# Auditoría de Seguridad — CUARTEL-ERP (2026-07-21)

Hallazgos verificados contra el código y la infra real de producción (AWS profile `manbuild`, distribución `E29S9K40S665N4`, Lambda `ubo163-dev-web`). Severidad según impacto × probabilidad en el contexto real de esta app (ERP interno de un cuerpo de bomberos, ~2,749 requests/mes, datos de personal).

## Resumen ejecutivo

| # | Hallazgo | Severidad | Esfuerzo fix |
|---|----------|-----------|--------------|
| 1 | `next@15.1.0` con CVE crítico (DoS por Server Actions) + 11 highs en deps | **Crítico** | 30 min |
| 2 | Lambda Function URL `AuthType: NONE` y públicamente alcanzable — evita CloudFront | **Alto** | 1–2 h |
| 3 | `AUTH_SECRET` en texto plano en variables de entorno del Lambda | **Alto** | 30 min |
| 4 | Sin límite de intentos de login (fuerza bruta) | **Medio** | 1–2 h |
| 5 | Logs de auth filtran usuarios/emails ("Contraseña incorrecta: <usuario>") | **Medio** | 15 min |
| 6 | XSS almacenado: `lesson.content` de instructor se renderiza sin sanitizar | **Medio** | 20 min |
| 7 | Middleware no cubre `/areas`, `/faena`, `/capacitacion`, `/biblioteca`, `/anuncios` | **Medio** | 20 min |
| 8 | Token de sync comparado con `===` (timing attack) | **Bajo** | 10 min |
| 9 | 2 rutas API sin check de sesión (`inventory/template`, `inventory/validate`) | **Bajo** | 15 min |

## Lo que está BIEN (verificado, no tocar)

- **S3 `ubo163-dev-media`**: los 4 flags de Block Public Access en `true`. ✅
- **Presign de subidas** (`app/api/storage/presign/route.ts`): valida `contentType` contra allowlist y tamaño ≤ 20 MB antes de firmar. ✅
- **Autorización por endpoint sensible**: `reset-password` exige `personnel.edit`/`area.admin.manage`, `courses [id]` exige `area.instruction.manage`, `requerimientos` pasa por `requireAreaManage()`. ✅
- **Anuncios**: `anuncio-content.tsx` sí sanitiza con DOMPurify antes de `dangerouslySetInnerHTML`. ✅
- **Sesión**: JWT con expiración de 8 h; contraseñas con bcryptjs. ✅
- **IAM del Lambda**: políticas con nombre acotado (LibraryDocuments, TrainingTables) en vez de `*` amplio. ✅

---

## Detalle y remediación

### 1 · [CRÍTICO] Dependencias vulnerables — `npm audit`: 1 crítica, 11 altas
`next@15.1.0` tiene un CVE **crítico** de DoS vía Server Actions (la app usa Server Actions intensivamente: faena, capacitación, requerimientos). Otras highs relevantes: `nodemailer` (inyección de comandos SMTP — la app envía correo por SES), `lodash`, `js-yaml`.
**Fix**: `npm update next@latest` dentro de la línea 15.x (probar `15.5.x`), luego `npm audit fix`. Rebuild + deploy. Verificar que el build de standalone sigue OK. Las de `basic-ftp`/`glob`/`tmp` suelen venir de devDependencies (CDK) y no van al bundle de producción — confirmar con `npm audit --omit=dev`.

### 2 · [ALTO] Function URL pública evita CloudFront
`aws lambda get-function-url-config` → `AuthType: NONE`. La URL `https://3fkhax53...lambda-url.us-east-1.on.aws/` es alcanzable directamente (se confirmó durante el incidente de P3: respondía 200 saltándose CloudFront). Un atacante que descubra esa URL evita los security headers, el cacheo y cualquier WAF futuro, y puede martillar el origen directamente.
**Fix**: migrar a **OAC de CloudFront para Function URLs** — cambiar `AuthType` a `AWS_IAM` y adjuntar un Origin Access Control en la distribución para que solo CloudFront (firmando con SigV4) pueda invocar el origen. CDK soporta esto en `FunctionUrlOrigin` reciente. Requiere prueba cuidadosa en dev (el mismo tipo de cambio que rompió P3 la primera vez).

### 3 · [ALTO] `AUTH_SECRET` en variables de entorno en texto plano
La config del Lambda expone `AUTH_SECRET` como variable de entorno legible por cualquiera con `lambda:GetFunctionConfiguration` (apareció en texto claro durante la auditoría de rendimiento). El resto de secretos (SES, app-secrets) sí usan Secrets Manager — este quedó fuera del patrón.
**Fix**: mover `AUTH_SECRET` a Secrets Manager (ya hay ARNs para otros: `ubo163/dev/app-secrets`) y leerlo en runtime como los demás. Rotar el valor actual tras moverlo, porque estuvo expuesto. Ajustar el CDK.

### 4 · [MEDIO] Sin rate limiting en login
`grep` de rate-limit/attempts/lockout en `lib/auth` y `app/api/auth` → sin resultados. El `authorize()` de NextAuth permite intentos ilimitados; con SSR barato y sin CAPTCHA, un atacante puede probar credenciales masivamente contra `/api/auth/callback/credentials`.
**Fix**: contador de intentos por usuario/IP en DynamoDB (TTL corto) con lockout tras N fallos, o un rate-limit a nivel de edge. Bajo el tráfico actual, incluso un límite simple de 5 intentos/5 min por usuario es suficiente.

### 5 · [MEDIO] Logging sensible en autenticación
`lib/auth/config.ts` líneas 92–119 registran en CloudWatch: `Contraseña incorrecta: <username>`, `Perfil sin userId vinculado: <email>`, roles y permisos completos. Permite **enumeración de usuarios** y expone datos de personal a cualquiera con acceso a los logs.
**Fix**: eliminar/rebajar estos `console.log`. No loguear el username en fallos de contraseña; usar un mensaje genérico. Mantener a lo sumo un contador anónimo de fallos.

### 6 · [MEDIO] XSS almacenado en el player de lecciones
`components/capacitacion/lesson-player.tsx` (líneas 134, 295, 407) renderiza `lesson.content` con `dangerouslySetInnerHTML` **sin DOMPurify** (a diferencia de anuncios). El contenido lo escribe un instructor (`training.manage`); un instructor malicioso o comprometido podría inyectar `<script>` que se ejecuta en el navegador de **todos los alumnos** (robo de sesión, acciones en su nombre).
**Fix**: sanitizar igual que en anuncios — importar el mismo helper de DOMPurify y envolver el `content` antes de renderizar, tanto en `mini-quiz`/bloques como en las 3 llamadas a `toHtml()`. Es código propio reciente; el fix es idéntico al patrón ya usado en `anuncio-content.tsx`.

### 7 · [MEDIO] Middleware no protege rutas de áreas
`middleware.ts` `PROTECTED_PREFIXES` **no incluye** `/areas`, `/faena`, `/capacitacion`, `/biblioteca`, `/anuncios`. Hoy cada página hace su propio `auth()` + `redirect` (verificado en varias), así que no hay puerta abierta, pero se depende 100% de que **cada** página nueva recuerde su guard — un olvido = exposición directa.
**Fix**: agregar esos prefijos a `PROTECTED_PREFIXES` como defensa en profundidad. Costo cero y no rompe nada (las páginas ya redirigen igual).

### 8 · [BAJO] Comparación de token no constante
`app/api/sync/route.ts`: `req.headers.get('x-sync-token') === SYNC_SECRET`. Comparación con cortocircuito → filtra información por timing. Riesgo bajo (token largo, aleatorio, endpoint interno) pero trivial de corregir.
**Fix**: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` con verificación previa de longitud.

### 9 · [BAJO] Rutas API sin sesión
`app/api/inventory/template` y `app/api/inventory/validate` no verifican `auth()`. No exponen datos reales (generan/validan una plantilla Excel), pero cualquier anónimo puede invocarlas y consumir CPU.
**Fix**: añadir el check estándar `const session = await auth(); if (!session?.user) return 401`. (`api/auth/[...nextauth]` es correcto que no lo tenga.)

---

## Plan de acción sugerido

1. **Hoy** (rápidos, alto impacto): #1 (update deps), #5 (quitar logs), #6 (sanitizar player), #7 (middleware), #8, #9.
2. **Esta semana** (requieren prueba en infra): #3 (mover AUTH_SECRET + rotar), #2 (OAC Function URL), #4 (rate limiting).

## Asignación por modelo (según complejidad)

Criterio: Haiku 4.5 = mecánico/acotado · Sonnet 5 = feature con patrón existente o verificación de build · Opus 4.8 = infra riesgosa o cambio multi-capa (runtime + CDK + AWS).

| # | Observación | Modelo | Justificación |
|---|-------------|--------|---------------|
| 5 | Quitar logs sensibles de auth | **Haiku 4.5** | Borrado/rebaja de ~6 `console.log` en un archivo, sin lógica |
| 7 | Middleware: agregar prefijos protegidos | **Haiku 4.5** | Añadir strings a `PROTECTED_PREFIXES`; cero riesgo |
| 8 | `timingSafeEqual` en token de sync | **Haiku 4.5** | Swap puntual a primitiva `crypto` con check de longitud |
| 9 | Auth en 2 rutas inventory | **Haiku 4.5** | Insertar el guard estándar `auth()` → 401, patrón repetido |
| 6 | Sanitizar XSS en lesson-player | **Sonnet 5** | Replicar patrón DOMPurify de `anuncio-content.tsx` respetando el render SSR de dos pasadas (no romper hidratación) |
| 1 | Update deps (`next@latest` + audit fix) | **Sonnet 5** | Bump con posibles breaking changes; requiere rebuild + verificar standalone + smoke test |
| 4 | Rate limiting de login | **Sonnet 5** | Feature acotado: contador en DynamoDB con TTL + lockout; patrón claro pero con diseño (clave por usuario/IP) |
| 3 | `AUTH_SECRET` → Secrets Manager + rotar | **Opus 4.8** | Toca carga de secreto en runtime + CDK + rotación coordinada sin cerrar sesiones vivas de golpe |
| 2 | OAC para Function URL | **Opus 4.8** | Infra crítica: `AuthType AWS_IAM` + OAC en CloudFront + CDK, con el mismo riesgo de 403 que rompió P3 — exige prueba cuidadosa y rollback listo |

**Orden de ejecución**: lote Haiku (#5, #7, #8, #9) primero — sin riesgo, un solo build/deploy los cubre. Luego lote Sonnet (#6, #1, #4). Los de infra (#3, #2) al final, uno a uno, cada uno con verificación y rollback como en P3. #4 debe ir **después** de #1 (el update de Next puede tocar el middleware/edge donde viviría el rate-limit).

## Fuera de alcance / no hacer
- No exponer nada nuevo del scraper (bloqueo IP CGBVP, regla vigente).
- No añadir WAF de pago aún — el hallazgo #2 (OAC) cierra el vector principal sin costo recurrente.
- No introducir dependencias pesadas de seguridad; los fixes usan primitivas ya presentes (crypto nativo, DOMPurify ya instalado, Secrets Manager ya en uso).
