# Mockup — Configuración de Sincronización CGBVP

Mockup estático de la pantalla `/configuracion/cgbvp` donde el Primer o
Segundo Jefe ingresa sus credenciales del intranet CGBVP para activar
la descarga automática de datos.

## Cómo abrir

Doble click en `index.html`. Se abre en el navegador. Sin servidor.

## Las 3 vistas del mockup

Arriba hay un **switcher dorado** para alternar entre los 3 estados:

### 1. Sin configurar (vista inicial)
- Lo que ve el Primer/Segundo Jefe la primera vez
- Banner informativo explicando qué hace la sincronización
- Formulario con usuario + contraseña + consentimiento obligatorio
- Explicación de las 4 fuentes de datos que se descargan

### 2. Activa y funcionando
- Estado con pulso animado verde
- 4 métricas clave (última descarga, próxima, total ok, errores)
- Toggle de descarga automática
- Credenciales guardadas (usuario enmascarado, contraseña oculta)
- Botones de ejecución manual para las 4 tareas
- Registro de actividad (últimas acciones)
- Zona peligrosa al final

### 3. Con error
- Banner rojo con acción clara ("Actualizar credenciales")
- Estado con pulso animado rojo
- Métricas con errores consecutivos destacados
- Tiempo desde el último éxito en rojo

## Detalles del lenguaje visual

Consistente con el mockup de `/inventario`:
- Paleta antracita · rojo CGBVP · dorado institucional · verde operativo
- Fraunces para títulos · Inter Tight para UI · JetBrains Mono para datos
- Corner brackets en cards críticas
- Hairlines dobles en separadores
- Sellos alfabéticos, escudo como marca de agua
- Lema **"Dios · Patria · Humanidad"** en el footer con tracking amplio

## Textos

Todos en **español peruano formal con "usted"**, siguiendo
`docs/GUIA_REDACCION.md`. Usa vocabulario oficial del RIF:
- "Primer Jefe" / "Segundo Jefe"
- "intranet del CGBVP"
- "padrón de bomberos"
- "descarga automática de datos"
- Grados antepuestos a nombres

## Estados de animación

- **Pulse ring** en el indicador de estado (verde/rojo según estado)
- **Fade up staggered** al cargar la página
- **Slide arrow** al hover en task cards
- **Transition scale** en el toggle switch

## Próximos pasos tras aprobación

1. Portar el layout a componente React en `app/(intranet)/configuracion/cgbvp/`
2. Conectar al endpoint `GET /api/config/cgbvp/status` para datos reales
3. Formulario → `POST /api/config/cgbvp/credentials` con validación de login
4. Toggle → `POST /api/config/cgbvp/auto-sync`
5. Task cards → `POST /api/config/cgbvp/run-now?task=...`
6. Botón eliminar → `DELETE /api/config/cgbvp/credentials` con modal de confirmación
