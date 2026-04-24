# Integración Scrapper CGBVP ↔ web-ubo163

## Arquitectura

```
bomberosperu.gob.pe (extranet)
        │
        ▼
┌─────────────────────┐
│  scrapper_bomberos   │  (Python + Selenium)
│  - bomberos          │  cada 2-15 min
│  - estado CIA        │
│  - partes CIA        │
│  - asistencia        │
│  - emergencias SGO   │
└────────┬────────────┘
         │ POST /api/sync
         ▼
┌─────────────────────┐
│  web-ubo163          │  (Next.js + Drizzle)
│  - profiles          │  ← codigoCgbvp vincula
│  - cgbvp_attendance  │
│  - cgbvp_status_hist │
│  - emergencies       │
│  - emergency_vehicles│
│  - emergency_crew    │
└─────────────────────┘
```

## Tablas nuevas en web-ubo163

| Tabla | Origen | Descripción |
|---|---|---|
| `profiles.codigo_cgbvp` | `bombero.codigo` | Vincula perfil con padrón CGBVP |
| `cgbvp_attendance` | `asistencia_mensual` | Días, guardias, horas, emergencias por mes |
| `cgbvp_status_history` | `bombero_historial_estado` | Cambios de estado (activo→reserva, etc.) |
| `cgbvp_company_status` | `estado_cia` | Estado operativo de la compañía |
| `emergencies` | `emergencia` + `partes_cia` | Emergencias con número de parte |
| `emergency_vehicles` | `emergencia_vehiculo_externo` | Vehículos despachados |
| `emergency_crew_members` | dotación de `partes_cia` | Bomberos que asistieron |
| `emergency_types` | `tipo_emergencia` | Catálogo de tipos |
| `hired_drivers` | `piloto_rentado` | Pilotos contratados |

## API de sincronización

`POST /api/sync` con header `x-sync-token: <secret>`

### Acciones:

```json
// Crear/actualizar bombero
{ "action": "upsert_bombero", "data": { "codigo": "31501980006001", "grado": "TENIENTE", "apellidos": "GARCIA PEREZ", "nombres": "JUAN CARLOS", "dni": "12345678" } }

// Actualizar estado
{ "action": "update_status", "data": { "codigo": "31501980006001", "estado_anterior": "ACTIVO", "estado_nuevo": "RESERVA" } }

// Asistencia mensual
{ "action": "upsert_attendance", "data": { "codigo": "31501980006001", "mes": 3, "anio": 2026, "dias_asistidos": 15, "dias_guardia": 8, "horas_acumuladas": 120, "num_emergencias": 5 } }

// Emergencia
{ "action": "upsert_emergency", "data": { "numero_parte": "2026-001234", "tipo": "INCENDIO", "estado": "CONTROLADA", "fecha_despacho": "2026-04-22T03:15:00", "vehiculos": [{ "codigo": "0570", "nombre": "RES-150" }] } }
```

## Modificar el scrapper para usar la API

En cada scraper, después del `INSERT INTO` a PostgreSQL directo, agregar:

```python
import requests
SYNC_URL = os.getenv("WEB_SYNC_URL", "http://localhost:3000/api/sync")
SYNC_TOKEN = os.getenv("WEB_SYNC_TOKEN", "change-me")

def sync_to_web(action, data):
    try:
        requests.post(SYNC_URL, json={"action": action, "data": data},
                      headers={"x-sync-token": SYNC_TOKEN}, timeout=10)
    except Exception:
        pass  # No bloquear el scrapper si la web está caída
```
