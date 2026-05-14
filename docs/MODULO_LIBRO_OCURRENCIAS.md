# Especificación Funcional: Libro de Ocurrencias Digital (LOD)

**Proyecto:** CUARTEL-ERP — Compañía de Bomberos 163
**Estado:** Planificación
**Objetivo:** Digitalizar y formalizar el registro de novedades, actas y control de personal, eliminando la pérdida de información y garantizando la seguridad jurídica ante la Intendencia y el CGBVP.

---

## 1. Visión General
El LOD reemplaza los cuadernos foliados físicos (General y Servicios) por un registro inmutable, cronológico y categorizado. Actúa como la "Caja Negra" de la compañía, registrando desde movimientos operativos hasta eventos administrativos y disciplinarios.

## 2. Tipos de Libros y Foliación
Para resolver la confusión actual entre el libro "General" y de "Servicios", el sistema utilizará una **Base de Datos Única** con vistas segregadas:

*   **Folio Único Nacional (Interno):** Cada entrada recibe un número correlativo automático (ej. `LOD-163-2026-0001`).
*   **Selector de Libro:**
    *   **LIBRO MAYOR (General):** Novedades de guardia, visitas, emergencias (fallback), donaciones, directivas del comando.
    *   **LIBRO DE SERVICIOS:** Mantenimiento de unidades, reparaciones del cuartel, ingreso/salida de materiales.
    *   **BITÁCORA DE ASPIRANTES:** Registro específico para postulantes/aspirantes (reemplaza su cuaderno informal).

## 3. Niveles de Visibilidad (Privacidad Granular)
Para mitigar el riesgo de exponer temas delicados y mantener la disciplina:

| Categoría | Visibilidad | Quién puede ver |
| :--- | :--- | :--- |
| **Operativa / General** | Pública | Todo el personal (incl. Aspirantes) |
| **Bienes / Préstamos** | Pública | Todo el personal |
| **Disciplinaria / Preventiva** | Restringida | Seccionarios en adelante (Comando tiene vista completa) |
| **Informe Reservado** | Privada | Solo Primer Jefe y Segundo Jefe |
| **Actividades Aspirante** | Específica | Aspirantes (solo sus registros) e Instructores |

## 4. Estructura de una Ocurrencia (Acta Digital)
Cada registro debe cumplir con el estándar legal para evitar que sea desconocido en auditorías:

1.  **Encabezado Automático:** "Del: [Grado/Nombre] al Comando de Unidad".
2.  **Timestamp Inmutable:** Fecha y hora de creación (servidor) vs Fecha y hora del suceso (manual).
3.  **Categoría Legal:** (Selección obligatoria)
    *   *Ingreso de Bien de Tercero (Préstamo):* Requiere DNI/RUC del dueño y fecha de devolución.
    *   *Donación:* Genera link a formulario de Inventario.
    *   *Disciplina:* Basado en el Reglamento de Faltas y Sanciones (Normativa).
    *   *Emergencia en Contingencia:* Fallback cuando el SGO no funciona.
4.  **Cuerpo del Acta:** Texto enriquecido (Markdown).
5.  **Evidencia Digital:** Capacidad de subir hasta 4 fotos (evidencia de daños, fotos de actas físicas de donación, etc.).
6.  **Firma Electrónica:** Validación mediante la sesión del usuario. No se permiten ediciones post-firma (solo rectificaciones vinculadas).

## 5. Formalización de Aspirantes y Postulantes
El LOD absorberá el cuaderno informal de los aspirantes bajo estas reglas:
*   **Registro de Faena:** Obligación de registrar: Ingreso, Actividad Realizada, Efectivo al Mando responsable.
*   **Validación de Mando:** El registro del aspirante no se "folia" hasta que el Efectivo al Mando le dé el "Visto Bueno" digital.
*   **Impacto en Legajo:** Las horas registradas aquí alimentarán automáticamente su progreso en la Malla ESBAS.

## 6. Integración con otros Módulos
*   **Inventario:** Si una ocurrencia marca un ingreso por préstamo, el ítem se crea automáticamente en el inventario con el tag "AJENO".
*   **Legajo de Personal:** Las ocurrencias de tipo "Disciplina" o "Mérito" aparecen automáticamente en el perfil del bombero mencionado.
*   **Alertas de Comando:** Notificaciones push/email al 1er y 2do Jefe cuando se firme una ocurrencia de categoría "Crítica" o "Disciplina".

---

## 7. Casuísticas de Prevención Legal
*   **Anti-pérdida:** Copias de seguridad diarias en AWS S3.
*   **Trazabilidad de Auditoría:** Log de quién consultó cada folio reservado.
*   **Fe de Erratas:** Si se requiere corregir un folio, el sistema anula el anterior (sin borrarlo) y crea uno nuevo con la referencia: "Este folio rectifica al N° XXX".

