# Mockup de Diseño — Inventario UBO 163

Diseño de referencia estático para validar la dirección visual antes de
integrar a los componentes React reales.

## Cómo abrir

Hacé doble click en **`index.html`** — se abre en tu navegador default.

Todo corre local, sin servidor. Las fuentes se descargan de Google Fonts
(necesitás conexión a internet la primera vez; después quedan cacheadas).

## Vistas incluidas

| Archivo | Vista |
|---|---|
| `index.html` | Página principal de inventario con sidebar de almacenes, tabla densa y panel de ficha técnica |
| `import-modal.html` | Modal de importación Excel con vista previa editable, filtros por estado y stepper |
| `attachments-modal.html` | Modal de adjuntos de un ítem — ficha técnica, certificaciones, fotos |

Los 3 están enlazados: podés navegar de uno a otro con click.

## Dirección estética

**Concepto:** *"Briefing operativo institucional"* — documento técnico
digital, no dashboard SaaS genérico.

- **Fondo:** Antracita (`#0A0E14`) con textura de ruido sutil y glows suaves
- **Tipografía:**
  - `Fraunces` — display, serif con carácter institucional
  - `Inter Tight` — UI, sans condensada y contemporánea
  - `JetBrains Mono` — data (códigos CBP, timestamps, números de parte)
- **Acentos:**
  - Rojo 163 — usado con moderación para jerarquía crítica
  - Dorado institucional — números de compañía, sellos, códigos CBP
  - Verde esmeralda operativo · Ámbar industrial · Rojo crítico
- **Detalles firma:**
  - Corner brackets en cards críticas (estilo display técnico)
  - Sellos alfabéticos de almacén (MQ, SN, SG, IN, IM, AD)
  - Escudo UBO 163 como watermark al fondo
  - Hairlines dobles en separadores institucionales
  - Numerales romanos y etiquetas tipo documento oficial

## Para revisar

Fijate especialmente en:

1. La **jerarquía tipográfica** (Fraunces para títulos, mono para data)
2. Los **estados de fila** en la tabla: operativo / revisión / crítico — cada uno tiene
   su propio tratamiento (borde izquierdo, color, badge)
3. El **stepper** y los cards de **resumen con corner brackets** en el modal de import
4. El panel **ficha técnica** del ítem seleccionado (columna derecha en index)

## Qué puede cambiar

El mockup está hecho para validar dirección, no es pixel-perfect final.
Se pueden ajustar:

- Proporciones exactas (anchos de columnas, padding)
- Curvatura del rojo (si lo querés más brillante o más profundo)
- Densidad de la tabla (filas más compactas vs más respiradas)
- Cantidad de watermark del escudo

Pero el *lenguaje visual* (paleta, tipografía, corner brackets, hairlines,
monoespaciada para data) debería quedarse como está salvo que veas un
quiebre mayor.

## Próximos pasos (cuando aprobés)

1. Portar los estilos a las variables de Tailwind del proyecto
2. Refactorizar el `InventarioClient` real para usar este layout
3. Reemplazar el `ImportInventoryModal` y `AttachmentsModal` con el nuevo tratamiento
4. Aplicar la misma paleta y tipografía al resto de pantallas (Dashboard, Mi Perfil, etc.) — esto unifica toda la app
