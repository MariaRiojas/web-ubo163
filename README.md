# CUARTEL-ERP

Sistema de gestión integral (ERP) para compañías de bomberos voluntarios del **CGBVP** (Cuerpo General de Bomberos Voluntarios del Perú).

> **Dios · Patria · Humanidad**

Open-source · Next.js 15 · PostgreSQL 15 · Drizzle ORM · NextAuth v5 · AWS CDK

---

## Instancia actual

- **Compañía:** UBO N.° 163 — Ancón, Lima
- **Fundada:** 2000 (categoría "menor a 50 años" — Art. 113 RIF)
- **Lema:** "Dios · Patria · Humanidad"

Este proyecto comenzó como un CRM institucional simple y evolucionó a un **ERP operativo completo** con 9 módulos funcionales, integración con el portal CGBVP, y despliegue serverless en AWS.

---

## Módulos implementados

### Para el efectivo
| Módulo | Descripción | Ruta |
|---|---|---|
| **Mi Perfil** | Legajo institucional con 6 pestañas (datos, formación, equipos, historial operativo, condecoraciones, ascensos) | `/perfil` |
| **Guardia Nocturna v2** | Reservas con separación real por género (dormitorios + camarotes + camas) | `/guardia-nocturna` |
| **Faena y Servicio** | Inspecciones con QR de compartimientos, incidencias, solicitudes a áreas | `/faena` |
| **Capacitación** | LMS básico con catálogo ESBAS + Escuela Técnica (MATPEL, BREC, BREI, REC, CRECL, Supervivencia, NFPA) + biblioteca | `/capacitacion` |
| **Anuncios** | Con flujo de aprobación del Primer Jefe + audiencia granular | `/anuncios` |

### Para jefaturas y áreas
| Módulo | Descripción | Ruta |
|---|---|---|
| **Áreas por sección** | Vista institucional del RIF (Art. 112-117): Jefatura, Máquinas, Servicios Generales, Instrucción, Sanidad, Administración, Imagen | `/areas` |
| **Área de Máquinas** | Vista completa con personal + máquinas + compartimientos + QR + inventario + bandeja de incidencias/solicitudes recibidas + checklists | `/areas/maquinas` |
| **Inventario** | Gestión con import Excel + adjuntos (fichas/actas/fotos) | `/inventario` |
| **Biblioteca institucional** | RIF, NDR, procedimientos, normativa externa — filtrada por grado | `/biblioteca` |

### Transversales
- **Dashboard** con KPIs del usuario
- **Reportes** con cumplimiento NDR, horas, emergencias
- **Personal** con directorio de la compañía
- **Configuración** con sincronización CGBVP auto-gestionable
- **Sistema de Comando de Incidentes (SCI)** — roadmap en `docs/SCI.md`

---

## Stack tecnológico

### Frontend
- **Next.js 15** con App Router + Server Components
- **React 19**
- **TypeScript 5** estricto
- **Tailwind CSS** con tokens institucionales
- **next/font/google** para Fraunces + Inter Tight + JetBrains Mono
- **Lucide React** para iconos
- **shadcn/ui** para componentes base

### Backend y datos
- **NextAuth v5** para autenticación (JWT + credentials provider)
- **Drizzle ORM** con schema typesafe
- **PostgreSQL 15** (Neon en dev, RDS en AWS)
- **Server Actions** para mutaciones (no REST API)

### Infraestructura AWS
- **Lambda** con Lambda Web Adapter (Next.js standalone)
- **CloudFront** + **API Gateway**
- **RDS PostgreSQL t4g.micro** + **RDS Proxy**
- **S3** para adjuntos e imágenes
- **Secrets Manager** para credenciales cifradas
- **ECS Fargate** para scraper del portal CGBVP (cada 2 min)
- **CloudWatch** para logs y alarmas
- **AWS CDK v2** para IaC

### Integraciones
- **Portal CGBVP** — scraper con Puppeteer + Cheerio para partes de emergencia, asistencia, estado de vehículos
- **Roadmap API oficial** cuando haya 10+ compañías usando el ERP

---

## Arquitectura del sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        CloudFront                              │
│  (CDN + routing estático)                                      │
└──────────────┬───────────────────────────────┬────────────────┘
               ▼                               ▼
        ┌──────────────┐              ┌──────────────┐
        │  API Gateway │              │      S3      │
        │ (autorizador)│              │ (assets +    │
        └──────┬───────┘              │  adjuntos)   │
               ▼                      └──────────────┘
        ┌──────────────┐
        │    Lambda    │────→ Secrets Manager (NEXTAUTH_SECRET, etc.)
        │   (Next.js   │
        │  standalone) │────→ ┌──────────────────┐
        └──────┬───────┘       │   RDS Proxy      │
               ▼               └────────┬─────────┘
        ┌──────────────┐                ▼
        │  EventBridge │       ┌──────────────────┐
        │  (cron 2min) │       │ RDS PostgreSQL   │
        └──────┬───────┘       │    (t4g.micro)   │
               ▼               └──────────────────┘
        ┌──────────────┐                ▲
        │ ECS Fargate  │                │
        │  (scraper    │────────────────┘
        │  puppeteer)  │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │ Portal CGBVP │
        │ sintes.cgbvp │
        └──────────────┘
```

Detalle completo en `docs/ARQUITECTURA_MENU.md` (900+ líneas) y `docs/AWS_DEPLOYMENT.md`.

---

## Requisitos para desarrollo local

- **Node.js 20+**
- **Docker** y **Docker Compose** (PostgreSQL + MinIO + Mailpit)
- **npm 10+**

---

## Instalación local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd web-ubo163
npm install
```

### 2. Levantar servicios locales

```bash
docker compose up -d
# PostgreSQL en localhost:5432
# MinIO en localhost:9000 (consola en :9001)
# Mailpit en localhost:1025 (UI en :8025)
```

### 3. Variables de entorno

Copiar `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Ajustar:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cuartel_crm
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

### 4. Migraciones y seed

```bash
npm run db:push
npm run db:seed:v2          # seed institucional completo
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000

---

## Scripts disponibles

```bash
# Desarrollo
npm run dev                 # Next.js en modo dev (puerto 3000)
npm run build               # Build standalone para Lambda
npm run start               # Start del build

# Base de datos
npm run db:push             # Aplicar schema (Drizzle)
npm run db:studio           # Drizzle Studio (puerto 4983)
npm run db:seed:v2          # Seed institucional v2 (todas las tablas)
npm run db:seed:operativo   # Seed de partes/emergencias (opcional)

# Scraper
npm run scraper:run         # Ejecutar scraper una vez (requiere credenciales)

# Testing
npx tsc --noEmit            # Type-check

# Deploy
./scripts/deploy.ps1        # Deploy completo a AWS (PowerShell)
./scripts/deploy.sh         # Deploy completo a AWS (bash)
```

---

## Configuración por compañía

El único archivo que cada compañía necesita editar para personalizar el ERP es **`company.config.ts`**:

```ts
export const companyConfig = {
  id: "163",
  name: "Compañía de Bomberos Voluntarios Ancón",
  shortName: "Bomberos Ancón 163",
  motto: "Dios-Patria-Humanidad",
  foundedYear: 2000,
  ageCategory: "menos_50",       // determina jerarquía de grados
  location: { department: "Lima", province: "Lima", district: "Ancón", ... },
  contact: { phone: "116", emergency: "911", ... },
  theme: {
    primary: { h: 0, s: 84, l: 60 },  // rojo bomberos por default
    logoPath: "/logo.png",
    heroImages: [...],
  },
  features: {
    landing: true,
    intranet: true,
    guardianocturna: true,
    esbas: true,
    // ... toggle por módulo
  },
}
```

Una sola edición + un logo en `/public/logo.png` + imágenes en `/public/hero/`, y la aplicación queda completamente rebrandeada.

---

## Estructura del proyecto

```
web-ubo163/
├── app/                        # Next.js App Router
│   ├── (intranet)/             # Rutas autenticadas
│   │   ├── dashboard/
│   │   ├── perfil/
│   │   ├── guardia-nocturna/
│   │   ├── faena/
│   │   ├── capacitacion/
│   │   ├── anuncios/
│   │   ├── areas/
│   │   └── ...
│   ├── (public)/               # Landing pública
│   ├── login/
│   ├── globals.css             # Tokens institucionales .intranet-theme
│   └── layout.tsx              # Fonts + providers
├── components/
│   ├── intranet/               # Sidebar, mobile-nav, shared
│   ├── perfil/                 # 6 tabs del perfil
│   ├── guardia/                # Vista efectivo + jefe
│   ├── faena/                  # Checklist executor + tabs
│   ├── capacitacion/           # LMS
│   ├── anuncios/               # Composer + card + client
│   ├── areas/                  # Área de Máquinas
│   ├── inventario/             # Import + adjuntos
│   └── ui/                     # shadcn
├── lib/
│   ├── db/schema/              # Schemas Drizzle (18 tablas)
│   ├── auth/                   # NextAuth + permissions v2
│   ├── navigation/             # Menu builder
│   ├── perfil/                 # Fetchers + actions
│   ├── guardia-nocturna/
│   ├── faena/
│   ├── capacitacion/
│   ├── anuncios/
│   ├── areas/
│   └── cgbvp/                  # Scraper lib + sync
├── data/
│   ├── seed-v2.ts              # Seed institucional
│   └── seed-operativo.ts       # Seed de partes (opcional)
├── scripts/
│   ├── deploy.ps1              # Deploy automatizado AWS
│   ├── deploy.sh
│   └── scraper/                # Scraper CGBVP
├── infra/
│   └── cdk/                    # IaC AWS
│       ├── bin/app.ts
│       └── lib/stacks/         # 7 stacks
├── design-mockups/             # Mockups HTML validados
│   ├── inventario/
│   ├── sidebar-responsive/
│   ├── mi-perfil/
│   ├── guardia-nocturna/
│   ├── faena-servicio/
│   └── capacitacion/
├── docs/                       # Documentación institucional
│   ├── ARQUITECTURA_MENU.md    # 900+ líneas
│   ├── AWS_DEPLOYMENT.md
│   ├── COSTEO_APROBACION.md
│   ├── DEPLOY.md
│   ├── GUIA_REDACCION.md
│   ├── CGBVP_SYNC.md
│   ├── INVENTARIO.md
│   ├── ROADMAP_CGBVP_INTEGRATION.md
│   ├── SCI.md
│   └── RESUMEN_ENTREGAS.md
├── company.config.ts           # ÚNICO archivo a editar por compañía
└── README.md
```

---

## Sistema de permisos

El ERP tiene **65+ permisos granulares** derivados automáticamente del grado y rol de sección:

- `area.<seccion>.view/manage` — 12 permisos (6 secciones × 2)
- `guard.reserve_bed`, `guard.manage_<gender>`, `guard.config_beds_<gender>`
- `faena.create_incident/request/checklist`, `faena.receive_*_<seccion>`
- `training.access_esbas/escuela_tecnica/*` — 6 permisos LMS
- `announcements.create_draft/publish`
- `inventory.manage_section/manage_all`
- `profile.view_own/edit_own/view_any/edit_any`
- `reports.view_all`, `system.admin`, `system.manage_users`

La resolución es automática en `lib/auth/permissions.ts`:

- **Postulantes** → BASE + training.access_esbas
- **Aspirantes** → + ESBAS
- **Efectivos activos** → + FAENA + training.access_escuela_tecnica
- **Jefes de sección** → + permisos de área + bandejas de incidencias/solicitudes + específicos por tipo (máquinas, sanidad, etc.)
- **Adjuntos** → permisos de view + bandejas + manage para áreas con inventario crítico
- **Jefes de Guardia M/F** → solo su género
- **Primer Jefe** → todo + announcements.publish

---

## Documentación

- `docs/ARQUITECTURA_MENU.md` — Arquitectura completa y navegación
- `docs/DEPLOY.md` — Guía paso a paso de deploy AWS
- `docs/AWS_DEPLOYMENT.md` — Detalle de cada stack CDK
- `docs/COSTEO_APROBACION.md` — Presupuesto AWS (~US$57/mes fase A)
- `docs/CGBVP_SYNC.md` — Integración con portal CGBVP
- `docs/ROADMAP_CGBVP_INTEGRATION.md` — Scraper → API oficial
- `docs/INVENTARIO.md` — Módulo de inventario + import Excel
- `docs/SCI.md` — Sistema de Comando de Incidentes (roadmap)
- `docs/GUIA_REDACCION.md` — Vocabulario institucional RIF / NDR
- `docs/RESUMEN_ENTREGAS.md` — Progreso detallado de las 10 entregas

---

## Deploy a producción

Ver guía completa en [`docs/DEPLOY.md`](docs/DEPLOY.md).

Quick reference:

```bash
# Validar build local
npx tsc --noEmit
npm run build

# Deploy completo a AWS (cuenta manbuild, us-east-1)
./scripts/deploy.ps1     # Windows
./scripts/deploy.sh      # Linux/macOS/CI

# Post-deploy
npm run db:push          # migraciones
npm run db:seed:v2       # seed inicial
# Configurar credenciales CGBVP en /configuracion
# Crear primer usuario (Primer Jefe) en DB
# Actualizar DNS → CloudFront
```

---

## Estado del proyecto

**Versión actual:** 1.0 (tras 10 entregas de desarrollo)

**Completado:**
- ✅ Landing pública configurable
- ✅ Schema v2 completo (18 tablas)
- ✅ Permisos v2 granulares (65+ permisos)
- ✅ 9 módulos funcionales con vistas institucionales
- ✅ Integración CGBVP (scraper funcional)
- ✅ Infraestructura CDK en 7 stacks
- ✅ Scripts de deploy automatizado
- ✅ Documentación técnica + operativa

**Roadmap:**
- 🔜 Áreas restantes fases 2-4 (SG, IN, SN, AD, IM, Jefatura)
- 🔜 SCI digital (formas 201, 202, 204, 205, 206, 213, 214)
- 🔜 Notificaciones push
- 🔜 Rich text / markdown en anuncios
- 🔜 Adjuntos en anuncios y solicitudes
- 🔜 Certificados PDF generados
- 🔜 App móvil nativa (React Native)

---

## Contribución

El proyecto está pensado como template open-source replicable por otras compañías del CGBVP. Para adaptar:

1. Fork del repositorio
2. Editar `company.config.ts`
3. Agregar logo e imágenes en `/public/`
4. Desplegar con `./scripts/deploy.sh`

Los PRs sobre el core son bienvenidos. Para cambios específicos de una compañía, mantenerlos en un fork.

---

## Licencia

Por definir. Intención: licencia permisiva tipo MIT o Apache 2.0 para uso por compañías del CGBVP y cuerpos de bomberos de Latinoamérica.

---

## Créditos

Desarrollado para la **Compañía de Bomberos Voluntarios N.° 163** de Ancón, Perú.

- **Sccionaria María Elena Riojas Mendoza (A23118)** — dirección funcional, product owner
- Comunidad de bomberos voluntarios del CGBVP

> Ad honorem, en servicio del voluntariado bomberil peruano.
>
> **Dios · Patria · Humanidad**
