# Sincronización con el intranet del CGBVP

Guía práctica para el Primer Jefe y el Segundo Jefe de la Compañía.

---

## ¿Qué es esta sincronización?

El sistema CUARTEL-ERP necesita descargar información oficial del intranet
del CGBVP (`bomberosperu.gob.pe/extranet`) para mantener actualizada la data
de la compañía. Esa información incluye:

- **Padrón de bomberos** con sus códigos CGBVP, grados y DNI
- **Estado actual de la compañía** (personal en turno, estado de vehículos)
- **Partes de emergencia** de las salidas operativas
- **Asistencia mensual** consolidada (días, guardias, horas, emergencias)

Para acceder a esa información, el sistema necesita **unas credenciales
válidas del intranet institucional**. Estas credenciales las aporta el
Primer Jefe o el Segundo Jefe desde la pantalla de configuración.

---

## ¿Por qué debo ingresar mis credenciales del intranet?

Actualmente el CGBVP no ofrece una forma oficial para que sistemas de
terceros accedan a la información de una compañía. La única vía disponible
es usar un usuario y contraseña que ya tenga acceso al intranet.

Este sistema ha sido diseñado para que sus credenciales se manejen de la
forma más segura posible:

- Se **validan antes de guardar** (si son incorrectas, no se guardan)
- Se **guardan con cifrado** en un servicio especializado (AWS Secrets Manager)
- **Nadie más puede verlas** —ni el administrador del sistema, ni otros
  bomberos, ni consultas directas a la base de datos
- En la pantalla solo se muestra una versión enmascarada
  (ejemplo: `A2****18` en lugar de `A23118`)
- Puede **revocarlas en cualquier momento** desde la misma pantalla

---

## Cómo configurar la sincronización (primera vez)

### Paso 1 · Ingresar a Configuración

En el menú lateral, abra **Sistema → Configuración**, y dentro busque
la sección **Sincronización con el CGBVP**.

Esta pantalla solo está disponible para el Primer Jefe y el Segundo Jefe.
Si no la ve, es porque su cuenta no tiene ese permiso.

### Paso 2 · Ingresar sus credenciales

En el formulario:

1. **Usuario del CGBVP**: ingrese su código (formato `A#####`, por ejemplo
   `A23118`). Es el mismo con el que ingresa a `bomberosperu.gob.pe/extranet`.
2. **Contraseña**: la misma que usa en el intranet del CGBVP.

### Paso 3 · Aceptar el consentimiento

Antes de guardar debe marcar el consentimiento. El texto explica
exactamente qué permite:

> Autorizo a este sistema a usar mis credenciales del CGBVP para
> descargar automáticamente la información de la Compañía N.° 163.
> Entiendo que las credenciales quedan guardadas con cifrado y se usan
> exclusivamente para las consultas al intranet institucional.

### Paso 4 · Validar y guardar

Al presionar el botón **Validar y guardar**, el sistema va a:

1. Intentar iniciar sesión en el intranet del CGBVP con sus datos.
2. Si el intranet acepta las credenciales → guardarlas con cifrado y
   mostrarle la pantalla de éxito.
3. Si el intranet las rechaza → informarle por qué y permitirle corregir.

Esto puede tardar entre 5 y 15 segundos porque el sistema realmente
consulta al CGBVP. No cierre la ventana durante la validación.

### Paso 5 · Activar la descarga automática

Después de guardar, active el **toggle de descarga automática**. A
partir de ese momento el sistema empieza a consultar periódicamente:

- **Estado de la compañía** → cada 2 minutos
- **Partes de emergencia** → cada 15 minutos
- **Asistencia mensual** → una vez al mes (días 1 al 5)
- **Padrón de bomberos** → una vez al mes

Los datos se reflejan en las pantallas del sistema conforme van llegando.

---

## Qué hacer si la sincronización falla

El sistema monitorea continuamente el estado de la sincronización. Si
detecta un problema, se lo indica claramente y le sugiere qué hacer.

### "El intranet del CGBVP rechazó las credenciales"

Probablemente su contraseña del CGBVP cambió o expiró. Solución:

1. Vaya a **Configuración → Sincronización con el CGBVP**
2. Presione **Actualizar credenciales**
3. Ingrese el usuario y la contraseña nuevos
4. El sistema los valida y reactiva la descarga

### "No pudimos acceder al intranet del CGBVP"

El intranet puede estar fuera de servicio temporalmente. El sistema
reintenta automáticamente. Si el problema persiste más de un par de
horas:

1. Ingrese al intranet manualmente para confirmar que está disponible
2. Si funciona, regrese a la pantalla y presione **Reintentar**
3. Si no, espere a que el CGBVP restablezca el servicio

### "Ocurrió un problema técnico al validar las credenciales"

Este error indica un fallo del lado del sistema (no del CGBVP).
Contacte al administrador técnico del proyecto.

---

## Ejecución manual de una tarea

Aunque la descarga automática ya corre, en ocasiones puede necesitar
forzar una consulta ahora mismo (por ejemplo, cuando acaba de cerrarse
una emergencia y quiere verla reflejada sin esperar 15 minutos).

En la sección **Ejecutar descarga manualmente** encontrará 4 botones:

| Botón | Cuándo usarlo |
|---|---|
| **Actualizar padrón** | Después de una incorporación o cambio de grado de un bombero |
| **Capturar estado** | Para ver inmediatamente el personal en turno y estado de vehículos |
| **Descargar partes** | Para ver las últimas salidas sin esperar el ciclo automático |
| **Asistencia mensual** | Al cierre del mes, cuando CGBVP ya consolidó la información |

---

## ¿Qué pasa si dejo mi cargo de Primer/Segundo Jefe?

Si usted deja su cargo en la compañía, sus credenciales quedan
registradas como "huérfanas". El sistema no las desactiva
automáticamente para no cortar la descarga, pero:

- En el panel de configuración aparece un **aviso** indicando que las
  credenciales pertenecen a un efectivo que ya no tiene el cargo
- El nuevo Primer o Segundo Jefe debe ingresar sus propias credenciales
  cuanto antes
- Si quiere revocar sus credenciales antes de dejar el cargo, use el
  botón **Eliminar credenciales del CGBVP** en la zona de acciones
  sensibles

---

## Registro de actividad (auditoría)

Todas las acciones sobre la sincronización quedan registradas:

- Quién ingresó o actualizó las credenciales y cuándo
- Cada validación exitosa o fallida
- Activación o desactivación de la descarga automática
- Ejecuciones manuales
- Eliminación de credenciales

Este registro es visible para el Primer Jefe y el Segundo Jefe en la
sección **Registro de actividad** de la pantalla de configuración, y
no se puede alterar.

---

## Preguntas frecuentes

**¿Otros bomberos pueden ver mi contraseña?**
No. La contraseña se guarda con cifrado y ningún usuario del sistema
puede verla, incluyendo al administrador técnico. En pantalla solo se
muestra una versión enmascarada del usuario.

**¿El sistema puede hacer cambios en el CGBVP con mi cuenta?**
No. El sistema solo realiza consultas de lectura (equivalente a ingresar
al intranet y mirar la información). No modifica datos, no registra
partes, no altera asistencia.

**¿Cada cuánto se validan las credenciales automáticamente?**
El sistema comprueba silenciosamente cada 6 horas que sus credenciales
siguen funcionando. Si detecta un problema, le avisa de inmediato.

**¿Qué pasa si cambio la contraseña en el CGBVP?**
Dentro de las 6 horas siguientes el sistema detectará el cambio y
mostrará el estado "Credenciales rechazadas". En ese momento debe
ingresar la nueva contraseña.

**¿Puedo usar las credenciales de otro bombero (por ejemplo el Primer
Jefe anterior)?**
Técnicamente sí, siempre que tengan acceso vigente al intranet del
CGBVP. Pero la recomendación institucional es que cada jefe use sus
propias credenciales, porque el registro de auditoría del CGBVP
reflejará quién está haciendo las consultas.

**¿A mediano plazo esto va a cambiar?**
Sí. A medida que el sistema se extienda a más compañías, se va a
proponer al CGBVP una forma oficial de integración (una API pública
con autenticación propia, sin compartir credenciales personales). Ver
`docs/ROADMAP_CGBVP_INTEGRATION.md` para el plan completo.

---

## Contacto

Para dudas sobre esta pantalla, problemas técnicos o solicitudes de
cambio: contacte al administrador del sistema.
