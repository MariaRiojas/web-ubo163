# Plataforma CUARTEL-ERP — Presentación de la Herramienta
### Compañía de Bomberos Voluntarios Ancón N.° 163 · Agosto 2026
*Material de apoyo para la presentación formal ante la XXV Comandancia Departamental de Lima Norte*

> Este documento resume el **objetivo**, **todas las funcionalidades** y la **hoja de ruta** de la plataforma, para armar la presentación (PPT). La herramienta está **operativa en línea** y puede demostrarse en vivo.

---

## 1 · ¿Qué es?

**Un sistema integral de gestión** para la Compañía, accesible desde cualquier dispositivo con navegador (computadora, tablet o celular). Reemplaza los procesos manuales y las hojas de Excel dispersas por **una sola herramienta** que centraliza la operación, la formación, el inventario, el personal y el comando — con trazabilidad permanente y costo mínimo.

*Stack:* aplicación web en la nube (AWS) · base de datos gestionada · sin servidores que mantener.

---

## 2 · ¿Por qué se creó? (Objetivo)

El voluntariado bomberil opera con recursos limitados y alta rotación de mando. La información vivía en cuadernos, chats y archivos sueltos, lo que generaba:

- **Falta de trazabilidad** — objetos, insumos, donaciones e informes "desaparecían" sin registro, sobre todo en los pases de mando.
- **Datos dispersos** — asistencia, horas, inventario y emergencias en distintos lugares, sin una visión de conjunto.
- **Dependencia de personas** — el conocimiento y el control quedaban en pocas manos.
- **Procesos manuales** — admisión, formación y reportes hechos a mano.

**Objetivo:** dotar a la Compañía de una plataforma que **profesionalice la gestión**, dé **visibilidad total al comando**, **preserve la memoria institucional** con trazabilidad inmutable, y **facilite la formación y el control operativo** — todo a un costo asumible por una compañía de voluntarios.

---

## 3 · Visión general — Una plataforma, acceso por cargo

El sistema muestra a cada efectivo **solo lo que le corresponde** según su grado y cargo, en 6 capas:

| Capa | Quién la ve | Qué contiene |
|------|-------------|--------------|
| **Personal** | Todos | Inicio, Mi Perfil, Mi Compañía, Guardia Nocturna, Anuncios |
| **Faena y Servicio** | Efectivos activos | Checklists con QR, incidencias, solicitudes, horas de servicio |
| **Capacitación** | Todos | Escuela virtual (LMS), biblioteca |
| **Área de sección** | Quien tiene cargo en una sección | Panel de su área (inventario, bandejas, gestión) |
| **Comando** | Primer y Segundo Jefe | Reportería, operatividad, auditoría |
| **Administración** | Primer Jefe | Personal, configuración del sistema |

---

## 4 · Funcionalidades completas (para diapositivas)

### 👤 Personal (todos los efectivos)
- **Mi Perfil** — ficha completa: datos personales, grado, historial, formación, equipos, ascensos.
- **Mi Compañía** — estado en vivo de la Compañía (datos del CGBVP).
- **Guardia Nocturna** — reserva de cama por género, con administración de dormitorios por el Jefe de Guardia.
- **Anuncios / Comunicados** — con **editor de texto enriquecido** y flujo de aprobación (borrador → Primer Jefe → publicado).

### 🚒 Faena y Servicio (efectivos activos)
- **Bandeja de Faena** — checklists de la guardia con **códigos QR** por gabinete/máquina.
- **Incidencias** — reporte de equipos dañados desde la faena, que llegan a la bandeja del área responsable.
- **Solicitudes** — pedidos formales entre áreas.
- **Horas de Servicio** — registro y seguimiento según la **NDR de Ascensos** (mínimos trimestrales por grado).

### 🎓 Capacitación — Escuela Virtual (LMS)
- Cursos organizados en **Programa → Módulos → Lecciones** (ESBAS y Escuela Técnica).
- **Lecciones interactivas** tipo "scrollytelling" (el contenido se revela conforme se avanza).
- **Cuestionarios** por lección y **evaluaciones formales** con banco de preguntas rotativo (nota mínima 14/20).
- **Cola de calificación** para el instructor (redacciones y prácticas presenciales).
- **Certificados en PDF** con sello institucional.
- **Inscripción automática** de aspirantes/postulantes a cursos obligatorios y **panel de progreso** por efectivo.
- **Biblioteca digital** de reglamentos y material.

### 📝 Admisión de Postulantes
- **Formulario público en la web** (sin cuenta): datos + **CERTIJOVEN en PDF**.
- Se **activa solo con una convocatoria abierta**; si no la hay, invita a seguir las redes.
- **Gestión por el área de Instrucción**: revisar, aprobar a la siguiente etapa, observar o descartar.
- Las convocatorias se convierten en las **promociones** que pasan al módulo de aspirantes.

### 📦 Inventario
- Inventario **por área** con estado operativo, ubicación y código.
- **Movimientos** y **etiquetas QR** imprimibles por ítem.
- **Actas de asignación** — subida del acta firmada (PDF o foto) para completar el registro de una reasignación de jaulas / EPP / casilleros.
- **Importación desde Excel** con plantilla.
- **Requerimientos** — pedidos de compra/servicio entre áreas con flujo de aprobación.

### 🏛️ Áreas de la Compañía (6)
Panel propio para **Máquinas, Servicios Generales, Instrucción, Sanidad (Prehospitalaria), Administración e Imagen**, cada una con su inventario, bandejas (incidencias / solicitudes / requerimientos) y gestión específica.
- **Imagen** además administra el **contenido del sitio web público** (edita textos del landing sin depender de un desarrollador).

### 🎖️ Comando (Primer y Segundo Jefe) — Inteligencia operativa
- **Operatividad** — estado actual: guardia de la noche, flota y **operatividad del inventario por área**.
- **Emergencias** — análisis: emergencias por **categoría** (incendios, médicas, rescates, otras), tendencias, patrones por hora/día/distrito, y **podio de liderazgo operativo**.
- **Personal** — desempeño: horas, asistencia, **% de participación** y **cumplimiento NDR trimestral** por efectivo (cumple / excedente / le faltan horas).
- **Auditoría inmutable** — bitácora permanente estilo "caja negra" de toda operación sensible (inventario, documentos, donaciones, personal), **imposible de editar o borrar**. Solo Primer Jefe.

### ⚙️ Administración del Sistema (Primer Jefe)
- **Personal** — gestión de efectivos, cargos y roles.
- **Configuración** — usuarios y credenciales de sincronización con el CGBVP.

### 🔄 Sincronización con el CGBVP
- Extracción automática desde el intranet del CGBVP de **emergencias, asistencia, horas del personal, padrón y estado de la Compañía**, con depuración de calidad (unificación de nombres, corrección de acentos, separación de actividad propia vs. de zona).

---

## 5 · Trazabilidad y confianza (mensaje clave para el mando)

La **auditoría inmutable** resuelve el problema histórico del voluntariado: durante los pases de mando, objetos, insumos, donaciones e informes desaparecían sin dejar rastro. Ahora **cada operación queda registrada de forma permanente e inalterable**, con quién, qué, cuándo y el detalle. Es el respaldo institucional para un pase de mando transparente.

---

## 6 · Arquitectura y costo

- **100% en la nube (AWS)** — sin servidores físicos, escala automáticamente.
- **Costo por uso** — la infraestructura escala a cero cuando no se usa; operación en el orden de **decenas de dólares al mes**.
- **Rendimiento optimizado** — páginas dinámicas en fracciones de segundo; sitio público servido desde el borde de la red (CDN).
- **Seguridad** — acceso por credenciales con límite de intentos, protección contra inyección de código, y base de datos gestionada con respaldo.
- **Identidad visual unificada** en todo el sistema.

---

## 7 · Estado actual y hoja de ruta

### ✅ Operativo y desplegado
Todos los módulos de las secciones 4-6 están **en producción y demostrables en vivo**.

### 🔧 En afinamiento (funciona, se sigue mejorando)
- **Cobertura total de datos del CGBVP** — la extracción desde el internet libre trae un subconjunto; para el 100% conviene ejecutarla desde la red del cuartel. El proceso ya quedó automatizado y robusto para ese momento.
- **Estado en vivo del personal en turno** — depende de la sincronización desde el cuartel.

### 🚧 En construcción / próximas fases (a acordar)
- **Notificaciones** push y por correo (alertas de guardia, requerimientos, emergencias).
- **App móvil nativa** (además de la web ya responsive).
- **SCI digital** — formularios del Sistema de Comando de Incidentes (ICS 201, 202, 204…).
- **Firma digital de actas** y membretado configurable de certificados.
- **Endurecimiento de seguridad de infraestructura** (aislamiento del origen, gestión de secretos) e **infraestructura como código** consolidada.
- **Reportería avanzada** — exportables e indicadores comparativos entre periodos.

---

## 8 · Cierre

Una sola herramienta, hecha a la medida de la Compañía 163, que **profesionaliza la gestión**, **da visibilidad al mando** y **preserva la memoria institucional** — a un costo asumible por el voluntariado y lista para crecer con las necesidades de la Comandancia.

*Plataforma en línea · demostración en vivo disponible durante la reunión.*
