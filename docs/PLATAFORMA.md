# CUARTEL-CRM — Documentación Completa de la Plataforma

**Compañía de Bomberos Voluntarios Ancón N.° 163 — CGBVP**
Última actualización: 24 de abril de 2026

---

## 1. Visión General

CUARTEL-CRM es un sistema de gestión integral para compañías de bomberos voluntarios del CGBVP. Tiene tres grandes áreas:

| Área | URL | Descripción |
|------|-----|-------------|
| **Landing pública** | `/` | Sitio web institucional visible para cualquier persona |
| **Autenticación** | `/login` | Acceso al sistema con DNI o email + contraseña |
| **Intranet** | `/dashboard` | Sistema interno para efectivos autenticados |

---

## 2. Arquitectura Técnica

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, React Server Components) |
| Auth | NextAuth v5 (JWT, Credentials — login por DNI/email) |
| Base de datos | PostgreSQL 15 + Drizzle ORM |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Gráficos | Recharts |
| Almacenamiento | S3-compatible (MinIO dev / AWS S3 prod) |
| Email | Nodemailer (Mailpit dev / SES prod) |
| Scraper CGBVP | TypeScript + Puppeteer + Cheerio (integrado en `scripts/scraper/`) |

---

## 3. Sistema de Roles y Permisos

Los permisos se derivan automáticamente del **grado** y **rol de sección** del efectivo (ver `lib/auth/permissions.ts`).

### Roles de mando (sección)

| Rol | Permisos clave |
|-----|---------------|
| **Primer Jefe** | Acceso total a todo el sistema (30+ permisos) |
| **Segundo Jefe** | Casi todo excepto configuración del sistema |
| **Jefe de Sección** | Gestión de su sección + personal de su área |
| **Adjunto** | Vista de su sección + crear incidencias |
| **Miembro** | Módulos operativos básicos |

### Grados (jerarquía CGBVP)

Aspirante → Seccionario → Subteniente → Teniente → Capitán → Ten. Brigadier → Brigadier → Brig. Mayor → Brig. General

Cada grado tiene requisitos mínimos de horas/guardias por trimestre (NDR Ascensos).

---

## 4. Landing Pública

Sitio web institucional accesible sin login.

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Inicio | Hero con carrusel, información general de la compañía |
| `/nosotros` | Nosotros | Historia, misión, visión de la compañía |
| `/equipo` | Equipo | Presentación del personal (jefatura, secciones) |
| `/servicios` | Servicios | Tipos de emergencias que atiende la compañía |
| `/cronograma` | Cronograma | Calendario de actividades públicas |
| `/admision` | Admisión | Proceso para nuevos aspirantes (requisitos, pasos) |
| `/contacto` | Contacto | Formulario de contacto, ubicación, teléfonos |

**Configuración**: Todo se personaliza desde `company.config.ts` (nombre, colores, logo, feature flags).

---

## 5. Intranet — Estructura del Sidebar

### 5.1 Principal (todos los usuarios)

| Ruta | Módulo | Estado | Descripción |
|------|--------|--------|-------------|
| `/dashboard` | **Inicio** | ✅ Funcional | Dashboard con estado de compañía en vivo, KPIs personales (efectivos) o de flota (jefatura), ranking de asistencia mensual, accesos rápidos a módulos |
| `/mi-compania` | **Mi Compañía** | ✅ Funcional | Estado en vivo de la compañía: personal en turno, estado de flota (6 vehículos), emergencias activas. Datos del scraper CGBVP |
| `/perfil` | **Mi Perfil** | ✅ Funcional | Datos personales, KPIs (horas, días, emergencias, cursos), cumplimiento reglamentario con barra de progreso, historial de asistencia por mes |

### 5.2 Operativo (todos los efectivos activos)

| Ruta | Módulo | Estado | Descripción |
|------|--------|--------|-------------|
| `/guardia-nocturna` | **Guardia Nocturna** | ✅ Original | Calendario de guardias, reserva de camas por sector (12 camas, 3 sectores). Admin: `/guardia-nocturna/admin` para gestión de aprobaciones |
| `/horas` | **Jornada Voluntaria** | ✅ Original | Registro de horas de servicio (guardia, instrucción, mantenimiento, emergencia). Verificación por jefes. Cumplimiento NDR |
| `/incidencias` | **Incidencias** | ✅ Original | Reportar problemas (equipamiento, infraestructura, personal). Estados: pendiente → en_proceso → resuelto. Asignación a secciones |
| `/esbas` | **ESBAS** | ✅ Original | Malla curricular de formación bomberil. Lecciones con teoría + práctica + evaluación. Progreso por aspirante. Detalle: `/esbas/[id]` |
| `/comunicados` | **Comunicados** | ✅ Original | Tablón de anuncios internos. Prioridad (normal/importante/urgente). Filtro por grado y sección. Comunicados fijados |

### 5.3 Reportería / Insights (solo jefatura)

Módulos de análisis de datos alimentados por el scraper CGBVP. Todos usan datos reales de la extranet de bomberosperu.gob.pe.

| Ruta | Módulo | Estado | Descripción |
|------|--------|--------|-------------|
| `/operatividad` | **Operatividad** | ✅ Nuevo | Vista en tiempo real: KPIs (en turno, flota, emergencias, pilotos), gráficos donut (estado flota, composición turno, especialidades), listado de personal en turno con roles (MANDO/PILOTO/MÉDICO), estado de cada unidad, emergencias activas |
| `/estadisticas` | **Estadísticas** | ✅ Nuevo | Resumen mensual: total emergencias, tipo más frecuente, tiempo respuesta promedio, hora pico. Gráficos: actividad diaria (line chart), distribución por categoría (donut), tiempo de respuesta por tipo (bar), uso de unidades (bar), efectivos al mando (bar). Filtro por mes/año |
| `/partes-emergencia` | **Partes de Emergencia** | ✅ Nuevo | Tabla completa de partes con filtros (búsqueda, tipo, estado, distrito, categoría, rango de fechas). Detalle expandible por parte: timeline (despacho→salida→llegada→retorno), tiempos de respuesta, personal, ubicación y unidades despachadas |
| `/bomberos` | **Bomberos** | ✅ Nuevo | Ranking de efectivos por actividad mensual: horas, días, guardias, emergencias, veces al mando. Filtros por mes, grado, estado. Perfil individual (`/bomberos/[id]`): historial mensual con gráfico (horas + emergencias), tabla de asistencia, partes como jefe de emergencia |
| `/asistencias` | **Asistencias** | ✅ Nuevo | Informe mensual de cumplimiento: KPIs (bomberos activos, horas totales, días, emergencias, % cumplimiento). Gráficos: evolución de horas mensuales, top 10 bomberos, promedio por grado, cumplimiento reglamentario por grado (cumple/no cumple). Detalle individual con % de cumplimiento |
| `/analisis` | **Análisis** | ✅ Nuevo | Análisis profundo de emergencias: por distrito (bar), por categoría (donut), top 10 tipos (bar), salidas por vehículo (bar), por hora del día (bar coloreado por turno), por día de la semana, tiempo de respuesta por tipo. Filtros: año, mes, distrito |

### 5.4 Gestión (jefes de sección y superiores)

| Ruta | Módulo | Estado | Descripción |
|------|--------|--------|-------------|
| `/personal` | **Personal** | ✅ Original | Directorio de efectivos. Búsqueda, filtros por grado/sección/estado. Vista de cada efectivo con datos de contacto y roles |
| `/inventario` | **Inventario General** | ⚠️ Pendiente mejora | Actualmente: tabla de inventario por sección. **Pendiente**: cambiar a vista de galería por máquina/unidad |
| `/contenido` | **Calendario** | ✅ Original | Calendario de publicaciones y actividades de imagen institucional. Crear/editar eventos con fechas |
| `/secciones` | **Secciones** | ✅ Original | Estructura organizativa según RIF (Art. 112-117). 7 secciones: Jefatura, Máquinas, Servicios Generales, Instrucción, Prehospitalaria, Administración, Imagen. Detalle por sección: `/secciones/[key]` |

### 5.5 Administración (solo jefatura)

| Ruta | Módulo | Estado | Descripción |
|------|--------|--------|-------------|
| `/jefatura` | **Jefatura** | ✅ Original | Panel de jefatura: métricas de la compañía, estructura de mando, comunicados oficiales |
| `/reportes` | **Reportes** | ⚠️ Redundante | Informes y estadísticas. **Nota**: Podría eliminarse ya que Reportería/Insights cubre esta funcionalidad con datos reales |
| `/configuracion` | **Configuración** | ✅ Original | Ajustes del sistema: gestión de usuarios, roles, parámetros generales. Solo Primer Jefe |

---

## 6. APIs

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth v5 — login, logout, sesión |
| `/api/auth/change-password` | POST | Cambio de contraseña (bcrypt) |
| `/api/storage/presign` | POST | URLs pre-firmadas para subir archivos a S3/MinIO |
| `/api/sync` | POST | Endpoint que recibe datos del scraper CGBVP (bomberos, estados, emergencias, asistencia). Protegido por token `SCRAPPER_SYNC_SECRET` |

---

## 7. Scraper CGBVP (integrado)

Ubicación: `scripts/scraper/`

Scrapea datos de `bomberosperu.gob.pe/extranet` usando Puppeteer + Cheerio y los guarda directamente en la BD via Drizzle.

| Script | Intervalo | Qué hace |
|--------|-----------|----------|
| `estado-cia.ts` | Cada 2 min | Estado de la compañía: jefes, personal en turno, vehículos, pilotos, paramédicos |
| `partes-cia.ts` | Cada 15 min | Partes de emergencia: tiempos, vehículos, km, al mando, tipo, dirección |
| `emergencias-sgo.ts` | Cada 5 min | Emergencias de SGO Norte (página pública, no requiere login) |
| `asistencia-mensual.ts` | Cada 6h (días 1-5) | Asistencia mensual por bombero: días, guardias, horas, emergencias |
| `bomberos.ts` | Manual | Padrón completo de bomberos (código, grado, nombre, DNI) |

**Comandos:**
```bash
npm run scraper:start      # Loop continuo (todos los scrapers)
npm run scraper:bomberos   # Actualizar padrón una vez
npm run scraper:historico  # Cargar partes de los últimos 60 días
```

---

## 8. Base de Datos — Tablas

### Autenticación y perfiles
| Tabla | Descripción |
|-------|-------------|
| `users` | Credenciales (id, email, passwordHash) |
| `profiles` | Datos del bombero (nombre, DNI, grado, estado, código CGBVP, contacto) |
| `sections` | 7 secciones del RIF (jefatura, máquinas, servicios, instrucción, prehospitalaria, admin, imagen) |
| `section_roles` | Asignación de roles por sección (primer_jefe, segundo_jefe, jefe_seccion, adjunto, miembro) |

### Operativo
| Tabla | Descripción |
|-------|-------------|
| `guard_shifts` | Reservas de guardia nocturna |
| `guard_beds` | Camas disponibles por sector |
| `service_hours` | Horas de servicio registradas |
| `incidents` | Incidencias reportadas |
| `inventory` | Inventario por sección |
| `announcements` | Comunicados internos |
| `esbas_lessons` | Lecciones de la malla ESBAS |
| `esbas_progress` | Progreso de aspirantes en ESBAS |
| `content_calendar` | Calendario de contenido/imagen |

### Scraper CGBVP (datos externos)
| Tabla | Descripción |
|-------|-------------|
| `cgbvp_company_status` | Snapshots del estado de la compañía (cada 2 min) |
| `cgbvp_vehicles` | Vehículos de la compañía (código, tipo, estado, motivo) |
| `cgbvp_status_vehicles` | Vehículos por snapshot de estado |
| `cgbvp_shift_attendance` | Personal en turno por snapshot |
| `cgbvp_attendance` | Asistencia mensual por bombero (días, guardias, horas, emergencias) |
| `cgbvp_status_history` | Historial de cambios de estado de bomberos |
| `emergencies` | Partes de emergencia (número, tipo, estado, tiempos, dirección, distrito) |
| `emergency_types` | Catálogo de tipos de emergencia |
| `emergency_vehicles` | Vehículos despachados por emergencia (tiempos, km) |
| `emergency_crew_members` | Dotación por emergencia |
| `hired_drivers` | Pilotos rentados |

---

## 9. Problemas y Oportunidades de Mejora Identificados

### 🔴 Problemas actuales

1. **`/reportes` es redundante** — Reportería/Insights ya cubre estadísticas, análisis, asistencias y bomberos con datos reales. Considerar eliminar o redirigir.

2. **`/inventario` necesita rediseño** — Actualmente es una tabla plana. Debería ser galería visual por máquina/unidad con fotos, estado, historial de mantenimiento.

3. **`/jefatura` se solapa con `/operatividad`** — Ambos muestran métricas de la compañía. Definir qué va en cada uno.

4. **Datos duplicados entre módulos** — El dashboard, mi-compania y operatividad muestran datos similares (estado, turno, flota). Podría consolidarse.

### 🟡 Oportunidades de mejora

5. **Navegación confusa** — 5 grupos en el sidebar es mucho. Posible simplificación:
   - ¿Fusionar "Principal" y "Operativo" en un solo grupo?
   - ¿Mover "Mi Compañía" dentro del dashboard en vez de página separada?

6. **Módulos sin datos reales** — Guardia Nocturna, Horas, Incidencias, ESBAS, Comunicados, Inventario, Contenido usan datos del seed o mocks. Necesitan conexión con flujos reales.

7. **Falta módulo de Emergencias para efectivos** — Los efectivos no ven partes de emergencia. Podrían ver al menos sus propias participaciones.

8. **Perfil individual limitado** — `/perfil` no permite editar datos de contacto (teléfono, email, contacto de emergencia). El botón "Editar datos" está deshabilitado.

9. **Sin notificaciones** — No hay sistema de notificaciones push/in-app para emergencias activas, comunicados urgentes, o aprobaciones pendientes.

10. **Sin modo offline** — Para emergencias donde no hay internet, no hay PWA ni caché local.

### 🟢 Sugerencias de reestructuración

**Opción A — Simplificar a 3 grupos:**
```
MI ESPACIO
  Inicio (dashboard personal)
  Mi Perfil
  Guardia Nocturna
  Jornada Voluntaria
  Incidencias
  ESBAS
  Comunicados

COMPAÑÍA (todos ven, jefes gestionan)
  Estado en Vivo (operatividad simplificada)
  Personal
  Secciones
  Inventario General
  Calendario

REPORTERÍA (solo jefatura)
  Partes de Emergencia
  Bomberos
  Asistencias
  Estadísticas
  Análisis
  Configuración
```

**Opción B — Por área funcional:**
```
INICIO
  Dashboard

OPERACIONES
  Estado en Vivo
  Guardia Nocturna
  Incidencias
  Partes de Emergencia

PERSONAL
  Mi Perfil
  Directorio
  Jornada Voluntaria
  Asistencias
  Bomberos (ranking)

FORMACIÓN
  ESBAS
  Calendario

LOGÍSTICA
  Inventario General
  Secciones

REPORTERÍA
  Estadísticas
  Análisis

SISTEMA
  Comunicados
  Configuración
```

---

## 10. Credenciales de Desarrollo

| Usuario (DNI) | Nombre | Rol | Contraseña |
|---|---|---|---|
| `10000001` | Brig. Torres Mendoza | Primer Jefe — acceso total | `bombero2024` |
| `10000002` | Ten. Brig. Ramírez Silva | Segundo Jefe | `bombero2024` |
| `10000003` | Cap. Herrera Vargas | Jefe de Máquinas | `bombero2024` |
| `10000009` | Secc. Cárdenas López | Efectivo | `bombero2024` |
| `10000013` | Asp. González Pérez | Aspirante | `bombero2024` |

---

## 11. Comandos Útiles

```bash
# Desarrollo
npm run dev                  # Servidor de desarrollo
npm run build                # Build de producción

# Base de datos
docker compose up -d postgres  # Levantar PostgreSQL
npm run db:generate            # Generar migraciones
npm run db:migrate             # Aplicar migraciones
npm run db:push                # Push directo del schema
npm run db:studio              # Explorador visual de BD
npm run db:seed                # Seed base (usuarios, secciones, etc.)
npm run db:seed:operativo      # Seed operativo (emergencias, asistencia, vehículos)

# Scraper
npm run scraper:start          # Loop continuo
npm run scraper:bomberos       # Actualizar padrón
npm run scraper:historico      # Cargar últimos 60 días de partes
```
