# Arquitectura del Sistema — CUARTEL-ERP

**Documento maestro de navegación, permisos, rutas y modelo de datos**

**Versión:** 2.0 — Mayo 2026
**Alcance:** Compañía 163 (Ancón) · replicable a cualquier UBO del CGBVP

Este documento es la referencia única para decisiones de arquitectura del
sistema. Antes de agregar una pantalla, ruta o permiso, consultarlo y
actualizarlo si corresponde.

---

## 1. Filosofía de navegación

El menú lateral se estructura en **capas según el tipo de usuario y su
rol funcional**. No todos los efectivos ven lo mismo. El sistema muestra
lo que corresponde a la persona que ingresa.

Las capas son:

| Capa | Audiencia | Contenido |
|---|---|---|
| **A — Personal** | Todos los efectivos (postulante → Brigadier General) | Mi perfil, guardia nocturna, anuncios, inicio |
| **B — Faena y Servicio** | Todos los efectivos activos y superiores | Checklists, incidencias, solicitudes |
| **C — Capacitación** | Todos los efectivos (con contenido diferenciado) | ESBAS, Escuela Técnica, biblioteca |
| **D — Área de [Sección]** | Solo quien tenga cargo en una sección | Gestión específica de esa sección (una tarjeta por sección donde tenga cargo) |
| **E — Comando** | Solo Primer y Segundo Jefe | Reportería, operatividad global, estadísticas |
| **F — Administración del Sistema** | Solo Primer Jefe (y Segundo Jefe con restricciones) | Configuración CGBVP, usuarios, parámetros |

Reglas:

1. Un efectivo sin cargo ve **A + B + C**.
2. Si tiene cargo en una sección, suma **D (Área de su sección)**.
3. Si tiene cargo en varias secciones, aparecen varias tarjetas D.
4. Primer y Segundo Jefe ven **A + B + C + D (todas las áreas) + E + F**.

---

## 2. Capa A — Personal

Visible para absolutamente todos los efectivos registrados, incluidos
**postulantes** y **aspirantes**.

### 2.1 Rutas

| Ruta | Título | Descripción |
|---|---|---|
| `/` | Inicio | Dashboard personal: saludo según hora, estado propio (en turno / franco), próximas guardias reservadas, horas del trimestre con proyección de cumplimiento, últimos anuncios |
| `/mi-perfil` | Mi Perfil | Legajo completo del efectivo (ver sección 2.2) |
| `/mi-guardia` | Mi Guardia Nocturna | Reserva de cama, rol de guardias del mes, historial |
| `/anuncios` | Anuncios | Lista de anuncios vigentes filtrados por audiencia del efectivo |
| `/mi-compania` | Mi Compañía | Información pública de la 163: jefatura actual, efectivos, estado en vivo |

### 2.2 Mi Perfil — Legajo completo

El perfil es el **legajo institucional** del efectivo. Tiene pestañas:

#### a) Datos personales y contacto
- Nombre completo (institucional, viene del CGBVP)
- Código CGBVP (cuando aplica: `A#####`)
- DNI
- Grado actual
- Situación actual (activo / reserva / licencia / retirado)
- Fecha de incorporación al CGBVP
- Compañía actual
- **Género** (campo obligatorio — afecta asignación de guardia)
- Correo electrónico de contacto
- Teléfono de contacto
- Dirección (opcional)
- Fecha de nacimiento
- Tipo de sangre
- Contacto de emergencia (nombre, relación, teléfono)
- Foto (avatar)

Campos editables por el efectivo: contacto personal, contacto de emergencia,
foto, tipo de sangre. Los institucionales (nombre, grado, compañía) son
**solo lectura** — vienen del CGBVP y solo Administración puede
modificarlos.

#### b) Legajo educativo (cursos y certificados)
- Lista de cursos completados (internos y externos)
- Certificados subidos con fecha de emisión, entidad emisora y archivo
- Cursos en progreso
- Cursos sugeridos según grado actual
- Para cada curso: fecha de inicio, fecha de finalización, calificación,
  adjunto del certificado
- El propio efectivo puede agregar cursos externos con certificado; los
  cursos internos los carga el área de Instrucción

#### c) Equipos asignados
- Lista de todos los ítems de inventario con `assignedCodigo = su código`
- Para cada uno: nombre, categoría, subcategoría, marca, modelo,
  condición actual, fecha de asignación, vida útil restante
- Adjuntos visibles (actas de entrega firmadas, fichas técnicas)
- Botón para **reportar daño o pérdida** (genera una incidencia automática
  al área correspondiente)

#### d) Historial operativo
- Horas de servicio acumuladas (vista trimestral y anual)
- Días de guardia cumplidos
- Emergencias atendidas (con tipo, fecha, parte)
- Dashboard de **cumplimiento reglamentario**:
  - Meta del grado según NDR Ascensos
  - Acumulado del trimestre actual
  - Proyección con gráfico (¿va a cumplir?)
  - Días restantes del trimestre
  - Horas que faltan

#### e) Condecoraciones y reconocimientos
- Condecoraciones recibidas (grados según NDR: Estrella de Fuego, Bombero
  Emérito, Servicios Distinguidos, Caballero del Fuego, Soldado del Fuego)
- Diplomas al mérito
- Resoluciones de felicitación
- Cursos destacados

#### f) Historial de ascensos
- Línea de tiempo con cada grado alcanzado y fecha
- Para cada ascenso: fecha, resolución, junta calificadora que lo otorgó

### 2.3 Mi Guardia Nocturna

Reserva de cama para la guardia nocturna.

**Modelo:**
- La compañía tiene **habitaciones** con camarotes (confirmar cantidad exacta)
- Cada cama tiene un **número único** dentro de la habitación
- Las habitaciones se configuran como **masculinas** o **femeninas** (ver
  capa D, Guardia Masculina/Femenina)
- El efectivo solo puede ver y reservar camas de su género

**Flujo:**
1. El efectivo entra a `/mi-guardia`
2. Ve un calendario del mes con la disponibilidad de camas
3. Elige fecha y cama específica
4. Reserva (hasta un máximo configurable de días con antelación,
   según `company.config.ts.guardia.maxDiasReserva`)
5. Aparece en su "Próximas guardias"

**Reglas:**
- Una cama puede estar marcada como **indisponible** (por limpieza, avería, etc.)
- Las reservas tienen **prioridad verificable** por el Jefe de Guardia
- Los efectivos **sin reserva** pueden asistir a la guardia y ocupar
  cualquier cama libre, pero no tienen garantía
- Arreglos internos entre efectivos para ceder camas quedan fuera del
  sistema (no lo gestionamos)

### 2.4 Anuncios

Lista de anuncios dirigidos al efectivo según su grado y condición.

**Qué ve el efectivo:**
- Anuncios con audiencia "Todos los bomberos" (si es bombero)
- Anuncios dirigidos a su grado específico
- Anuncios dirigidos a él personalmente
- Si es aspirante: anuncios con check "También para aspirantes"
- Si es postulante: anuncios con check "También para postulantes"
- Anuncios oficiales de la Comandancia (siempre visibles)

**Filtros:**
- Pestañas: Todos · Importantes · Recientes · Leídos
- Marca de "No leído" hasta que el efectivo lo abre

---

## 3. Capa B — Faena y Servicio

Visible para todos los efectivos **activos** (seccionarios y superiores).
Los postulantes y aspirantes no ven esta capa completa (solo lo que el
área de Instrucción les habilite).

### 3.1 Rutas

| Ruta | Título | Descripción |
|---|---|---|
| `/faena/checklists` | Inspecciones | Checklists pendientes y completadas de las máquinas |
| `/faena/incidencias` | Reportar incidencia | Crear reporte de daño, falla, faltante |
| `/faena/solicitudes` | Solicitudes | Pedido a un área específica |

### 3.2 Checklists

**Modelo físico:**

Cada máquina tiene **gabinetes** con un QR único generado por el sistema.
El QR se imprime y se pega en cada gabinete.

```
MAQUINA 163-1
├─ Gabinete 01  (QR)  → herramientas hidráulicas
├─ Gabinete 02  (QR)  → mangueras
├─ Gabinete 03  (QR)  → SCBA
├─ Cabina       (QR)  → equipo médico de primera línea
└─ Exterior     (QR)  → iluminación, accesorios
```

Cada gabinete tiene un **inventario declarado** (lo carga Operaciones):
qué ítems deben estar ahí, con qué cantidad.

**Flujo de checklist:**

1. El bombero abre la cámara y escanea el QR del gabinete
2. El sistema abre el checklist con la lista de ítems esperados
3. Por cada ítem marca: **presente / faltante / dañado**
4. Si marca faltante o dañado, el sistema le sugiere:
   - Agregar una foto (opcional)
   - Crear una incidencia automática (opt-in)
5. Al terminar, confirma y queda registrado el checklist con fecha, hora,
   quién lo hizo, y resultado ítem por ítem

**Cadencia obligatoria (sincronizada con turnos de pilotos):**

| Turno | Horario | Checklist obligatorio |
|---|---|---|
| Mañana | 07:00 – 15:00 | Ingreso 07:00 · todas las máquinas |
| Tarde | 15:00 – 23:00 | Ingreso 15:00 · todas las máquinas |
| Noche | 23:00 – 07:00 | Ingreso 23:00 · todas las máquinas |

**Cadencia extra (eventual):**
- Después de cada emergencia atendida por la máquina
- Si la emergencia fue de madrugada, el **bombero al mando** puede
  posponer el checklist post-emergencia hasta un horario que disponga
  (para permitir descanso del equipo). La postergación queda registrada
  con motivo y hora de reprogramación.

**Vista del efectivo:**
- Los checklists pendientes para el turno actual (pull hacia arriba)
- Los completados de los últimos 7 días con estado (OK / con novedades)
- Posibilidad de ver detalles de cualquier checklist histórico

**Vista del Jefe de Máquinas:**
- Dashboard con tasa de cumplimiento
- Alertas de checklists no completados en el turno
- Historial por gabinete de ítems reportados faltantes/dañados

### 3.3 Incidencias

Reporte de algo que no está bien.

**Categorías:**
- `equipamiento` — un equipo está dañado o no funciona
- `infraestructura` — problema en instalaciones (luz, agua, estructura)
- `uniforme` — EPP dañado o faltante
- `vehicular` — problema de un vehículo
- `personal` — temas de conducta, clima laboral
- `otro` — no encaja en las anteriores

**Flujo:**
1. Efectivo crea incidencia con: título, categoría, descripción,
   ubicación/ítem afectado, fotos (opcional)
2. El sistema la asigna automáticamente al área responsable según la categoría:
   - `equipamiento` / `vehicular` → Máquinas
   - `infraestructura` → Servicios Generales
   - `uniforme` → Servicios Generales
   - `personal` → Jefatura
   - `otro` → Jefatura (triaje)
3. El área la recibe en su bandeja
4. Estados: `pendiente → en_proceso → resuelta → cerrada`
5. El reportante recibe notificación cuando cambia el estado

### 3.4 Solicitudes

Pedido formal a un área.

**Diferencia con incidencia:** la incidencia es sobre un problema
existente; la solicitud es un pedido proactivo (insumo, capacitación,
permiso).

**Categorías (aprobadas):**
- `repuesto` — reponer una pieza específica
- `reparacion` — arreglar algo
- `reposicion_insumo` — reponer un consumible que se agotó (ej: vendajes)
- `mantenimiento` — solicitud de mantenimiento programado
- `capacitacion` — pedido de un curso
- `permiso` — licencias, franquicias
- `otro`

**Flujo:**
1. El efectivo abre `/faena/solicitudes/nueva`
2. Selecciona el **área destino** (Máquinas, Sanidad, Servicios Generales,
   Instrucción, Imagen, Administración, Jefatura)
3. Selecciona la categoría
4. Describe el pedido, adjunta fotos o documentos
5. Opcionalmente referencia un ítem del inventario
6. Envía
7. El área destino recibe la solicitud en su bandeja
8. La asigna a un responsable o la toma el Jefe
9. Estados: `pendiente → aprobada / rechazada → en_proceso → completada`
10. El solicitante recibe notificación en cada cambio

---

## 4. Capa C — Capacitación

Sección formativa para todos los efectivos.

### 4.1 Rutas

| Ruta | Título | Descripción |
|---|---|---|
| `/capacitacion` | Capacitación | Home con los cursos disponibles según el efectivo |
| `/capacitacion/esbas` | Curso ESBAS | Malla curricular básica |
| `/capacitacion/escuela-tecnica` | Escuela Técnica | Cursos avanzados para bomberos |
| `/capacitacion/biblioteca` | Biblioteca | Documentos, manuales, reglamentos descargables |
| `/capacitacion/mi-progreso` | Mi progreso | Cursos en curso, completados, pendientes |

### 4.2 Contenido diferenciado por figura

| Figura | Qué ve |
|---|---|
| **Postulante** | ESBAS (vista previa, obligatoria del proceso interno de 6 meses) · Biblioteca básica |
| **Aspirante** | ESBAS (curso completo, obligatorio) · Biblioteca completa |
| **Bombero** (Seccionario +) | ESBAS (libre, como refresco) · Escuela Técnica · Biblioteca completa · Webinars · Workshops |
| **Oficial** (Subteniente +) | Todo lo anterior + cursos de mando, NFPA avanzado, SCI |

### 4.3 Cursos de Escuela Técnica (para bomberos)

Catálogo inicial:

| Curso | Siglas / Referencia |
|---|---|
| Lote de cuerdas de rescate | — |
| Materiales Peligrosos I | MATPEL I |
| Materiales Peligrosos II | MATPEL II |
| Materiales Peligrosos III | MATPEL III |
| Búsqueda y Rescate en Estructuras Colapsadas | BREC |
| Búsqueda y Rescate en Espacios Confinados | BREI |
| Rescate en Espacios Confinados | REC |
| Confined Space Rescue CL | CRECL |
| Supervivencia del Bombero | — |
| Normas NFPA (diversas) | NFPA |
| Otros (expandible por área de Instrucción) | — |

### 4.4 Modelo de contenido

Cada curso tiene:
- Nombre, descripción, grado mínimo requerido, duración estimada
- **Lecciones** (teóricas con texto/video, prácticas, evaluaciones)
- **Material descargable** (PDFs, presentaciones)
- Evaluación final con calificación
- Certificado automático al aprobar

**Tracking de progreso:**
- Por cada efectivo, lección por lección: iniciada / completada / aprobada
- Visible en `/capacitacion/mi-progreso`
- El área de Instrucción ve el progreso de todos

### 4.5 Gestión (para el área de Instrucción)

El Jefe de Instrucción y Adjuntos pueden:
- Crear nuevos cursos
- Cargar lecciones, videos, material
- Programar webinars y workshops (con fecha)
- Ver el progreso de cada efectivo
- Emitir certificados manuales (para cursos externos)
- Subir documentos a la biblioteca

Esta gestión vive en la **Capa D — Área de Instrucción** (ver sección 5.3).

---

## 5. Capa D — Área de [Sección]

**Regla de oro:** cada efectivo con cargo solo ve la gestión de **su propia sección**. Primer y Segundo Jefe son la excepción (ven todas).

El nombre del grupo en el menú es literalmente **"Área de [Sección]"**
según el nombre oficial del RIF Art. 112:

- Área de Máquinas
- Área de Servicios Generales
- Área de Instrucción y Entrenamiento
- Área de Atención Prehospitalaria (internamente: Sanidad)
- Área de Administración
- Área de Imagen de Compañía

### 5.1 Área de Máquinas

Visible para: Jefe y Adjunto de Sección de Máquinas, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/maquinas` | Tablero del área |
| `/area/maquinas/inventario` | Inventario de máquinas |
| `/area/maquinas/vehiculos` | Vehículos y documentación |
| `/area/maquinas/gabinetes` | Gabinetes y QRs |
| `/area/maquinas/checklists` | Checklists gestionados |
| `/area/maquinas/mantenimientos` | Programa de mantenimiento |
| `/area/maquinas/combustible` | Control de combustible |
| `/area/maquinas/bandeja-solicitudes` | Solicitudes recibidas |
| `/area/maquinas/bandeja-incidencias` | Incidencias recibidas |
| `/area/maquinas/personal` | Personal de la sección |

**Particularidades:**
- `/vehiculos`: SOAT, revisión técnica, placa, tarjeta de propiedad, póliza,
  documentación fotográfica
- `/gabinetes`: crear gabinetes por máquina, generar sus QRs imprimibles,
  definir qué inventario contiene cada uno
- `/combustible`: registro de carga, consumo, stock en cisterna interna

### 5.2 Área de Servicios Generales

Visible para: Jefe y Adjunto, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/servicios-generales` | Tablero del área |
| `/area/servicios-generales/inventario` | Inventario del almacén |
| `/area/servicios-generales/insumos` | Stock de consumibles (espuma, combustibles, mangueras) |
| `/area/servicios-generales/epp` | EPP en reserva y asignaciones |
| `/area/servicios-generales/instalaciones` | Mantenimiento del cuartel |
| `/area/servicios-generales/bandeja-solicitudes` | Solicitudes recibidas |
| `/area/servicios-generales/bandeja-incidencias` | Incidencias recibidas |
| `/area/servicios-generales/personal` | Personal de la sección |

### 5.3 Área de Instrucción y Entrenamiento

Visible para: Jefe y Adjunto, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/instruccion` | Tablero del área |
| `/area/instruccion/postulantes` | Gestión de postulantes (figura interna) |
| `/area/instruccion/aspirantes` | Gestión de aspirantes (curso ESBAS en progreso) |
| `/area/instruccion/cursos` | Catálogo de cursos (crear, editar) |
| `/area/instruccion/lecciones` | Editor de lecciones (texto, video, material) |
| `/area/instruccion/biblioteca` | Administrar biblioteca |
| `/area/instruccion/webinars` | Programar webinars |
| `/area/instruccion/progreso` | Progreso de todos los efectivos |
| `/area/instruccion/certificados` | Emitir certificados manuales |
| `/area/instruccion/bandeja-solicitudes` | Solicitudes de capacitación |
| `/area/instruccion/bandeja-incidencias` | Incidencias recibidas |
| `/area/instruccion/personal` | Personal de la sección |

### 5.4 Área de Atención Prehospitalaria (Sanidad)

Visible para: Jefe y Adjunto, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/sanidad` | Tablero del área |
| `/area/sanidad/inventario` | Inventario del almacén médico |
| `/area/sanidad/medicamentos` | Medicamentos con control de lotes y vencimientos |
| `/area/sanidad/insumos-medicos` | Gasas, sueros, vendas |
| `/area/sanidad/ambulancia` | Inventario de la AMBULANCIA 163 |
| `/area/sanidad/checklists` | Checklists específicos de la ambulancia |
| `/area/sanidad/bandeja-solicitudes` | Solicitudes recibidas |
| `/area/sanidad/bandeja-incidencias` | Incidencias recibidas |
| `/area/sanidad/personal` | Personal de la sección |

### 5.5 Área de Administración

Visible para: Jefe y Adjunto, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/administracion` | Tablero del área |
| `/area/administracion/legajos` | Gestión de legajos del personal |
| `/area/administracion/documentos` | Archivo documental |
| `/area/administracion/licencias` | Control de licencias y permisos |
| `/area/administracion/ascensos` | Apoyo a procesos de ascenso |
| `/area/administracion/reportes-normativa` | Reportes para cumplir NDR |
| `/area/administracion/bandeja-solicitudes` | Solicitudes recibidas |
| `/area/administracion/bandeja-incidencias` | Incidencias recibidas |
| `/area/administracion/personal` | Personal de la sección |

### 5.6 Área de Imagen de Compañía

Visible para: Jefe y Adjunto, Primer Jefe, Segundo Jefe.

| Ruta | Título |
|---|---|
| `/area/imagen` | Tablero del área |
| `/area/imagen/calendario` | Calendario de publicaciones y eventos |
| `/area/imagen/galeria` | Galería fotográfica institucional |
| `/area/imagen/comunicados` | Borrador de comunicados (envía a aprobación del Primer Jefe) |
| `/area/imagen/ceremonias` | Gestión de ceremonias, paradas, aniversarios |
| `/area/imagen/inventario` | Banderas, insignias, material de ceremonias |
| `/area/imagen/bandeja-solicitudes` | Solicitudes recibidas |
| `/area/imagen/bandeja-incidencias` | Incidencias recibidas |
| `/area/imagen/personal` | Personal de la sección |

### 5.7 Guardia Nocturna (cargos operativos extra)

No es una sección del RIF pero se usa operativamente. Hay dos cargos
individuales (no ligados a una sección):

- **Jefe de Guardia Masculina** — asignado a un efectivo específico
- **Jefe de Guardia Femenina** — asignada a una efectiva específica

Cada uno ve y gestiona solo su propia guardia. El Primer y Segundo Jefe
ven ambas.

**Configuración de dormitorios (seed inicial de la 163):**

| Dormitorio | Camarotes | Camas | Género |
|---|---|---|---|
| Dormitorio Masculino | 6 | 12 | Masculino |
| Dormitorio Femenino | 3 | 6 | Femenino |

La cantidad de habitaciones, camarotes y camas es **editable desde la UI**
por el Jefe de Guardia correspondiente (y por Primer/Segundo Jefe). Otras
compañías pueden tener configuraciones distintas.

### 5.8 Compartimientos de máquinas (modelo físico)

Cada máquina tiene **compartimientos** donde se guarda el inventario.
El nombre del compartimiento es **completamente editable** por el Jefe
de Máquinas porque cada máquina tiene su propia distribución.

**Tipos de compartimiento reconocidos:**

| Tipo | Descripción | Ejemplos típicos |
|---|---|---|
| `cabina` | Espacio cerrado con puerta o tapa | Cabina 1, Cabina A, Cabina T1 |
| `cajon` | Gaveta o cajón deslizable | Cajón superior derecho |
| `vitrina` | Compartimiento con visión (común en ambulancia) | Vitrina 1, Vitrina trasera |
| `cama_mangueras` | Espacio superior de la autobomba | Cama de mangueras superior |
| `exterior` | Espacio exterior accesible | Paragolpes delantero, techo |
| `otro` | Cualquier otro espacio no estandarizable | — |

**Ejemplos por máquina (seed inicial — editable):**

| Máquina | Compartimientos típicos |
|---|---|
| MAQUINA 163-1 | Cabina 1, Cabina 2, Cabina 3, Cabina 4, Cabina A, Cabina B, Cabina T1, Cabina T2, Cama de mangueras, Paragolpes, otros (total ~15) |
| RESCATE 163 | Cabina 1 a N con herramientas de rescate (trípodes, canastillas, picos, palas, estabilizadores 4 puntos, gata granja), Cabina técnica |
| AMBULANCIA 163 | Cajón 1 a N, Vitrina 1 a N, Gaveta médica, Compartimiento trasero, Cabina frontal |
| AUXILIAR 163 | Compartimiento 1 a N (personalizable) |

**Numeración y nombres:**

- Los nombres por defecto son genéricos (`Compartimiento 1`, `Compartimiento 2`) y se renombran desde la UI
- Los compartimientos pueden tener nombres con letras (A, B) o identificadores compuestos (T1, T2)
- Cada compartimiento tiene un **código QR único** generado por el sistema, imprimible desde la misma pantalla de gestión

**QR físico:**

- El sistema genera un QR por compartimiento al crearlo
- Pantalla de gestión tiene botón "Descargar hoja de QRs para imprimir" (PDF con todos los QRs listos para pegar)
- Los QRs actuales que están pegados físicamente **quedan obsoletos** y se reemplazarán
- El QR contiene un identificador interno, no datos sensibles
- Al escanearlo desde dentro del sistema, lleva al checklist del compartimiento
- Desde fuera del sistema (sin sesión), redirige al login

### 5.9 Checklists — quién los ejecuta

**Ejecutor principal:** el **efectivo** asignado a la máquina durante el turno.

**Ejecutor secundario:** el **piloto** (limitado a verificaciones mecánicas).

Distinción de responsabilidades:

| Aspecto | Efectivo | Piloto |
|---|---|---|
| Inventario interno de compartimientos | ✅ | ❌ |
| Estado físico de ítems (faltante/dañado) | ✅ | ❌ |
| Relojeo mecánico del vehículo | ❌ | ✅ |
| Nivel de combustible | ✅ + ✅ | ✅ |
| Nivel de agua en cisterna | ✅ + ✅ | ✅ |
| Fallas mecánicas | ❌ | ✅ |

**Cadencia:**

1. Al ingreso de cada turno de piloto (07:00, 15:00, 23:00) — checklist completo
2. Después de cada emergencia atendida por la máquina — motivo: en emergencias se pierden o mezclan ítems con los de otras compañías
3. El bombero al mando puede **postergar** el checklist post-emergencia si fue de madrugada, con motivo registrado

| Ruta | Título |
|---|---|
| `/guardia/masculina` | Guardia Nocturna Masculina (solo si tiene el cargo o es jefatura) |
| `/guardia/femenina` | Guardia Nocturna Femenina (solo si tiene el cargo o es jefatura) |
| `/guardia/masculina/camas` | Configuración de camas disponibles |
| `/guardia/masculina/rol` | Rol de guardia del mes |
| `/guardia/masculina/reservas` | Reservas activas |
| `/guardia/masculina/historial` | Historial de guardias |

(Idéntico para femenina)

---

## 6. Capa E — Comando

Solo para **Primer Jefe** y **Segundo Jefe**.

Esta capa **se mantiene exactamente como está hoy**, según tu solicitud.
No la modifico.

| Ruta | Título |
|---|---|
| `/operatividad` | Operatividad en vivo |
| `/estadisticas` | Estadísticas mensuales |
| `/partes-emergencia` | Partes de emergencia |
| `/bomberos` | Directorio operativo |
| `/asistencias` | Informe mensual de cumplimiento |
| `/analisis` | Análisis profundo |

---

## 7. Capa F — Administración del Sistema

Solo para **Primer Jefe** y **Segundo Jefe** (con algunos subprivilegios
exclusivos del Primer Jefe).

| Ruta | Título | Acceso |
|---|---|---|
| `/configuracion` | Configuración general | Ambos |
| `/configuracion/cgbvp` | Sincronización con el intranet CGBVP | Ambos |
| `/configuracion/usuarios` | Gestión de usuarios y roles | Solo Primer Jefe |
| `/configuracion/secciones` | Asignar Jefes y Adjuntos por sección | Solo Primer Jefe |
| `/configuracion/guardia-nocturna` | Cantidad y estado de camas por habitación | Primer, Segundo Jefe, Jefes de Guardia (cada uno su propia) |
| `/configuracion/anuncios` | Aprobar borradores de anuncios de las áreas | Solo Primer Jefe |
| `/configuracion/parametros` | Parámetros generales del sistema | Solo Primer Jefe |

---

## 8. Modelo de permisos

Los permisos se derivan automáticamente del grado + cargos del efectivo.
Se definen en `lib/auth/permissions.ts`.

### 8.1 Permisos ampliados (v2)

Permisos que agrego a los existentes:

#### Personal
- `profile.view_own`, `profile.edit_own` — todos
- `profile.view_any` — Administración, Jefatura
- `profile.edit_any` — solo Administración y Primer Jefe

#### Guardia Nocturna
- `guard.reserve_bed` — todos los efectivos activos
- `guard.view_male` — solo hombres
- `guard.view_female` — solo mujeres
- `guard.manage_male` — Jefe de Guardia Masculina, Primer Jefe, Segundo Jefe
- `guard.manage_female` — Jefe de Guardia Femenina, Primer Jefe, Segundo Jefe
- `guard.config_beds_male` — mismo que manage_male
- `guard.config_beds_female` — mismo que manage_female

#### Área por sección (granular)
- `area.machines.*` (view, manage, manage_checklists)
- `area.services.*`
- `area.instruction.*`
- `area.health.*`
- `area.admin.*`
- `area.image.*`
- Los Primer y Segundo Jefe tienen **todos los `area.*.*`** implícitos

#### Faena y Servicio
- `faena.create_incident` — todos los activos
- `faena.create_request` — todos los activos
- `faena.create_checklist` — todos los activos
- `faena.receive_incident_[section]` — quien tenga cargo en esa sección
- `faena.receive_request_[section]` — quien tenga cargo en esa sección

#### Capacitación
- `training.view_own_progress` — todos
- `training.access_esbas` — postulantes, aspirantes, bomberos (según lo definido en 4.2)
- `training.access_escuela_tecnica` — bomberos y oficiales
- `training.manage` — Jefe y Adjunto de Instrucción
- `training.issue_certificate` — Jefe de Instrucción
- `training.view_all_progress` — Jefe de Instrucción, Jefatura

#### Anuncios
- `announcements.view` — todos (filtra por audiencia)
- `announcements.create_draft` — todos los cargos (Jefe y Adjunto de cualquier área)
- `announcements.publish` — solo Primer Jefe (aprueba los borradores)

#### Inventario
- `inventory.view` — todos (con filtro por área si tiene cargo)
- `inventory.manage_section` — Jefe y Adjunto de la sección correspondiente
- `inventory.manage_all` — Primer Jefe, Segundo Jefe

### 8.2 Resolución por rol

| Rol | Capas visibles | Permisos clave |
|---|---|---|
| Postulante | A (reducida) + C (ESBAS) | `training.access_esbas`, `profile.view_own`, `announcements.view` (solo postulantes) |
| Aspirante | A + C (ESBAS completo) | `training.access_esbas`, `profile.edit_own`, `announcements.view` (aspirantes) |
| Seccionario a Capitán sin cargo | A + B + C | `faena.*`, `guard.reserve_bed`, `training.access_escuela_tecnica`, `announcements.view` |
| Adjunto de [Sección] | A + B + C + D (de su sección) | Los anteriores + `area.[section].manage`, `inventory.manage_section` |
| Jefe de [Sección] | A + B + C + D (de su sección) | Los de Adjunto + `announcements.create_draft` |
| Jefe de Guardia M/F | A + B + C + D (Guardia M/F) | `guard.manage_[male/female]`, `guard.config_beds_[male/female]` |
| Segundo Jefe | A + B + C + todas las D + E + F (parcial) | Todo salvo lo exclusivo de Primer Jefe |
| Primer Jefe | Todo | Todos los permisos, incluyendo aprobación de anuncios |

---

## 9. Schema de BD — nuevas tablas necesarias

Resumen de lo que hay que agregar al schema Drizzle existente.

### 9.1 Ampliación a tablas existentes

**`profiles`**
- Agregar `postulante` como valor válido en `status`
- `gender` pasa a ser `notNull()` con default `null` y forzamos completarlo en onboarding

**`section_roles`**
- Agregar nuevos valores a `role`: `jefe_guardia_masculina`, `jefe_guardia_femenina` (asociados a una pseudo-sección "Jefatura" del RIF)

### 9.2 Tablas nuevas

```
guard_rooms                       habitaciones (una masculina, una femenina, o más si hay)
  id, name, gender, active

guard_beds                        camas con número
  id, room_id, number, status (disponible/indisponible), notes

guard_reservations                reserva de un efectivo para una fecha
  id, profile_id, bed_id, date, created_at, status (activa/cancelada/cumplida)

machine_compartments              gabinetes de las máquinas
  id, machine_slug, name, qr_code (único), active, description

inventory.compartment_id          FK opcional a machine_compartments (para ítems en gabinete)

checklist_definitions             plantilla de un checklist
  id, compartment_id, name, frequency (turno/post-emergencia/manual), active

checklist_executions              cada vez que alguien ejecuta uno
  id, definition_id, performed_by_profile_id, started_at, completed_at,
  status (en_curso/completo/diferido), postponed_reason, postponed_until

checklist_item_results            resultado por ítem
  id, execution_id, inventory_id, status (presente/faltante/danado),
  photo_key, notes

requests                          solicitudes inter-áreas
  id, created_by, target_section_key, category, title, description,
  related_inventory_id, status, assigned_to_profile_id, resolved_at,
  resolution_notes, created_at

request_attachments               archivos adjuntos a una solicitud
  id, request_id, file_key, file_name, mime_type, uploaded_at

announcements (ampliar)           + audience_json (array con grados),
                                  + visible_to_aspirantes, visible_to_postulantes,
                                  + direct_profile_id (si es personal),
                                  + status (borrador/pendiente_aprobacion/aprobado/archivado),
                                  + approved_by, approved_at

announcement_reads                quién leyó qué
  id, announcement_id, profile_id, read_at

courses                           catálogo de cursos
  id, slug, name, description, category (esbas/escuela_tecnica/otro),
  min_grade, duration_hours, active

course_lessons                    lecciones por curso
  id, course_id, order, title, content_type (text/video/practice/evaluation),
  content, material_key (S3)

course_enrollments                quién está inscrito en qué curso
  id, course_id, profile_id, enrolled_at, completed_at, final_grade,
  certificate_key

lesson_progress                   progreso por lección
  id, enrollment_id, lesson_id, status (no_iniciada/en_curso/completada/aprobada),
  score, started_at, completed_at

library_documents                 biblioteca
  id, title, description, category, file_key, uploaded_by,
  uploaded_at, min_grade

certificates (externos)           certificados cargados por el efectivo
  id, profile_id, title, issuer, issued_at, file_key, verified
```

### 9.3 Diagrama de relaciones clave

```
profiles ─┬─< section_roles ─── sections
          ├─< guard_reservations ─── guard_beds ─── guard_rooms
          ├─< course_enrollments ─── courses
          │          └─< lesson_progress ─── course_lessons
          ├─< checklist_executions ─── checklist_definitions ─── machine_compartments
          ├─< requests (como creador o asignado)
          ├─< inventory (como asignado)
          └─< certificates (propios)

machine_compartments ─< inventory
                     └─< checklist_definitions
```

---

## 10. Responsive y accesibilidad

Prioridad alta tras el feedback de la 163. El diseño actual tiene
deficiencias que hay que corregir junto con el rediseño del menú.

### 10.1 Breakpoints definidos

| Rango | Layout |
|---|---|
| ≥ 1280px | Sidebar fijo 280px + contenido + panel lateral cuando aplique |
| 1024 - 1279 | Sidebar fijo 240px + contenido (sin panel lateral) |
| 768 - 1023 | Sidebar colapsable (solo íconos, expande en hover) |
| 480 - 767 | Sidebar oculto, botón hamburguesa, drawer deslizante |
| < 480 | Mobile vertical, drawer ocupa 85% del ancho, áreas táctiles mínimas 44px |

### 10.2 Comportamientos responsive críticos

- **Tablas**: en mobile, las filas se colapsan a tarjetas apiladas
- **Formularios**: inputs ocupan 100% del ancho, labels encima
- **Modales**: en mobile ocupan 100% de la pantalla
- **Preview del Excel de inventario**: en mobile se muestra como lista
  de tarjetas editables, no tabla horizontal
- **Dashboard personal**: las 4 tarjetas de stats pasan a grilla 2×2 en
  tablet, 1 columna en mobile
- **Saludo en el header**: se acorta a "María · Seccionario" en mobile

### 10.3 Accesibilidad

- Contraste AA mínimo en textos pequeños (AAA en textos clave)
- Focus visible en todos los interactivos
- Navegación completa por teclado
- Áreas táctiles mínimas de 44×44px en mobile
- Labels reales en todos los inputs (no placeholders)
- Anuncios de cambios de estado con live regions (aria-live)
- Skip link al contenido principal

---

## 11. Plan de entregas

Orden propuesto:

| Entrega | Contenido | Estado |
|---|---|---|
| 1 | Este documento (arquitectura maestra) | ✅ Ahora |
| 2 | Schema extendido + migración Drizzle | Próximo |
| 3 | Mockups HTML responsive actualizados (menú, mi perfil, faena, capacitación) | Próximo |
| 4 | Refactor del sidebar + permisos v2 en código | Próximo |
| 5 | Implementación React: Mi Perfil enriquecido | Próximo |
| 6 | Implementación React: Guardia Nocturna por género | Próximo |
| 7 | Implementación React: Faena y Servicio (checklists, incidencias, solicitudes) | Próximo |
| 8 | Implementación React: Capacitación (LMS básico) | Próximo |
| 9 | Implementación React: Áreas por sección (fase 1 = Máquinas) | Próximo |
| 10 | Áreas restantes + Anuncios con aprobación | Próximo |

Cada entrega se puede validar independientemente antes de pasar a la
siguiente.

---

## 12. Sistema de Comando de Incidentes (SCI)

El CGBVP usa el Sistema de Comando de Incidentes como modelo estándar
de mando en emergencias (RIF Libro 4, Sección 4). Una versión digital
embebida en el sistema es una funcionalidad futura de alto valor.

### 12.1 Concepto

El SCI es un modelo jerárquico y funcional para gestionar incidentes
de cualquier magnitud. Se activa en emergencias grandes (incendios
estructurales, colapsos, HAZMAT) donde hay múltiples unidades, dotaciones
y recursos que necesitan coordinación formal.

### 12.2 Estructura básica

```
                     Comandante del Incidente
                              │
          ┌───────────────────┼───────────────────┐
     Operaciones          Planificación         Logística
     Atención directa     Situación y recursos  Comunicaciones
     (ataque, rescate,    (partes, mapas,       (agua, combustible,
      triaje)              previsión)            rehab de personal)
                              │
                     Administración y Finanzas
                     (tiempo, compras, reclamos)
```

### 12.3 Visión digital (bases)

Cuando se construya el módulo SCI:

- **Activación del SCI**: el Comandante del Incidente en la escena abre
  un SCI digital desde la app (móvil idealmente)
- **Designación de secciones**: asigna jefes de Operaciones,
  Planificación, Logística, Administración/Finanzas
- **Despliegue de unidades**: visualiza qué compañías y vehículos están
  en la escena (integra con partes de emergencia existentes)
- **Tablero de recursos**: solicitudes de personal, agua, combustible,
  rehabilitación médica
- **Línea de tiempo**: eventos clave con timestamp (ataque iniciado,
  control, extinción, retorno)
- **Cadena de mando visible**: todos los efectivos en la escena saben
  quién está al mando
- **Traspaso de comando**: cuando llega un oficial superior puede tomar
  el mando formalmente
- **Parte consolidado**: al cierre del SCI, se genera un reporte
  consolidado con todos los datos

### 12.4 Integración con el sistema actual

- Cada **emergencia** existente (tabla `emergencies`) puede tener un SCI
  activo asociado (opcional)
- Los efectivos de la **dotación** (`emergency_crew_members`) aparecen
  en el tablero del SCI
- Los **vehículos** despachados (`emergency_vehicles`) son recursos
  disponibles
- Los **tiempos** del parte (despacho, salida, llegada, retorno)
  alimentan la línea de tiempo del SCI

### 12.5 Schema de BD base (no se implementa aún)

```
incident_command_systems       activación de un SCI
  id, emergency_id, opened_at, closed_at, opened_by_profile_id

ics_positions                  personas ocupando posiciones
  id, ics_id, position (ci/ops/plan/log/admin),
  profile_id, assigned_at, released_at

ics_resources                  recursos solicitados o desplegados
  id, ics_id, resource_type (vehiculo/personal/insumo),
  description, status (solicitado/en_camino/en_sitio/liberado),
  requested_by, assigned_to

ics_timeline                   eventos clave
  id, ics_id, event_type, description, timestamp,
  registered_by_profile_id
```

Esta estructura queda **declarada pero no implementada** en esta fase.
Se activa cuando el piloto de UBO 163 esté estable y se decida avanzar.

### 12.6 Roadmap SCI

| Fase | Contenido | Momento |
|---|---|---|
| Base | Schema declarado + documentación | Entrega 2 (ahora) |
| Piloto mínimo | SCI básico desde web para emergencias grandes, con línea de tiempo y posiciones | Cuando el resto del sistema esté estable |
| App móvil | Cliente móvil para el Comandante del Incidente en escena | Fase nacional |
| Integración radio | Botones rápidos para despachos vía radio | Fase nacional avanzada |

---

## 13. Apéndices

### 13.1 Cargos operativos no reglamentarios

Cargos que se usan operativamente pero no están en el RIF:

| Cargo | Función |
|---|---|
| Jefe de Guardia Masculina | Administra la guardia nocturna del sector masculino |
| Jefe de Guardia Femenina | Administra la guardia nocturna del sector femenino |

Se modelan en `section_roles` como roles adicionales asociados a una
pseudo-sección interna llamada **"Jefatura"**.

### 13.2 Figuras del proceso de formación

| Figura | Reconocimiento | Cómo llega |
|---|---|---|
| Postulante | Solo interno de la compañía | Convocatoria interna |
| Aspirante | Registrado en CGBVP | Tras 6 meses de postulante + solicitud aprobada por Departamental |
| Seccionario | Grado bomberil | Tras aprobar ESBAS con resolución |

### 13.3 Horarios operativos

**Turnos de pilotos** (usados para sincronizar checklists):
- Mañana: 07:00 – 15:00
- Tarde: 15:00 – 23:00
- Noche: 23:00 – 07:00

**Guardia nocturna** (reserva de cama):
- Inicio: 20:00 (ajustable por compañía)
- Fin: 08:00 (ajustable por compañía)

---

*Documento vigente. Se actualiza cada vez que se agrega una funcionalidad nueva o cambia un permiso.*
