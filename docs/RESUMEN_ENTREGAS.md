# Resumen de Entregas — CUARTEL-ERP

Consolidado de las 10 entregas que transformaron el proyecto de un CRM básico a un ERP operativo completo para la Compañía de Bomberos Voluntarios N.° 163 (Ancón, Perú).

---

## Entregas previas (cerradas antes del plan de 10)

Estas entregas sentaron las bases:

| # | Título | Salida |
|---|---|---|
| — | **Documento de costeo AWS** | `docs/COSTEO_APROBACION.md` · ~US$57/mes |
| — | **Sistema de inventario v1** | Import Excel + preview editable + adjuntos (fichas/actas/fotos) |
| — | **Sincronización CGBVP** | Credenciales cifradas en Secrets Manager auto-gestionables |
| — | **Documento de arquitectura** | `docs/ARQUITECTURA_MENU.md` · 900+ líneas con 6 capas de navegación y schema v2 |
| — | **Roadmap integración CGBVP** | Scraper hoy → API oficial cuando haya 10+ compañías |
| — | **Guía de redacción institucional** | `docs/GUIA_REDACCION.md` con vocabulario oficial RIF |
| — | **Infra CDK base** | 7 stacks: Secrets, Network, Storage, Database, Scraper, App, Observability |

---

## Las 10 entregas

### Entrega 1 — Arquitectura v2 y mockups
- **Arquitectura:** 6 capas de navegación + schema v2 con 18 tablas Drizzle
- **5 mockups HTML validados** con lenguaje institucional (sidebar responsive, mi perfil, faena, capacitación, guardia nocturna)
- **Seed v2** con 2 dormitorios + 9 camarotes + 18 camas + 4 máquinas + 42 compartimientos con QR + 11 cursos + 6 documentos de biblioteca

**Archivos:** `docs/ARQUITECTURA_MENU.md`, `design-mockups/*`, `data/seed-v2.ts`

---

### Entrega 2 — Schema Drizzle v2
18 tablas que cubren todo el dominio:
- `profiles` (+postulante +gender), `users`, `sections`, `section-roles` (+jefe_guardia_m/f)
- **Guardia nocturna:** `guard-dormitories`, `guard-bunks`, `guard-beds-v2`, `guard-reservations`
- **Máquinas:** `machines`, `machine-compartments` (+QR), `checklist-definitions`, `checklist-executions`, `checklist-item-results`
- **Inventario:** `inventory` (32 cols +compartmentId), `inventory-attachments`
- **Capacitación (LMS):** `courses`, `course-lessons`, `course-enrollments`, `lesson-progress`, `library-documents`, `external-certificates`
- **Anuncios:** `announcements` (con flujo aprobación + audiencia granular), `announcement-reads`
- **Emergencias CGBVP:** `emergencies`, `emergency-vehicles`, `emergency-crew-members`, `hired-drivers`, `cgbvp-attendance`, etc.
- **SCI base:** `ics-incidents`, `ics-forms` (stub)

---

### Entrega 3 — Sidebar institucional + Permisos v2
- **`lib/auth/permissions.ts`** (485 líneas) — 65+ permisos granulares
  - `area.<sec>.*`, `guard.*` por género, `faena.receive_*`, `training.*`, `profile.*`, `inventory.*`, `announcements.*`
- **`lib/navigation/menu-builder.ts`** (321 líneas) — builder que genera 6 capas de menú desde JWT
- **`app/globals.css`** — scope `.intranet-theme` con paleta institucional (ink-black, red-163, brass), fonts Fraunces + Inter Tight + JetBrains Mono
- **`app/layout.tsx`** — integración `next/font/google`
- **`components/intranet/sidebar.tsx`** (382 líneas) — sidebar con sellos alfabéticos MQ/SG/IN/SN/AD/IM, toggle colapsar, corner brackets
- **`components/intranet/mobile-nav.tsx`** (274 líneas) — drawer institucional
- **`app/(intranet)/layout.tsx`** — body con `.intranet-theme`, backgrounds atmosféricos, footer motto

---

### Entrega 4 — Mi Perfil enriquecido
- **`lib/perfil/get-perfil-data.ts`** (393 líneas) — data fetcher completo
- **`components/perfil/`** con hero + 6 tabs:
  - Datos personales (4 cards con corner brackets)
  - Formación (stats + completados + en progreso + certificados externos)
  - Equipos asignados (grid con iconos por subcategoría EPP)
  - Historial operativo (trimestre con proyección + tabla mensual + emergencias)
  - Condecoraciones (empty state + 5 grados NDR)
  - Ascensos (timeline + próximo grado con requisitos)
- **Datos reales:** horas acumuladas, próximo ascenso calculado por NDR, equipos filtrados por `assignedProfileId`

---

### Entrega 5 — Guardia Nocturna v2
- **Separación real por género** (filtra por `profile.gender`)
- **`lib/guardia-nocturna/get-guardia-data.ts`** (418 líneas) con dormitorio + camarotes + reservas + KPIs del mes
- **`lib/guardia-nocturna/actions.ts`** — reserveBed, cancelReservation, toggleBedStatus, markReservationStatus
- **Vista del efectivo:**
  - Stats del mes (próxima guardia, cumplidas, pendientes, horas acreditadas)
  - Calendario navegable con estados visuales (past/today/available/full/selected/mine)
  - Panel de camas agrupadas por camarote con estados (disponible/reservada/ocupada/fuera_servicio/mi_reserva)
- **Vista del Jefe de Guardia** (solo con permiso del género correspondiente):
  - Banner con sello JGM/JGF
  - Tabla de configuración de camas (toggle disponible/indisponible con motivo)
  - Lista de reservas con acciones cumplida/no_asistio/cancelar

---

### Entrega 6 — Faena y Servicio
- **3 tabs:** Inspecciones, Mis Incidencias, Mis Solicitudes
- **Detección automática de turno** (mañana/tarde/noche) con countdown
- **Machine cards** con iconos por kind + progreso visual del checklist
- **Ruta `/faena/qr/[qrCode]`** que resuelve el QR y redirige al checklist
- **Ruta `/faena/checklist/[executionId]`** con:
  - Lista de ítems con 3 botones (Presente / Faltante / Dañado)
  - Alertas inline ("se creará solicitud al finalizar")
  - Progreso mini-bar
- **Al finalizar checklist:**
  - Auto-genera solicitud de reposición para ítems faltantes → área correspondiente
  - Auto-genera incidencia para ítems dañados → Área de Máquinas
- **`lib/faena/actions.ts`** (469 líneas) — startOrContinueExecution, setItemResult, finishExecution, createIncident, createRequest

---

### Entrega 7 — Capacitación (LMS)
- **Summary:** horas acumuladas con ring progress SVG + 4 métricas
- **Cursos en progreso** con banner decorativo por categoría (BREC, MATPEL, Rescate)
- **Catálogo Escuela Técnica** con:
  - Status computado (completado/progreso/disponible/locked) según grado del efectivo
  - Filtros por categoría (MATPEL, Rescate, Cuerdas, Normas, Autoprotección)
- **Card ESBAS destacada** con promoción + calificación + horas
- **Biblioteca** con preview (top 4) + página completa `/biblioteca` con filtros y búsqueda
- **Detalle de curso** `/capacitacion/[slug]` con:
  - Botón contextual (Inscribirme / Abandonar / Locked con razón)
  - Lista de lecciones con status + icon por contentType + input inline de 0-20 para evaluaciones
  - Auto-completado del curso cuando todas las lecciones required están done + cálculo de finalGrade como promedio
- **Actions:** enrollInCourse, unenrollFromCourse, markLessonComplete, unmarkLesson

---

### Entrega 8 — Áreas por sección (Fase 1 = Máquinas)
- **Hub `/areas`** con 3 bloques (Jefatura, Línea, Asesoramiento) y cards con sellos alfabéticos grandes
- **`/areas/maquinas`** — vista completa:
  - Hero institucional con sello MQ + responsable del área
  - 5 KPIs (Personal, Máquinas, Ítems, Bandeja, Checklists hoy)
  - 5 tabs navegables:
    1. Máquinas (cards con compartimientos + QR visible)
    2. Personal (rows ordenadas por rol jefe/adjunto/miembro)
    3. Inventario (tabla con ubicación máquina → compartimiento)
    4. Bandeja recibida (incidencias + solicitudes dirigidas al área)
    5. Checklists (log de 15 ejecuciones recientes)
- **`/areas/[key]`** — placeholder institucional para las 5 áreas restantes con lista de funcionalidades previstas
- **Metadata `AREAS_META`** con seal/type/ref normativa/phase/implemented

---

### Entrega 9 — Anuncios con flujo de aprobación
- **Flujo completo:** Jefe crea borrador → Primer Jefe aprueba/rechaza → publicado con audiencia granular
- **3 vistas tab** según `capabilities`:
  - **Buzón** — anuncios filtrados por audiencia real (SQL con `ANY()` sobre `audienceGrades`)
  - **Mis anuncios** — agrupados por estado con headers mono (pendientes, rechazados con motivo visible, borradores, publicados, archivados)
  - **Pendientes de aprobar** (Primer Jefe) con panel de review inline
- **Composer** con 3 modos de audiencia mutuamente excluyentes:
  - Todos / Grupos (all bomberos + aspirantes + postulantes)
  - Por grados (checkboxes para 8 grados CGBVP)
  - Directo a persona (search por nombre o código CGBVP)
- **Summary preview live** "Llegará a: [tags]"
- **`lib/anuncios/actions.ts`** — createDraft, updateDraft, submitForApproval, approve, reject (con motivo obligatorio), markAsRead, archive, deleteMyDraft

---

### Entrega 10 — Refinamiento + Deploy AWS
- **Auditoría completa de build** — TSC limpio al 100%, 0 errores
- **Fix de drift** en `/estadisticas` y `/partes-emergencia` (redirigidas a `/reportes`)
- **`data/seed.ts`** deprecado con stub apuntando a `seed-v2.ts`
- **Scraper partes-cia.ts** con import correcto de cheerio
- **`docs/DEPLOY.md`** (304 líneas) — guía paso a paso end-to-end
- **`scripts/deploy.ps1`** (PowerShell 227 líneas) + **`scripts/deploy.sh`** (bash 181 líneas) con:
  - Validación de account AWS
  - TSC check + build Next.js
  - CDK synth + deploy ordenado por dependencias
  - Migraciones db:push automáticas desde Secret
  - Verificación CloudFront post-deploy
  - Flags `--skip-build`, `--skip-migrations`, `--only-stack`
- **`README.md` principal** (436 líneas) con stack, arquitectura, instalación, scripts, estructura, permisos, roadmap
- **`docs/RESUMEN_ENTREGAS.md`** (este documento)

---

## Métricas finales

### Código
| Área | Archivos | Líneas aprox |
|---|---|---|
| Schemas Drizzle | 18 | ~3,500 |
| Libs (fetchers + actions) | 30+ | ~7,000 |
| Componentes client | 50+ | ~12,000 |
| Pages Next.js | 40+ | ~3,500 |
| CSS institucional (.intranet-theme) | 1 | ~3,000 líneas nuevas |
| Infra CDK | 7 stacks | ~2,500 |
| Scripts | 2 deploy + scraper | ~1,500 |
| Documentación | 10+ docs | ~5,000 líneas |
| **Total** | **160+** | **~38,000 líneas** |

### Rutas del intranet
- **35 rutas funcionales** (server components + dynamic routing)
- **10 rutas legacy** redirigidas con 200 B cada una
- **4 rutas API** (inventory import, library, storage presign, sync)

### Build
- **First Load JS compartido:** 106 kB
- **Middleware:** 85.1 kB
- **Rutas pesadas:** inventario (32.7 kB), configuración (14.8 kB)
- **Rutas promedio:** 4-9 kB

---

## Estado al cerrar Entrega 10

### ✅ Implementado y funcional
- Base de datos completa (schema v2 con 18 tablas)
- Permisos v2 granulares (65+ permisos)
- 9 módulos operativos con lenguaje institucional unificado
- Infraestructura CDK lista para deploy
- Scripts de deploy + migraciones
- Documentación técnica + operativa
- TSC limpio al 100%
- Build Next.js verde

### 🔜 Pendiente (fuera del plan de 10)
- Áreas restantes (fases 2-4): SG, IN, SN, AD, IM, Jefatura con vistas completas
- SCI digital (formas ICS 201, 202, 204, 205, 206, 213, 214)
- Notificaciones push a dispositivos
- Rich text / markdown en anuncios
- Adjuntos en anuncios y solicitudes
- Certificados PDF generados server-side
- App móvil nativa (React Native)
- Tests E2E con Playwright
- CI/CD con GitHub Actions

---

## Despliegue

**Listo para producción:**

```bash
./scripts/deploy.ps1    # Windows
./scripts/deploy.sh     # Linux/macOS
```

La guía completa de deploy está en [`docs/DEPLOY.md`](DEPLOY.md).

---

## Contacto funcional

- **Sccionaria María Elena Riojas Mendoza** — Código CGBVP A23118, UBO 163 Ancón
- **Primer Jefe** — aprueba anuncios y configura credenciales CGBVP

---

**Dios · Patria · Humanidad**
