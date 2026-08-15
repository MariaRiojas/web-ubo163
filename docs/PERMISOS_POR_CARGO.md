# Permisos por Cargo — CUARTEL-ERP

> Referencia para verificar que cada cargo tenga acceso correcto a sus paneles.
> Fuente: `lib/auth/permissions.ts` → función `resolvePermissions`.

---

## Cargos y roles disponibles

| Rol en sistema          | Descripción                                  |
|-------------------------|----------------------------------------------|
| `primer_jefe`           | Primer Jefe de compañía                      |
| `segundo_jefe`          | Segundo Jefe                                 |
| `jefe_seccion`          | Jefe de una sección específica               |
| `adjunto`               | Adjunto/asistente de una sección             |
| `jefe_guardia_masculina`| Jefe de guardia nocturna masculina           |
| `jefe_guardia_femenina` | Jefa de guardia nocturna femenina            |
| `miembro`               | Miembro activo sin cargo directivo           |

---

## 1. Primer Jefe

Recibe **todos** los permisos del sistema (`ALL_PERMISSIONS`).

---

## 2. Segundo Jefe

Permisos base de efectivo activo +

| Permiso                       | Panel / Función                              |
|-------------------------------|----------------------------------------------|
| `company.view_all`            | Vista general de la compañía                 |
| `company.approve_requests`    | Aprobar solicitudes de jefatura              |
| `personnel.view_all`          | Ver todo el personal                         |
| `personnel.edit`              | Crear y editar efectivos                     |
| `profile.view_any`            | Ver cualquier perfil                         |
| `profile.edit_any`            | Editar cualquier perfil                      |
| `guard.manage_male/female`    | Gestionar guardia nocturna                   |
| `guard.config_beds_male/female` | Configurar camas de guardia               |
| `guard.view_male/female`      | Ver guardia nocturna                         |
| `guards.manage/approve`       | Aprobar reservas de guardia                  |
| `incidents.manage_all`        | Gestionar todas las incidencias              |
| `hours.view_all` / `verify`   | Ver y verificar horas de servicio            |
| `reports.view_all` / `generate` | Reportes completos                         |
| `announcements.create_draft`  | Redactar anuncios (sin publicar)             |
| `system.manage_users`         | Administrar usuarios del sistema             |
| `inventory.manage_all`        | Gestionar todo el inventario                 |
| `training.view_all_progress`  | Ver progreso de capacitación de todos        |
| `area.*.view` + `manage`      | Acceso completo a **todas** las secciones    |
| `faena.receive_incident_*`    | Recibir incidencias de todas las áreas       |
| `faena.receive_request_*`     | Recibir solicitudes de todas las áreas       |

---

## 3. Jefe de Sección — Instrucción (`instruccion`)

Permisos base de efectivo activo +

| Permiso                          | Panel / Función                                        |
|----------------------------------|--------------------------------------------------------|
| `section.manage`                 | Gestionar su sección                                   |
| `personnel.view_section`         | Ver personal de su sección                             |
| `personnel.view_all` ¹           | Ver **todo** el personal (necesario para inscribir miembros a cohortes) |
| `incidents.manage_section`       | Gestionar incidencias de instrucción                   |
| `hours.manage` / `verify`        | Registrar y verificar horas                            |
| `reports.view_section`           | Reportes de su sección                                 |
| `guards.approve`                 | Aprobar reservas de guardia                            |
| `announcements.create_draft`     | Redactar anuncios                                      |
| `area.instruction.view`          | Ver panel de instrucción                               |
| `area.instruction.manage`        | Gestionar panel de instrucción (cohortes, ESBAS)       |
| `esbas.manage`                   | Gestionar cursos ESBAS                                 |
| `esbas.instruct`                 | Dictar clases ESBAS                                    |
| `training.manage`                | Gestionar toda la capacitación                         |
| `training.issue_certificate`     | Emitir certificados                                    |
| `training.view_all_progress`     | Ver progreso de todos los alumnos                      |
| `faena.receive_incident_instruction` | Recibir incidencias del área                   |
| `faena.receive_request_instruction`  | Recibir solicitudes del área                   |

> ¹ `personnel.view_all` es necesario para que `GET /api/personnel` devuelva datos al cargar el modal "Agregar Miembros" en una cohorte. El endpoint acepta `area.instruction.view`, `area.instruction.manage` o `training.manage` como permisos alternativos.

---

## 4. Jefe de Sección — Máquinas (`maquinas`)

Permisos base de efectivo activo +

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `section.manage`                 | Gestionar su sección                         |
| `personnel.view_section`         | Ver personal de la sección                   |
| `area.machines.view` / `manage`  | Panel de máquinas                            |
| `inventory.manage` / `manage_section` | Inventario de máquinas                  |
| `faena.receive_incident_machines` / `receive_request_machines` | Bandejas de faena |
| `incidents.manage_section`       | Gestionar incidencias del área               |
| `hours.manage` / `verify`        | Horas de servicio                            |
| `reports.view_section`           | Reportes de la sección                       |
| `guards.approve`                 | Aprobar guardia                              |
| `announcements.create_draft`     | Redactar anuncios                            |

---

## 5. Jefe de Sección — Administración (`administracion`)

Permisos base de efectivo activo +

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `section.manage`                 | Gestionar su sección                         |
| `area.admin.view` / `manage`     | Panel de administración                      |
| `personnel.view_all`             | Ver todo el personal                         |
| `personnel.edit`                 | Crear y editar efectivos                     |
| `profile.edit_any`               | Editar cualquier perfil                      |
| `reports.generate`               | Generar reportes                             |
| `hours.view_all`                 | Ver horas de todos                           |
| `hours.manage` / `verify`        | Gestionar horas                              |
| `faena.receive_incident_admin` / `receive_request_admin` | Bandejas de faena |
| `incidents.manage_section`       | Gestionar incidencias                        |
| `guards.approve`                 | Aprobar guardia                              |
| `announcements.create_draft`     | Redactar anuncios                            |

---

## 6. Jefe de Sección — Imagen (`imagen`)

Permisos base de efectivo activo +

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `section.manage`                 | Gestionar su sección                         |
| `area.image.view` / `manage`     | Panel de imagen                              |
| `content.manage`                 | Gestionar contenido institucional            |
| `announcements.create`           | Publicar anuncios directamente               |
| `faena.receive_incident_image` / `receive_request_image` | Bandejas de faena |
| `incidents.manage_section`       | Gestionar incidencias                        |
| `hours.manage` / `verify`        | Horas de servicio                            |
| `reports.view_section`           | Reportes                                     |
| `guards.approve`                 | Aprobar guardia                              |

---

## 7. Jefe de Sección — Prehospitalaria (`prehospitalaria`)

Igual que Máquinas en estructura, reemplazando el prefijo de área:

| Permiso                            | Función                                |
|------------------------------------|----------------------------------------|
| `area.health.view` / `manage`      | Panel prehospitalario                  |
| `inventory.manage` / `manage_section` | Inventario médico                   |
| `faena.receive_incident_health` / `receive_request_health` | Bandejas |

---

## 8. Jefe de Sección — Servicios Generales (`servicios_generales`)

| Permiso                            | Función                                |
|------------------------------------|----------------------------------------|
| `area.services.view` / `manage`    | Panel de servicios                     |
| `inventory.manage` / `manage_section` | Inventario de servicios             |
| `faena.receive_incident_services` / `receive_request_services` | Bandejas |

---

## 9. Adjunto de Instrucción

Permisos base de efectivo activo +

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `section.view` / `edit`          | Ver y editar su sección                      |
| `personnel.view_section`         | Ver personal de la sección                   |
| `area.instruction.view`          | Ver panel de instrucción (sin manage)        |
| `esbas.instruct`                 | Dictar clases ESBAS                          |
| `training.issue_certificate`     | Emitir certificados                          |
| `faena.receive_incident_instruction` / `receive_request_instruction` | Bandejas |

> **Nota:** El adjunto de instrucción NO tiene `area.instruction.manage`, por lo que no puede crear/cerrar cohortes ni gestionar convocatorias. Si se le asigna esa tarea, debe subirse el rol a `jefe_seccion`.

---

## 10. Adjunto de otras secciones (Máquinas, Prehospitalaria, Servicios)

| Permiso                            | Función                                |
|------------------------------------|----------------------------------------|
| `area.<sec>.view`                  | Ver panel del área                     |
| `area.<sec>.manage`                | Gestionar el área                      |
| `inventory.manage` / `manage_section` | Inventario de la sección            |
| `faena.receive_incident_<sec>` / `receive_request_<sec>` | Bandejas |

---

## 11. Jefe de Guardia (Masculina / Femenina)

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `guard.view_male/female`         | Ver guardia                                  |
| `guard.manage_male/female`       | Gestionar asignaciones de guardia            |
| `guard.config_beds_male/female`  | Configurar camas y dormitorios               |

---

## 12. Efectivo Activo (Seccionario en adelante, sin cargo)

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `profile.view_own` / `edit_own`  | Ver y editar su propio perfil                |
| `announcements.view`             | Ver anuncios                                 |
| `hours.view_own`                 | Ver sus propias horas                        |
| `training.view_own_progress`     | Ver su progreso de capacitación              |
| `training.access_esbas`          | Acceder a ESBAS                              |
| `training.access_escuela_tecnica`| Acceder a Escuela Técnica                    |
| `guard.reserve_bed`              | Reservar cama en guardia nocturna            |
| `guards.reserve`                 | Reservar guardia (legacy)                    |
| `faena.create_incident`          | Crear incidencia                             |
| `faena.create_request`           | Crear solicitud                              |
| `faena.create_checklist`         | Crear checklist de faena                     |
| `incidents.create`               | Crear incidencia (legacy)                    |
| `content.view`                   | Ver contenido institucional                  |
| `inventory.view`                 | Ver inventario                               |
| `area.<sec>.view`                | Ver área de su sección asignada              |
| `section.view`                   | Ver su sección                               |

---

## 13. Aspirante (en ESBAS)

Permisos base de todo usuario +

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `training.access_esbas`          | Acceder al módulo ESBAS                      |

---

## 14. Postulante

Solo permisos base:

| Permiso                          | Función                                      |
|----------------------------------|----------------------------------------------|
| `profile.view_own` / `edit_own`  | Ver su perfil                                |
| `announcements.view`             | Ver anuncios                                 |
| `hours.view_own`                 | Ver sus horas                                |
| `training.view_own_progress`     | Ver su avance                                |
| `content.view`                   | Ver contenido                                |
| `inventory.view`                 | Ver inventario                               |

---

## Qué permiso habilita qué endpoint/panel

| Endpoint / Panel                              | Permiso requerido (al menos uno)                                                |
|-----------------------------------------------|---------------------------------------------------------------------------------|
| `GET /api/personnel` (lista general)          | `personnel.view_all` · `area.admin.manage` · `area.instruction.view` · `area.instruction.manage` · `training.manage` |
| `POST /api/personnel` (crear efectivo)        | `personnel.edit` · `area.admin.manage`                                          |
| `GET /api/aspirantes` (cohortes)              | `area.instruction.view`                                                         |
| `POST /api/aspirantes` (crear cohorte)        | `area.instruction.manage`                                                       |
| `GET /api/aspirantes/{id}` (detalle cohorte)  | `area.instruction.view`                                                         |
| Panel Personal (`/personal`)                  | `personnel.view_all` · `area.admin.manage`                                      |
| Panel Instrucción (`/areas/instruccion`)      | `area.instruction.view`                                                         |
| Panel Aspirantes (`/areas/instruccion/aspirantes`) | `area.instruction.view`                                                    |
| Panel Progreso (`/areas/instruccion/progreso`)     | `area.instruction.view` · `area.instruction.manage`                        |
| Panel Evaluaciones (`/areas/instruccion/evaluaciones`) | `area.instruction.view` · `area.instruction.manage` (calificar requiere `training.manage`) |
| Panel Vehículos (`/areas/maquinas/vehiculos`)  | `area.machines.view` · `area.machines.manage`                                   |
| `gradeEvalResponse` (calificar redacción)     | `training.manage`                                                               |
| `markPracticeAttendance` (marcar práctica)    | `training.manage`                                                               |
| `issueCertificate` (emitir certificado PDF)   | `training.manage` (curso completado + nota ≥ 14/20)                             |
| `GET /api/training/certificate/{profileId}/{courseId}` (descarga cert.) | `training.manage` · `training.issue_certificate` · o el propio dueño |
| Guardia Nocturna — gestión                    | `guard.manage_male` · `guard.manage_female`                                     |
| Guardia Nocturna — reservar                   | `guard.reserve_bed`                                                             |
| Inventario — ver                              | `inventory.view`                                                                |
| Inventario — gestionar sección                | `inventory.manage_section` · `inventory.manage`                                 |
| Inventario — gestionar todo                   | `inventory.manage_all`                                                          |
| Anuncios — publicar                           | `announcements.publish`                                                         |
| Anuncios — redactar borrador                  | `announcements.create_draft` · `announcements.create`                           |
| Reportes completos                            | `reports.view_all`                                                              |
| Reportes de sección                           | `reports.view_section`                                                          |
| Configuración del sistema                     | `system.admin`                                                                  |
| Bandeja de Requerimientos (`/areas/<sec>/requerimientos`) — ver | `area.<sec>.view` (cualquier permiso `area.*.view`) |
| Bandeja de Requerimientos — gestionar (aprobar/rechazar/avanzar estado) | cualquier permiso `area.*.manage` |

---

## Notas de implementación

1. **Los permisos se resuelven en login** (`resolvePermissions` en `lib/auth/permissions.ts`) y se guardan en la sesión JWT. Si se cambia el rol de un usuario, debe cerrar sesión y volver a entrar para que surta efecto.

2. **Verificación en cada API route**: Cada endpoint valida `session.user.permissions` directamente. El menú lateral también se filtra por permisos, pero la validación real está en el servidor.

3. **`area.instruction.view` vs `area.instruction.manage`**: `.view` da acceso de lectura al panel; `.manage` habilita crear cohortes, inscribir miembros, registrar notas y cerrar convocatorias.

4. **Asignación de roles**: Se hace desde `/secciones/{key}` con un usuario que tenga `section.manage` o superior. El rol se guarda en la tabla `ubo163-dev-section-roles` de DynamoDB.
