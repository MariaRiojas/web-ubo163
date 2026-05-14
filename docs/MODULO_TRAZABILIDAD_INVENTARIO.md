# Especificación Funcional: Trazabilidad y Transferencia de Inventario

**Proyecto:** CUARTEL-ERP — Compañía de Bomberos 163
**Objetivo:** Garantizar el rastro inmutable de cada activo e insumo de la compañía, facilitando los intercambios entre áreas (Sanidad, Máquinas, SSGG) y eliminando la pérdida de equipos por falta de registro.

---

## 1. El Concepto de "Custodia e Intercambio"
El sistema reconoce que los equipos se mueven entre áreas por tres razones principales:
1.  **Exceso de Stock:** Sanidad almacena en Servicios Generales por falta de espacio físico.
2.  **Mantenimiento:** Un equipo falla y se envía a SSGG para reparación.
3.  **Reposición Operativa:** SSGG entrega un equipo de reserva para mantener el área activa.

## 2. Estados de Trazabilidad del Activo
Cada ítem en el inventario tendrá un historial (Timeline) que registrará:
*   `INTEGRACIÓN`: Fecha de alta (vínculo a donación/compra en el LOD).
*   `TRANSFERENCIA`: "De Área A a Área B" con autor y motivo.
*   `CAMBIO DE ESTADO`: De Operativo a Mantenimiento/Baja/Extraviado.
*   `SALIDA A EMERGENCIA`: Vinculado al Parte de Emergencia donde se usó.

## 3. Workflow de Transferencia Inter-Áreas
Para evitar que un equipo "desaparezca" al salir de un área, el ERP implementará un **"Handshake Digital"**:
1.  **Área Origen:** Inicia la transferencia (Ej: Sanidad envía monitor a SSGG por falla).
2.  **Estado Transitorio:** El ítem aparece como `EN TRÁNSITO`. Sigue siendo responsabilidad del origen hasta que se reciba.
3.  **Área Destino:** Escanea el QR y acepta el cargo. El ítem cambia de ubicación y responsabilidad legal.
4.  **Reposición:** Al aceptar un equipo dañado, el sistema despliega el botón "Entregar Reposición" para que SSGG asigne un equipo operativo de su stock al área afectada.

## 4. Gestión de Insumos (Sanidad y Limpieza)
Para objetos consumibles (gasas, ampollas, detergentes):
*   **Manejo de Lotes:** Registro obligatorio de Fecha de Vencimiento.
*   **Alertas FEFO (First Expired, First Out):** El sistema marcará con rojo los insumos en Servicios Generales que deben enviarse a Sanidad primero por estar próximos a vencer.
*   **Consumo Directo:** Sanidad podrá "dar de baja por uso" insumos directamente desde su dashboard.

## 5. Inventario en Emergencias (Control de Pérdidas)
*   **Check-out de Máquina:** Antes de salir, se confirma que la unidad lleva su inventario estándar.
*   **Reporte de Daño en Escena:** El Efectivo al Mando puede registrar desde su celular si un equipo se rompió o se perdió durante el incendio. Esto genera una alerta automática a Servicios Generales al cerrar el parte para que preparen el reemplazo.

## 6. Auditoría de Jefatura
El Primer y Segundo Jefe tendrán un reporte de **"Equipos fuera de servicio"** que consolidará:
*   Qué área tiene más fallas.
*   Cuánto tiempo lleva un equipo en mantenimiento en SSGG sin ser reparado.
*   Valor referencial de las pérdidas mensuales.
