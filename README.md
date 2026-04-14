# CUARTEL-CRM

Sistema de gestión intranet para compañías de bomberos voluntarios del CGBVP (Cuerpo General de Bomberos Voluntarios del Perú).

Open-source · Next.js 15 · PostgreSQL 15 · Drizzle ORM · NextAuth v5

---

## Características

- **Landing pública** — información institucional configurable por compañía
- **Intranet** — módulos para todo el personal activo
  - Dashboard con KPIs y actividad reciente
  - Guardia Nocturna — reservas de camas por sector
  - Horas de Servicio — registro y verificación conforme NDR Ascensos
  - Incidencias — seguimiento de reportes operativos
  - ESBAS — malla curricular de formación
  - Personal, Secciones, Inventario, Comunicados
- **Jefatura** — métricas, comunicados oficiales, estructura de mando
- **Reportes** — cumplimiento NDR, horas, incidencias, guardias
- **Roles y permisos** — 30+ permisos derivados del grado y rol de sección
- **Mobile-first** — sidebar colapsable en desktop, navegación Sheet en mobile
- **Personalizable** — un solo archivo `company.config.ts` por compañía

---

## Requisitos

- Node.js 20+
- Docker y Docker Compose (para PostgreSQL + MinIO + Mailpit en desarrollo)
- npm 10+

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd web-ubo163
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` y completar al menos:

```env
DATABASE_URL=postgresql://admin:dev_password@localhost:5432/cuartel_crm
NEXTAUTH_SECRET=genera-uno-con-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 3. Levantar servicios de desarrollo

```bash
docker compose up -d
```

Esto levanta:
- **PostgreSQL 15** en `localhost:5432`
- **MinIO** (almacenamiento S3-compatible) en `localhost:9000` · UI en `localhost:9001`
- **Mailpit** (SMTP de prueba) en `localhost:1025` · UI en `localhost:8025`

### 4. Migraciones y seed

```bash
# Generar migraciones desde el esquema Drizzle
npm run db:generate

# Aplicar migraciones a la base de datos
npm run db:migrate

# Seed con datos de prueba (14 efectivos, secciones, inventario, etc.)
npm run db:seed
```

El seed crea las siguientes cuentas de desarrollo (contraseña `bombero2024`):

| Usuario (DNI) | Nombre | Acceso |
|---|---|---|
| `10000001` | Brig. Torres Mendoza | Primer Jefe — acceso total |
| `10000002` | Ten. Brig. Ramírez Silva | Segundo Jefe |
| `10000003` | Cap. Herrera Vargas | Jefe de Sección |
| `10000009` | Secc. Cárdenas López | Efectivo |
| `10000013` | Asp. González Pérez | Aspirante |

> Cambiar contraseñas antes de desplegar en producción.

### 5. Servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Personalización por compañía

Editar **`company.config.ts`** en la raíz del proyecto. Es el único archivo que cambia entre compañías:

```ts
export const companyConfig = {
  id: "163",
  name: "Compañía de Bomberos Voluntarios Ancón",
  shortName: "Bomberos Ancón 163",
  motto: "Excelencia en Servicio",
  foundedYear: 1952,
  // ubicación, contacto, redes sociales, tema de colores...
}
```

Configuraciones disponibles:

- **Identidad** — nombre, lema, año de fundación, tipo (compañía/estación)
- **Ubicación** — departamento, provincia, distrito, coordenadas
- **Contacto** — teléfonos, email, sitio web
- **Redes sociales** — Facebook, Instagram, TikTok, YouTube
- **Tema visual** — colores HSL primario/secundario/acento, logo, imágenes hero
- **Feature flags** — deshabilitar módulos no usados
- **Guardia nocturna** — número de camas, sectores, horarios, aprobación automática

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Iniciar build de producción

npm run db:generate  # Generar archivos de migración desde schema
npm run db:migrate   # Aplicar migraciones pendientes
npm run db:push      # Push directo del schema (desarrollo rápido, sin migraciones)
npm run db:studio    # Drizzle Studio — explorador visual de la BD
npm run db:seed      # Poblar BD con datos de prueba
```

---

## Estructura del proyecto

```
├── app/
│   ├── (landing)/        # Sitio público
│   ├── (auth)/           # Login
│   └── (intranet)/       # Módulos del sistema
├── components/
│   ├── intranet/         # Sidebar, mobile nav, page-header
│   └── ui/               # shadcn/ui componentes
├── lib/
│   ├── auth/             # NextAuth config, permisos, hooks
│   ├── cgbvp/            # Constantes normativas NDR/RIF
│   ├── db/               # Drizzle schema, queries, conexión
│   ├── email/            # Abstracción nodemailer
│   └── storage/          # Abstracción S3
├── data/
│   ├── seed.ts           # Script de seed
│   └── esbas-courses.ts  # Contenido de la malla ESBAS
└── company.config.ts     # Configuración por compañía
```

---

## Permisos

Los permisos se derivan automáticamente del grado y rol de sección del efectivo. Los roles de mando dan acceso a módulos de gestión:

| Rol | Permisos clave |
|---|---|
| Primer / Segundo Jefe | `company.manage`, `company.view_all`, todos los reportes |
| Jefe de Sección | `personnel.view_section`, `incidents.manage_section`, `reports.view_section` |
| Efectivo activo | Módulos operativos, horas propias, ESBAS, incidencias, comunicados |
| Aspirante | ESBAS, horas propias, comunicados |

Ver `lib/auth/permissions.ts` para la lista completa de permisos.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Auth | NextAuth v5 (JWT, Credentials) |
| Base de datos | PostgreSQL 15 + Drizzle ORM |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Almacenamiento | S3-compatible (MinIO/AWS S3/Cloudflare R2) |
| Email | Nodemailer (Mailpit dev / SES prod) |
| Validación | Zod + React Hook Form |
| Estado cliente | Zustand |

---

## Licencia

MIT — libre para uso y adaptación por cualquier compañía CGBVP.
