# Sistema de Comando de Incidentes (SCI) — Roadmap

**Documento de diseño y planificación de la digitalización del SCI**
**Versión:** 1.0 — Mayo 2026
**Estado:** Bases declaradas · Implementación diferida

Este documento define cómo se va a digitalizar el Sistema de Comando
de Incidentes del CGBVP dentro del ERP. La implementación arranca cuando
el resto del sistema (inventario, guardia, capacitación, partes) esté
estable en la UBO 163.

---

## 1. Qué es el SCI

El Sistema de Comando de Incidentes es el **modelo estándar de mando en
emergencias** que usa el CGBVP. Se rige por el **RIF Libro 4, Sección 4
— Cadena de Mando en Emergencias**.

Es un modelo jerárquico y funcional que se activa en emergencias grandes
o complejas (incendios estructurales mayores, colapsos, HAZMAT,
emergencias con múltiples compañías desplegadas, etc.), donde hay
muchas unidades, personal y recursos que necesitan coordinación formal.

No toda emergencia tiene un SCI activo. Solo cuando la magnitud del
incidente lo justifica, el Comandante del Incidente activa el sistema.

### 1.1 Principios del SCI (según RIF)

1. **Mando único.** Hay un solo Comandante del Incidente a la vez en la
   escena. Todas las decisiones operativas pasan por él.
2. **Cadena de mando visible.** Todos los efectivos en la escena saben
   quién está al mando y a quién reportan.
3. **Extensión modular.** La estructura se expande o contrae según la
   magnitud del incidente. Una emergencia chica solo activa Operaciones;
   una grande activa las 4 secciones + ramas y grupos.
4. **Cadena de información.** Los partes fluyen hacia arriba; las
   órdenes hacia abajo.
5. **Transferencia formal de mando.** Cuando llega un oficial de mayor
   grado o con mayor competencia técnica, el mando se transfiere en un
   acto formal registrado.

---

## 2. Estructura jerárquica

```
                  COMANDANTE DEL INCIDENTE (CI)
                  · Asume mando inicial
                  · Responsable de todo el incidente
                  · Puede transferir el mando
                          │
    ┌──────────────┬──────┴───────┬──────────────┐
    │              │              │              │
OPERACIONES   PLANIFICACIÓN    LOGÍSTICA      ADMINISTRACIÓN
Ataque        Situación        Agua            Y FINANZAS
Rescate       Recursos         Combustible     Tiempo
Triaje        Documentación    Comunicaciones  Compras
              Previsión        Rehabilitación  Reclamos
```

### 2.1 Roles del Estado Mayor (staff del CI)

Estos reportan directamente al Comandante del Incidente:

- **Oficial de Seguridad** — vigila las condiciones de riesgo para el
  personal en el incidente. Tiene autoridad para detener operaciones si
  detecta riesgo inminente.
- **Oficial de Enlace** — coordina con agencias externas (policía, SAMU,
  empresas de servicios, fiscalía).
- **Oficial de Información Pública** — maneja comunicación con prensa y
  comunidad. Relevante en incidentes de gran impacto.

### 2.2 Secciones operativas

Cada sección tiene un **Jefe de Sección** y puede expandirse en ramas,
grupos y unidades según la complejidad.

| Sección | Función principal |
|---|---|
| Operaciones | Ataque directo (extinción, rescate, triaje, control HAZMAT) |
| Planificación | Recopilación y análisis de información; gestión de recursos en tiempo real |
| Logística | Soporte operativo: agua, combustible, comunicaciones, rehabilitación de personal |
| Administración y Finanzas | Control de tiempo, compras urgentes, reclamos, documentación administrativa |

---

## 3. Flujo de un incidente con SCI activo

### 3.1 Apertura

1. El primer oficial en llegar a la escena asume el **mando inicial**
2. Al ver la magnitud, declara "SCI activado" por radio
3. Desde la app móvil (o desde cualquier dispositivo) abre un SCI digital
4. Asigna un **nombre descriptivo** al incidente (ej: "Incendio estructural Calle 28 de Julio")
5. Registra nivel de complejidad inicial (1-5 según NIMS)
6. Asigna posiciones conforme llega personal capacitado

### 3.2 Operación

- **Despliegue de recursos.** Cada unidad que llega al lugar se
  registra. La app muestra el tablero completo de quién está en escena
  y qué función cumple.
- **Solicitudes.** El Jefe de Operaciones solicita recursos (más agua,
  más personal, apoyo HAZMAT) mediante el tablero del SCI. Los
  recursos se marcan como "solicitado → en camino → en sitio".
- **Línea de tiempo.** Cada evento clave se registra automáticamente o
  manualmente con timestamp: ataque iniciado, control parcial,
  extinción, rescate de víctima, arribo de ambulancias, etc.
- **Transferencia de mando.** Si llega un Brigadier o un oficial
  superior, puede asumir el mando. El sistema registra la
  transferencia formalmente con hora, de quién a quién, motivo.

### 3.3 Cierre

1. Control del incidente declarado
2. Liberación progresiva de unidades
3. El CI declara "incidente cerrado"
4. El sistema genera un **parte consolidado** con:
   - Timeline completo
   - Recursos desplegados
   - Posiciones ocupadas
   - Duración de cada fase
   - Narrativa final del CI (campo libre al cerrar)

---

## 4. Base de datos (ya declarada en el schema v2)

El archivo `lib/db/schema/ics.ts` ya contiene las 4 tablas base:

| Tabla | Propósito |
|---|---|
| `incident_command_systems` | Cada SCI activado (1:1 con una emergencia opcional) |
| `ics_positions` | Personas ocupando posiciones, con ingreso y liberación |
| `ics_resources` | Recursos solicitados/desplegados (vehículos, personal, insumos) |
| `ics_timeline_events` | Línea de tiempo con 13 tipos de evento estándar |

El schema está declarado pero **no se implementa UI** en esta fase.
Cuando se construya, las consultas van directo contra estas tablas.

---

## 5. Integración con lo que ya existe

El SCI no vive aislado — se conecta con partes de emergencia y el
padrón del CGBVP:

- Un SCI se **abre desde una emergencia** (`emergencies.id` vinculado).
  La emergencia puede existir sin SCI (caso normal); el SCI siempre
  tiene una emergencia asociada cuando aplica.
- Las posiciones del SCI (`ics_positions.profile_id`) referencian a
  efectivos reales del padrón.
- Los vehículos desplegados en una emergencia
  (`emergency_vehicles`) se pueden levantar como **recursos iniciales**
  del SCI al activarlo (pre-población automática).
- Al cerrar el SCI, los tiempos clave alimentan el **parte consolidado**
  y pueden sincronizar con el parte oficial del CGBVP.

---

## 6. UI futura (no implementada, solo definida)

Cuando se construya, la UI del SCI tendrá:

### 6.1 Tablero principal del incidente

- Header con nombre del incidente, tiempo transcurrido, nivel de complejidad
- Mapa con ubicación aproximada
- Tarjetas por sección (Comando, Operaciones, Planificación, Logística,
  Administración) mostrando quién está al mando
- Contador de recursos en sitio vs solicitados
- Acceso rápido a los principales logs

### 6.2 Asignación rápida de posiciones

- Buscar bombero por código CGBVP o nombre
- Asignarle una posición en cualquier sección
- Registrar hora de asignación
- Liberarlo cuando termine su rol

### 6.3 Solicitud de recursos

- Botón prominente "Solicitar recurso"
- Formulario simple: tipo + descripción + prioridad
- Lista en tiempo real del estado (solicitado/en camino/en sitio/liberado)

### 6.4 Línea de tiempo

- Eventos en orden cronológico descendente
- Cada evento: hora, tipo, descripción, quién lo registró
- Botón "Agregar nota" siempre visible para el equipo de Planificación

### 6.5 Transferencia de mando

- Modal de confirmación doble
- Selección del nuevo CI (debe ser personal en escena)
- Motivo (opcional pero recomendado)
- Registro inmediato en timeline

### 6.6 Parte consolidado al cierre

- Formato imprimible (PDF)
- Incluye todo el timeline + posiciones + recursos + narrativa
- Puede enviarse al intranet CGBVP como parte oficial

---

## 7. Consideraciones técnicas

### 7.1 Móvil primero

La UI del SCI debe funcionar perfectamente en celular. El Comandante del
Incidente probablemente lo usa desde el campo, sin PC. Prioridades:

- Touch targets grandes (48px mínimo)
- Lectura clara en luz solar directa (contraste alto)
- Botones con acción directa, sin modales innecesarios
- Offline-first: si se pierde conectividad, sigue funcionando y sincroniza
  al recuperarla

### 7.2 Tiempo real

Todos los participantes del SCI ven el mismo tablero actualizado. Esto
requiere:

- WebSockets o Server-Sent Events para sincronización en vivo
- Estado local con reconciliación contra el servidor
- Indicador visual cuando hay cambios pendientes de sincronizar

### 7.3 Auditoría total

Cada acción del SCI queda registrada con timestamp y autor. No se puede
editar ni borrar entradas del timeline (append-only). Esto es
importante porque el registro del SCI puede ser requerido en
investigaciones posteriores de incidentes graves.

---

## 8. Roadmap de implementación

| Fase | Alcance | Pre-requisitos | Duración estimada |
|---|---|---|---|
| 0 · Base | Schema declarado + documentación | — | ✅ Hecho |
| 1 · MVP web | CRUD básico web: abrir SCI, asignar posiciones, registrar timeline manual, cerrar SCI | Sistema base estable (inventario + guardia + partes) | 2-3 semanas |
| 2 · Tablero colaborativo | Sincronización en tiempo real vía WebSockets; múltiples usuarios editando | Infra WebSocket funcionando | 3-4 semanas |
| 3 · App móvil | Cliente móvil nativo o PWA con offline-first para el CI en campo | MVP web estable | 4-6 semanas |
| 4 · Integración radio | Integración con sistema de despacho por radio (si CGBVP lo permite) | Fase nacional del ERP | Indefinido |
| 5 · Métricas post-incidente | Dashboard de análisis de SCIs pasados (tiempos promedio, recursos usados por tipo de incidente, etc.) | MVP con varios SCIs cerrados | 2 semanas |

---

## 9. Alternativa simplificada (si el SCI completo es demasiado)

Si cuando llegue el momento de implementar esto, la complejidad total es
alta y conviene hacer algo más sencillo primero, existe una versión
mínima viable:

**"Parte operativo extendido"**
- Mismo concepto pero sin tiempo real ni roles formales
- Un solo usuario (el CI) va registrando lo que pasa
- Al final, exporta un PDF con formato de parte operativo extendido
- Suma valor sobre el parte actual del CGBVP con muy poco desarrollo

Esto es fallback. El diseño completo del SCI es el objetivo, pero si el
piloto muestra que no hay capacidad para construirlo rápido, este
camino intermedio es aceptable.

---

## 10. Criterios para activar esta fase

No empezamos a construir el SCI digital hasta cumplir:

1. ✅ Sistema base estable en UBO 163 (inventario, guardia, faena,
   capacitación, anuncios)
2. ✅ Al menos **3 meses de uso sostenido** sin bugs mayores
3. ✅ El Primer Jefe o Segundo Jefe **pide explícitamente** el SCI
4. ✅ Presupuesto AWS aprobado para la fase B (WebSockets requieren más
   infra)
5. ✅ Al menos una emergencia reciente donde el SCI hubiese sido útil
   (caso concreto para orientar el diseño)

Cuando los 5 criterios se cumplan, se actualiza este documento con un
plan detallado de las 6-8 semanas de trabajo.

---

## 11. Referencias normativas

- **RIF CGBVP 2024** — Libro 4, Sección 4 "Cadena de Mando en Emergencias"
  - Capítulo 1 · Mando en emergencias
  - Capítulo 2 · Cadena de mando
- **NIMS** (Sistema Nacional de Manejo de Incidentes — referencia
  internacional)
- **FEMA ICS** (Incident Command System original — EEUU)
- **ISO 22320** — Gestión de emergencias, principios de gestión de
  incidentes

---

*Este documento se actualiza cuando se activen los criterios de la
sección 10 o cuando se inicie la implementación.*
