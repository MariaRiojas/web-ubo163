# Roadmap de integración con CGBVP

**Proyecto:** CUARTEL-ERP
**Versión:** 1.0 — Mayo 2026
**Autora:** María Riojas

---

## Estado actual — Piloto (UBO 163)

**Mecanismo:** Web scraping automatizado del intranet del CGBVP (`bomberosperu.gob.pe/extranet`) con credenciales proporcionadas por el Primer o Segundo Jefe de la compañía.

### Cómo opera hoy

1. Un jefe con permiso `company.manage` ingresa sus credenciales CGBVP en la pantalla `/configuracion/cgbvp`
2. El sistema valida el login antes de guardar nada
3. Las credenciales se almacenan cifradas en **AWS Secrets Manager**, nunca en BD, nunca visibles en UI
4. Los scrapers (ECS Fargate + EventBridge Scheduler) las consumen al arrancar
5. Los datos relevantes se replican a la BD propia del CRM:
   - Padrón de bomberos (mensual)
   - Estado de compañía (cada 2 min)
   - Partes de emergencia (cada 15 min)
   - Asistencia mensual (día 1-5 del mes siguiente)

### Consentimiento y controles

- El jefe acepta explícitamente un consentimiento inline antes de guardar
- Todas las acciones quedan en log de auditoría con timestamp, IP y user agent
- Botón de revocación siempre visible
- Validación de credenciales cada 6h con notificación automática si dejan de funcionar

### Limitación estructural

Este mecanismo funciona, pero **no es el estado final deseado**. Tres razones:

1. **Fragilidad.** Cualquier cambio de HTML en el intranet del CGBVP puede romper el scraper y dejar sin data a todas las compañías integradas.
2. **Cumplimiento.** Los términos de uso del intranet probablemente no contemplan scraping automatizado por terceros. Aunque en la práctica se tolera (muchas apps no oficiales lo hacen), no es el escenario ideal para una herramienta que aspira a uso nacional.
3. **Límites de rate.** A escala de 200+ compañías sincronizando simultáneamente, el intranet del CGBVP va a sufrir carga. Eso lo hace insostenible sin coordinación con la Comandancia General.

---

## Propuesta a mediano plazo — API oficial CGBVP

### Cuándo abordarla

**No ahora.** Abordarla recién cuando:

- ✅ Se hayan desplegado **al menos 10 compañías** usando el CRM de forma regular
- ✅ Existan **métricas de valor demostrables**: horas ahorradas, reportes generados, cumplimiento NDR mejorado, etc.
- ✅ Haya al menos **un caso documentado de impacto operativo positivo** (ej: una emergencia gestionada mejor por tener la data consolidada)
- ✅ El piloto de UBO 163 tenga **6-12 meses de operación estable**

Antes de eso, proponer una API a la Comandancia General es prematuro. El CGBVP no tiene incentivo para invertir en infraestructura técnica para un sistema que todavía no ha demostrado valor institucional.

### Qué proponer cuando llegue el momento

**Propuesta formal a la Comandancia General con 3 componentes:**

#### 1. API REST oficial del CGBVP

Endpoints mínimos que cubrirían el 100% del scraping actual:

```
GET /api/v1/companies/{cia}/personnel              → padrón
GET /api/v1/companies/{cia}/status                 → estado operativo en vivo
GET /api/v1/companies/{cia}/emergencies?from&to    → partes del rango
GET /api/v1/companies/{cia}/attendance/{year}/{month} → asistencia mensual
GET /api/v1/emergencies/sgo-norte                  → emergencias del SGO (ya es pública)

POST /api/v1/companies/{cia}/sync-webhook          → opcional: webhook push cuando cambia el estado
```

#### 2. Autenticación vía OAuth 2.0

En lugar de que el jefe comparta credenciales de su cuenta personal:

```
1. CGBVP emite un client_id + client_secret por aplicación autorizada
   (CUARTEL-ERP sería una app autorizada, registrada por compañía o corporativamente)

2. El jefe de la compañía autoriza la app con un flow OAuth estándar:
   - Click en "Conectar con CGBVP" → redirige a auth.bomberosperu.gob.pe
   - Ingresa sus credenciales EN EL SITIO OFICIAL del CGBVP
   - Autoriza los scopes solicitados (padrón, estado, partes, asistencia)
   - CGBVP redirige de vuelta con un authorization code
   - La app intercambia por access_token + refresh_token

3. Todas las llamadas futuras usan el access_token, nunca las credenciales del jefe

4. Si el jefe retira autorización, se revoca el token desde el panel oficial del CGBVP
```

**Ventajas operativas:**
- Las credenciales personales **nunca** salen del CGBVP
- El jefe puede revocar acceso en cualquier momento desde el panel oficial
- Rate limits formales y predecibles
- Versionado estable (si cambia el intranet HTML, la API sigue igual)
- Auditoría bidireccional: CGBVP sabe qué app consume qué datos, la app sabe qué scopes tiene

#### 3. Webhooks opcionales para eventos en tiempo real

Para emergencias y cambios de estado, pasar de polling cada 2 min a push:

```
CGBVP llama a nuestro endpoint cuando:
- Se despacha una emergencia
- Cambia el estado de un vehículo
- Un bombero ingresa/sale de turno
- Se cierra un parte
```

Esto reduce latencia de 2 min a segundos y baja muchísimo la carga del intranet.

### Beneficios para el CGBVP (cómo venderlo)

Cuando se presente la propuesta, los argumentos que probablemente convenzan a la institución:

1. **Descarga el intranet** — pasar de scraping agresivo a API controlada reduce carga de servidores
2. **Transparencia** — todos los accesos quedan auditables en su propia infraestructura
3. **Seguridad** — elimina el patrón de compartir credenciales personales con terceros
4. **Interoperabilidad** — habilita que crezca un ecosistema de herramientas para bomberos voluntarios (apps móviles, paneles regionales, integración con SEDENA, etc.)
5. **Costo bajo** — implementar una API REST sobre los mismos datos que ya sirven al intranet es un proyecto de semanas, no meses
6. **Posicionamiento institucional** — el CGBVP podría mostrar a nivel gubernamental que está modernizando su infraestructura digital

### Plan de migración (cuando exista la API)

La migración del scraper a la API oficial **no rompe nada del lado de las compañías**:

1. Se implementa un nuevo provider `CgbvpOfficialApiProvider` que reemplaza al scraper
2. Las pantallas de configuración cambian: `/configuracion/cgbvp` muestra botón "Conectar con CGBVP" en lugar de formulario de credenciales
3. El jefe hace el flow OAuth una sola vez
4. El scraper queda deshabilitado, los schedulers siguen corriendo pero ahora consumen la API
5. Las credenciales viejas se eliminan de Secrets Manager
6. Tiempo estimado de migración por compañía: **2 minutos de acción del jefe**

El código del CRM que procesa los datos (scraper → sync → BD) queda intacto, solo cambia la fuente.

---

## Checklist de disparadores para iniciar la propuesta oficial

Cuando en una reunión de proyecto digamos "¿ya es momento?", revisar este checklist. Si marcás 4 de 5, es momento:

- [ ] **10+ compañías** activas usando el sistema
- [ ] **6+ meses** de piloto estable en UBO 163 con 0 incidentes de seguridad
- [ ] Métricas documentadas de valor (horas ahorradas, reportes generados, cumplimiento mejorado)
- [ ] Al menos **1 caso público** de impacto operativo (emergencia mejor gestionada, reporte que destrabó un proceso, etc.)
- [ ] Respaldo de al menos un **Primer Jefe con influencia regional** dispuesto a ser vocero del proyecto ante la Comandancia General

---

## Preparación preventiva

Mientras tanto, hay cosas que podemos hacer desde ya para que la migración futura sea más fácil:

### 1. Abstraer la capa de datos CGBVP

En el código actual, cualquier lugar que consume datos del CGBVP debe pasar por un `CgbvpDataProvider` abstracto, no directamente por el scraper. Así el día de la migración a API oficial, cambiamos 1 archivo.

```typescript
interface CgbvpDataProvider {
  getPersonnel(cia: string): Promise<Bombero[]>
  getCompanyStatus(cia: string): Promise<CompanyStatus>
  getEmergencies(cia: string, from: Date, to: Date): Promise<Emergency[]>
  getAttendance(cia: string, year: number, month: number): Promise<Attendance[]>
}

class CgbvpScraperProvider implements CgbvpDataProvider { ... }   // hoy
class CgbvpOfficialApiProvider implements CgbvpDataProvider { ... } // futuro
```

### 2. Registrar métricas de uso desde el día 1

Cada scraping guarda en una tabla `cgbvp_sync_metrics`:
- Qué endpoint se consultó
- Cuántos registros trajo
- Cuánto tardó
- Si hubo errores

Cuando llegue el momento de la propuesta oficial, tenemos números duros que mostrar:
*"En 8 meses el sistema hizo 2.3 millones de consultas al intranet por cuenta de 14 compañías"*.

### 3. Mantener documentado qué scraping hace cada compañía

Si una compañía desactiva la sincronización, dejar registrado cuándo, por qué, y si retomó. Datos para la propuesta: *"retención del 92% a 6 meses"*.

---

## Resumen de decisión

| Momento | Estrategia | Status |
|---|---|---|
| **Hoy** | Scraper + credenciales por compañía en Secrets Manager | Construyendo |
| **Próximos 3-6 meses** | Validar con UBO 163, luego escalar a 3-5 compañías más | Pendiente |
| **Mes 6-12** | Si hay tracción, escalar a 10-30 compañías | Pendiente |
| **Mes 12+** | Propuesta formal de API oficial a Comandancia General | Pendiente |
| **Post-API oficial** | Migrar todas las compañías a OAuth en cuestión de semanas | Pendiente |

La ventana entre "piloto" y "API oficial" es de unos **12-18 meses**. Durante ese tiempo, el scraping es la estrategia correcta. Después, migramos.

---

*Este documento se revisa cada 3 meses o cuando se cumplan 2+ items del checklist de disparadores.*
