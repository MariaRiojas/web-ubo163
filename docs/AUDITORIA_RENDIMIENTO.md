# Auditoría de Rendimiento — CUARTEL-ERP (2026-07-21)

> **Estado de ejecución (mismo día):** P1 ✅ (Lambda a 1024 MB — el CDK ya decía 1024, el 512 en producción era drift), P2 ✅ (5 fetchers paralelizados), P3 ✅ (cache policy custom `ubo163-honor-origin-cc` id `2e7f6d6c-fb68-4346-ac4b-c2c384eed0ea`; la managed UseOriginCacheControlHeaders reenvía `Host` y produce 403 con origen Lambda Function URL — no usarla; CDK actualizado para referenciar la custom), P4 ✅ (denormalización `lessonCount`/`lessonIds`/`requiredLessonIds` + backfill 4/4 cursos). Resultados: landing/login servidos del edge (Hit, ~0.43 s), dinámicas calientes ~0.42–0.53 s, cold start total 3–4 s → ~2.5 s. P5 (warming ping) y P6 quedan como opcionales.

Mediciones reales tomadas sobre producción (`d1bno1kyerz6hk.cloudfront.net`) y CloudWatch Logs de los últimos 3 días.

## Evidencia medida

| Métrica | Valor | Interpretación |
|---------|-------|----------------|
| Lambda memoria | **512 MB** (≈0.5 vCPU) | El SSR de Next.js es CPU-bound: la mitad de un núcleo renderiza lento |
| Cold start (init) | ~890–1,120 ms | + arranque del server Next = primera visita 2–4 s |
| Requests calientes simples | 36–190 ms | Aceptable |
| Requests calientes pesados | 400–1,800 ms, **pico 9.7 s** | Páginas dinámicas con múltiples Scans secuenciales |
| TTFB `/login` (página estática) | 520–1,070 ms | CloudFront **no cachea nada de HTML** — hasta lo prerenderizado va a Lambda |
| CloudFront default behavior | `CachingDisabled` | Confirma lo anterior |
| Scans vs Queries en código | **92 Scans / 66 Queries** | Muchos round-trips completos de tabla |
| `get-area-base-data.ts` | **11–12 `await` secuenciales, cero `Promise.all`** | 150–400 ms solo en latencia de red DynamoDB por página de área |
| Scans de `trainingCourses` | **Sin `ProjectionExpression`** | Cada listado de /capacitacion y /dashboard descarga TODOS los cursos con su HTML de lecciones y quizzes embebidos |
| Auth | JWT puro, DB solo en login | ✅ No es cuello de botella |
| Imágenes públicas | 24 KB total | ✅ No es problema |
| First Load JS compartido | 106 kB | ✅ Razonable (`/registro/etiquetas` 374 kB por bwip-js, aislado) |

## Diagnóstico

La lentitud tiene **tres causas apiladas**, en orden de impacto:

1. **CPU insuficiente en Lambda (512 MB)**. En Lambda la CPU escala con la memoria. Con 0.5 vCPU, renderizar una página React server-side + parsear respuestas de DynamoDB tarda 2–4× más de lo necesario. Es la causa del pico de 9.7 s y de los cold starts largos.
2. **Fetchers secuenciales**. `getAreaBaseData()` hace ~12 llamadas a DynamoDB una tras otra (~15–30 ms c/u de RTT). Otras páginas tienen el mismo patrón en menor grado.
3. **Cero caché de HTML en CloudFront**. Las 8 páginas prerenderizadas (login + landing completa) viajan a Lambda en cada visita, pagando cold start incluido, cuando podrían servirse desde el edge en <50 ms.

## Plan de acción priorizado

### P1 — Subir Lambda a 1024 MB (5 min, el mayor impacto individual)
```powershell
aws lambda update-function-configuration --function-name ubo163-dev-web --memory-size 1024 --profile manbuild
```
Duplica la CPU. El costo por invocación sube 2× pero la duración baja ~2×, así que el costo mensual queda casi igual (Lambda cobra memoria×tiempo). Con el tráfico actual el delta es de centavos. Si tras medir sigue justo, probar 1769 MB (= 1 vCPU completo).
**Nota CDK**: replicar el valor en el stack para que un futuro `cdk deploy` no lo revierta.

### P2 — Paralelizar `get-area-base-data.ts` (30 min)
Agrupar los ~12 `await ddb.send(...)` independientes en 2–3 `Promise.all`. Ahorro estimado: 150–300 ms por carga de cualquier tablero de área. Auditar con el mismo criterio: `get-jefatura-data.ts` (7 scans), `get-faena-data.ts` (6), `get-bomberos-data.ts` (5), `get-areas-hub.ts` (5).

### P3 — Cachear HTML estático en CloudFront (20 min)
Cambiar la cache policy del **default behavior** a la managed policy **UseOriginCacheControlHeaders** (`83da9c7e-98b4-4e11-a168-04f0df8e2c65`). Next.js ya emite `s-maxage=31536000` en páginas prerenderizadas y `no-store` en dinámicas, así que CloudFront cachearía exactamente lo correcto sin tocar la app. Login y landing pasarían de ~600 ms a <50 ms y dejarían de despertar la Lambda.
**Precaución**: verificar tras el cambio que las páginas autenticadas sigan sin cachearse (deben responder `X-Cache: Miss`).

### P4 — `ProjectionExpression` en scans de cursos (30 min)
Los items de `trainingCourses` ahora embeben módulos completos (HTML de lecciones + bancos de preguntas): pueden pesar cientos de KB. Los listados (`/capacitacion`, dashboard, catálogo) solo necesitan metadatos. Agregar `ProjectionExpression: 'courseId, slug, title, subtitle, category, durationHours, active, mandatoryForPostulantes, mandatoryForAspirantes, availableForPostulantes, availableForAspirantes'` a los scans que no rendericen lecciones. Solo `getCourseDetail` y el player necesitan el item completo.

### P5 — Warming ping anti cold start (15 min, ~$0.10/mes)
Regla de EventBridge cada 5 minutos que invoque la Lambda con un GET a `/login`. Elimina el cold start para el primer usuario del día. Mucho más barato que provisioned concurrency (~$4–8/mes). Alternativa: aceptar el cold start (con P1 baja a ~1.5 s total).

### P6 — Opcionales (evaluar después de medir P1–P4)
- **arm64/Graviton**: ~20 % mejor precio-rendimiento; viable porque `bcryptjs` es JS puro (sin binarios nativos). Requiere rebuild + cambio CDK.
- **Lazy-load del composer Tiptap**: `next/dynamic` para que `/comunicados` no cargue el editor hasta abrir el formulario.
- **`next/dynamic` para bwip-js** en `/registro/etiquetas` (374 kB First Load).
- **Scan→Query** donde exista GSI (p. ej. `internalRequests` SÍ tiene `toSectionId-createdAt-index` físico aunque el código actual usa Scan).

### Qué NO hacer
- **No** activar `AWS_LWA_INVOKE_MODE: response_stream` (rompe Content-Type, documentado en CLAUDE.md).
- **No** provisioned concurrency ni DAX ni ElastiCache: sobredimensionado para este tráfico y rompe la restricción de costos (~US$57/mes actuales).
- **No** habilitar los schedules del scraper (bloqueo IP CGBVP, regla vigente).

## Resultado esperado

| Escenario | Hoy | Tras P1–P4 |
|-----------|-----|------------|
| Login / landing | 0.5–1.1 s | **<50 ms** (edge cache) |
| Página dinámica caliente | 0.4–1.8 s | **0.2–0.6 s** |
| Peor caso (tablero de área frío) | 4–10 s | **~1.5–2.5 s** |
