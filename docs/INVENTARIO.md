# Gestión de Inventario — Guía para Encargados de Almacén

**CUARTEL-ERP · UBO 163**

Esta guía explica cómo los encargados de cada almacén pueden cargar, editar y documentar su inventario usando la plantilla Excel y la web.

---

## 1. ¿Quién puede gestionar inventario?

Según el reglamento interno, los siguientes roles tienen permiso `inventory.manage`:

| Rol | Acceso |
|---|---|
| Primer Jefe | Todos los almacenes |
| Segundo Jefe | Todos los almacenes |
| Jefe de Máquinas + Adjunto | Inventario de Máquinas + las 4 máquinas (MAQUINA 163-1, AMBULANCIA 163, RESCATE 163, AUXILIAR 163) |
| Jefe de Servicios Generales + Adjunto | Almacén de Servicios |
| Jefe de Prehospitalaria + Adjunto | Almacén de Sanidad + AMBULANCIA 163 |
| Jefe de Instrucción | Almacén de Instrucción |
| Jefe de Imagen | Almacén de Imagen |
| Jefe de Administración | Almacén de Administración |

Todo el personal activo puede **ver** el inventario general de la compañía, pero solo los roles anteriores pueden **editarlo**.

---

## 2. ¿Qué almacenes existen?

La compañía 163 tiene 6 tipos de almacén, reflejando los espacios físicos:

| Tipo (backend) | Nombre visible | Contenido típico |
|---|---|---|
| `servicios` | Almacén de Servicios Generales | Espuma, mangueras, generadores, EPP de reserva |
| `sanidad` | Almacén de Sanidad | Medicamentos, gasas, equipos médicos de reserva |
| `instruccion` | Almacén de Instrucción | Material de ESBAS, simulación, prácticas |
| `imagen` | Almacén de Imagen | Banderas, insignias, material de ceremonias |
| `administracion` | Almacén de Administración | Papelería, equipos de oficina |
| `maquina` | Inventario de una máquina | Lo que está a bordo de la autobomba, ambulancia, rescate o auxiliar |

Las 4 máquinas de la 163:

| Label (Excel / UI) | Slug (backend) |
|---|---|
| MAQUINA 163-1 | `maquina_163_1` |
| AMBULANCIA 163 | `ambulancia_163` |
| RESCATE 163 | `rescate_163` |
| AUXILIAR 163 | `auxiliar_163` |

> Usá siempre los **labels** (con mayúsculas y espacios) al llenar el Excel. El sistema los convierte al slug internamente.

---

## 3. Cargar inventario desde Excel

### 3.1 Descargar la plantilla

1. Andá a **Intranet → Inventario**.
2. Hacé click en **Descargar plantilla**. Se descarga un archivo `plantilla-inventario-163-AAAA-MM-DD.xlsx`.
3. La plantilla tiene 4 hojas:
   - **Items** — acá llenás tu inventario (1 fila por ítem).
   - **Instrucciones** — qué es cada columna y cuándo llenarla.
   - **Referencia** — listas válidas (categorías, subcategorías EPP, máquinas, unidades).
   - **Ejemplos** — filas de muestra para distintos tipos de ítems.

### 3.2 Llenar la hoja "Items"

**Columnas obligatorias (marcadas con \* en el header):**

1. `Nombre del objeto` — ej: "Desfibrilador DEA", "Ampolla Adrenalina 1mg"
2. `Categoría` — elegir del dropdown (categorías principales)
3. `Tipo de almacén` — `servicios`, `sanidad`, `maquina`, etc.
4. `Cantidad` — número entero ≥ 0
5. `Condición` — `operativo`, `mantenimiento`, `baja`, `pendiente_revision`

Si `Tipo de almacén = maquina`, también es obligatorio:

6. `Máquina (si aplica)` — elegí MAQUINA 163-1 / AMBULANCIA 163 / RESCATE 163 / AUXILIAR 163

**Columnas opcionales pero muy recomendadas por tipo de ítem:**

- **Medicamentos:** `Lote`, `Fecha de vencimiento`, `Cantidad`, `Unidad de medida` (ampolla/frasco/tableta)
- **Insumos médicos:** `Lote`, `Fecha de vencimiento`, `Cantidad`, `Unidad` (caja/unidad)
- **EPP estructural (capote, pantalón, casco, etc.):** `Subcategoría`, `Marca`, `Modelo`, `Año fabricación`, `Vida útil (meses)`, `Asignado a (código)`
- **EPP técnico (radio, linterna):** `Subcategoría`, `Marca`, `Modelo`, `Número de serie`, `Asignado a (código)`
- **Extintores / SCBA:** `Requiere certificación = Sí`, `Próxima certificación`
- **Herramientas hidráulicas:** `Marca`, `Modelo`, `Número de serie`, `Última/próxima mantención`
- **Equipos médicos (desfibrilador):** `Marca`, `Modelo`, `Número de serie`, `Próxima mantención`

### 3.3 Formato de `Asignado a (código)`

Este campo identifica al bombero o piloto al que se le asignó el equipo. Acepta 3 formatos:

| Formato | Significado | Ejemplo |
|---|---|---|
| `A#####` | Código CGBVP del bombero activo | `A23118` |
| `R#####` | Código de piloto rentado | `R09570` |
| `########` | DNI de 8 dígitos (fallback para bomberos recién graduados sin código todavía) | `45678912` |

> Si el sistema no reconoce el código, verás un error en la vista previa con el mensaje "Código XYZ no corresponde a ningún efectivo o piloto activo".

### 3.4 Formato de fechas

Aceptamos dos formatos, usá el que te sea más cómodo:

- **AAAA-MM-DD** (recomendado) — ej: `2027-03-15`
- **DD/MM/AAAA** — ej: `15/03/2027`

Celdas sin fecha: dejarlas vacías.

### 3.5 EPP por partes (importante)

El EPP se entrega **por pieza**, no como kit completo. Si al bombero `A23118` le entregaste capote + pantalón + casco, carga **3 filas separadas**:

| Nombre | Subcategoría | Marca | Modelo | Asignado |
|---|---|---|---|---|
| Capote estructural | capote | Globe | G-XTREME | A23118 |
| Pantalón estructural | pantalon | Lion | V-Force | A23118 |
| Casco estructural | casco | Bullard | UPF | A23118 |

Si después le entregás botas, agregás otra fila:

| Botas estructurales | botas | HAIX | Fire Flash | A23118 |

Las subcategorías de EPP van más allá de lo estructural — incluyen también:

- `radio`, `linterna`, `lampara_casco`, `mascara_proteccion`, `gafas`, `arnes`, `cuerda_personal`
- `casillero`, `jaula`, `gaveta` (espacios físicos asignados al efectivo)

---

## 4. Subir el Excel e importar

1. En **Intranet → Inventario**, hacé click en **Importar desde Excel**.
2. Arrastrá el archivo o hacé click en "Seleccionar archivo".
3. El sistema valida cada fila y te muestra una **vista previa con estado**:
   - ✅ **Válidas** — listas para importar
   - ⚠️ **Advertencias** — se pueden importar pero hay algo para revisar (ej: fecha de vencimiento en < 90 días, medicamento sin lote)
   - ❌ **Con error** — no se pueden importar hasta corregir

### 4.1 Editar filas con error directamente en la vista previa

Si ves filas con error:

1. Filtrá por "Solo con error" para verlas todas juntas.
2. Corregí la celda problemática directamente en la tabla (los dropdowns se abren al click, las fechas tienen calendario).
3. Cuando termines, hacé click en **Revalidar**.
4. Cuando ya no haya errores, el botón **"Importar N válidas"** se habilita.

> Solo se importa cuando apretás ese botón. Hasta ese momento no hay nada en la base de datos — podés cerrar el modal sin consecuencias.

### 4.2 Advertencias comunes

| Mensaje | Qué significa | Acción |
|---|---|---|
| "Vence en menos de 90 días" | Un medicamento o insumo está próximo a vencer | Planificar reposición |
| "Certificación vencida" | Un SCBA/extintor/cuerda necesita recertificación | Agendar certificación |
| "Vida útil excedida" | Un EPP estructural superó su vida útil | Dar de baja |
| "Sin stock" | La cantidad es 0 | Verificar si corresponde importarlo |
| "Medicamento sin lote ni fecha de vencimiento" | Faltan datos críticos de trazabilidad farmacéutica | Completar esos campos |
| "EPP sin subcategoría" | No se especificó el tipo (capote/casco/...) | Agregar subcategoría |

---

## 5. Subir fichas técnicas, actas de entrega y fotos

Después de importar el ítem, podés adjuntarle documentos:

1. Desde la tabla de inventario, hacé click en el ítem.
2. Hacé click en el ícono **📎 Adjuntos**.
3. Se abre un modal donde podés:
   - **Subir archivos** (PDF, JPG, PNG, WEBP; máximo 10 MB, hasta 10 por ítem)
   - **Tipar** cada adjunto: ficha técnica, acta de entrega, fotografía, certificación, factura, otro
   - **Agregar una nota** (ej: "Acta firmada el 15-mar-2026 por A23118")
   - **Descargar** o **eliminar** adjuntos existentes

### 5.1 Cuándo usar cada tipo de adjunto

- **Ficha técnica**: manual o datasheet del fabricante. 1 por equipo.
- **Acta de entrega**: cuando se asigna EPP a un bombero, escaneá el acta firmada y adjuntala al ítem correspondiente. Esto queda como evidencia de entrega.
- **Fotografía**: foto del equipo en buen estado (útil para comparar después de uso).
- **Certificación**: certificado de hidrostática, ANSI, ISO, etc.
- **Factura**: comprobante de compra (útil para seguros y reposición).

---

## 6. Preguntas frecuentes

**¿Puedo importar el mismo Excel varias veces?**
Sí. Si un ítem ya existe en la BD con el mismo `Código CBP`, se actualiza. Los ítems sin código CBP se crean siempre como nuevos.

**¿Cuántas filas puedo importar a la vez?**
Hasta 500 por archivo. Si tenés más, dividilo en varios archivos.

**¿El archivo tiene fórmulas o fechas extrañas?**
El sistema ignora fórmulas y lee el valor calculado. Las fechas de Excel se convierten automáticamente.

**¿Borré sin querer un ítem del Excel antes de importar? ¿Lo perdí?**
No. Mientras no aprietes el botón "Importar N válidas", nada se guarda. Podés subir de nuevo el archivo corregido.

**¿Qué pasa si me equivoqué al importar?**
Cada ítem tiene un ID único. Si hay errores masivos, contactá al Primer Jefe o al administrador del sistema para corregir en BD. Idealmente, **validá bien en la vista previa antes de importar**.

**¿Cuántos adjuntos puedo subir por ítem?**
Hasta 10. Si necesitás más, hablemos con sistemas para ajustar.

**El sistema me dice que un código A23118 no existe. ¿Qué hago?**
Revisá que el bombero esté cargado en el sistema (se sincroniza automáticamente con CGBVP cada cierto tiempo). Si es muy nuevo, podés usar su DNI como fallback hasta que CGBVP le asigne código oficial.

---

## 7. Contacto

- **Soporte técnico:** sistemas@bomberos163.pe
- **Dudas sobre qué cargar:** Jefe de tu sección
- **Errores reportables:** `issues` en el repositorio del proyecto

---

*Documento vigente a Mayo 2026. Esta guía puede actualizarse según evolucione el sistema.*
