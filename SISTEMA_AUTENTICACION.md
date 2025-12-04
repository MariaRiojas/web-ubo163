# Sistema de Autenticación y Control de Acceso - Intranet Bomberos 163

## Descripción General

El sistema de autenticación está diseñado para gestionar el acceso de diferentes roles de usuarios a los módulos y áreas específicas de la intranet, garantizando que cada usuario solo pueda ver y acceder a las funcionalidades que le corresponden según su rol.

## Roles y Permisos

### 1. Comandante
**Acceso total a todas las áreas y módulos**

Módulos accesibles:
- ✅ Dashboard
- ✅ Guardia Nocturna (ver y gestionar)
- ✅ Incidencias (ver, crear y gestionar)
- ✅ ESBAS (aprendizaje)
- ✅ Equipo
- ✅ Áreas (todas: comandancia, administración, servicios, operaciones, sanidad, imagen, jefatura)
- ✅ Reportes
- ✅ Perfil
- ✅ Configuración

### 2. Jefe de Área
**Acceso a dashboard y gestión de su área específica**

Módulos accesibles:
- ✅ Dashboard
- ✅ Guardia Nocturna (ver)
- ✅ Incidencias (ver, crear y gestionar las de su área)
- ✅ ESBAS (aprendizaje)
- ✅ Equipo (ver personal de su área)
- ✅ Áreas (solo su área asignada)
- ✅ Reportes (de su área)
- ✅ Perfil
- ❌ Configuración

### 3. Jefe de Guardia
**Gestión de guardias - Sin acceso a áreas de gestión**

Módulos accesibles:
- ✅ Dashboard
- ✅ Guardia Nocturna (ver, reservar y gestionar)
- ✅ Incidencias (ver y crear)
- ✅ ESBAS (aprendizaje)
- ❌ Equipo
- ❌ Áreas (ninguna - no tiene acceso a gestión de áreas)
- ❌ Reportes
- ✅ Perfil
- ❌ Configuración

### 4. Efectivo
**Acceso básico a funcionalidades esenciales**

Módulos accesibles:
- ✅ Dashboard (personal)
- ✅ Guardia Nocturna (ver y reservar)
- ✅ Incidencias (ver y crear)
- ✅ ESBAS (aprendizaje)
- ❌ Equipo
- ❌ Áreas
- ❌ Reportes
- ✅ Perfil
- ❌ Configuración

## Estructura de Archivos

### `lib/auth.ts`
Contiene toda la lógica de autenticación y permisos:

```typescript
// Tipos principales
export type UserRole = 'comandante' | 'jefe_area' | 'jefe_guardia' | 'efectivo'
export type Module = 'dashboard' | 'guardias' | 'incidencias' | 'esbas' | 'equipo' | 'areas' | 'reportes' | 'perfil' | 'configuracion'

// Funciones principales
authenticateUser(username, password) // Autentica al usuario
hasAccessToModule(user, module)      // Verifica acceso a módulo
hasAccessToArea(user, area)          // Verifica acceso a área
getUserPermissions(user)             // Obtiene todos los permisos
getAccessibleModules(user)           // Obtiene módulos accesibles
```

### `components/protect-route.tsx`
Componente HOC para proteger rutas:

```typescript
<ProtectRoute
  allowedRoles={['comandante', 'jefe_area']}
  requiredModule="equipo"
  requireArea="administracion"
>
  {/* Contenido protegido */}
</ProtectRoute>
```

### `components/intranet-nav.tsx`
Navegación dinámica basada en permisos que muestra solo los módulos accesibles.

## Uso del Sistema

### 1. Proteger una Ruta

```typescript
import { ProtectRoute } from "@/components/protect-route"

export default function EquipoPage() {
  return (
    <ProtectRoute requiredModule="equipo">
      <div>
        {/* Contenido solo visible para comandante y jefes de área */}
      </div>
    </ProtectRoute>
  )
}
```

### 2. Proteger una Área Específica

```typescript
<ProtectRoute
  requiredModule="areas"
  requireArea="administracion"
>
  {/* Solo accesible por comandante o jefe de administración */}
</ProtectRoute>
```

### 3. Verificar Permisos en Componentes

```typescript
import { getUserPermissions } from "@/lib/auth"

function MyComponent() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) setUser(JSON.parse(currentUser))
  }, [])

  if (!user) return null

  const permissions = getUserPermissions(user)

  return (
    <div>
      {permissions.canManageGuards && (
        <button>Gestionar Guardias</button>
      )}
      {permissions.canViewReports && (
        <button>Ver Reportes</button>
      )}
    </div>
  )
}
```

### 4. Filtrar Datos por Área

```typescript
import { hasAccessToArea } from "@/lib/auth"

function filterDataByUserArea(user: User, data: any[]) {
  if (user.role === 'comandante') {
    // Comandante ve todo
    return data
  }

  if (user.role === 'jefe_area') {
    // Jefe de área ve solo su área
    return data.filter(item => item.area === user.area)
  }

  // Otros roles no ven áreas
  return []
}
```

## Configuración de Módulos

Para agregar un nuevo módulo o cambiar permisos, edita `MODULE_ACCESS` en [lib/auth.ts](lib/auth.ts:163):

```typescript
const MODULE_ACCESS: Record<Module, UserRole[]> = {
  // Ejemplo: agregar nuevo módulo
  nuevo_modulo: ['comandante', 'jefe_area'], // Solo estos roles
}
```

## Ejemplos de Credenciales

```
# COMANDANTE
Usuario: comandante
Contraseña: Bomberos2024!

# JEFE DE ÁREA (Administración)
Usuario: jefe.admin
Contraseña: Admin2024!

# JEFE DE GUARDIA
Usuario: jefe.guardia
Contraseña: Guardia2024!

# EFECTIVO
Usuario: efectivo.m1
Contraseña: Efectivo2024!
```

## Flujo de Autenticación

1. Usuario ingresa credenciales en `/intranet`
2. Sistema valida con `authenticateUser()`
3. Si es válido, guarda datos en `localStorage` como `currentUser`
4. Redirecciona a `/intranet/dashboard`
5. Cada ruta protegida verifica permisos con `ProtectRoute`
6. La navegación muestra solo módulos accesibles
7. Al hacer logout, limpia `localStorage` y redirecciona a login

## Seguridad

### Validaciones Implementadas
- ✅ Verificación de roles en cada ruta
- ✅ Verificación de acceso a módulos
- ✅ Verificación de acceso a áreas específicas
- ✅ Navegación dinámica según permisos
- ✅ Redirección automática si no hay sesión
- ✅ Mensaje de "Acceso Denegado" si intenta acceder sin permisos

### Mejoras Recomendadas para Producción
- 🔐 Implementar JWT o sesiones del lado del servidor
- 🔐 Migrar de localStorage a cookies httpOnly
- 🔐 Implementar refresh tokens
- 🔐 Agregar rate limiting en login
- 🔐 Implementar 2FA para roles críticos
- 🔐 Encriptar contraseñas con bcrypt
- 🔐 Usar base de datos en lugar de array hardcodeado
- 🔐 Implementar auditoría de accesos
- 🔐 Agregar timeout de sesión

## Mantenimiento

### Agregar Nuevo Usuario
Edita el array `USERS` en [lib/auth.ts](lib/auth.ts:19)

### Cambiar Permisos de Rol
Edita `MODULE_ACCESS` en [lib/auth.ts](lib/auth.ts:163)

### Agregar Nuevo Módulo
1. Agrega el módulo a tipo `Module` en [lib/auth.ts](lib/auth.ts:158)
2. Agrega entrada en `MODULE_ACCESS`
3. Agrega permiso en `getUserPermissions()`
4. Agrega entrada en navegación en [components/intranet-nav.tsx](components/intranet-nav.tsx:53)
5. Crea la página con `ProtectRoute`

## Troubleshooting

### El usuario no puede ver un módulo
1. Verifica que el rol esté en `MODULE_ACCESS` para ese módulo
2. Verifica que el permiso esté en `getUserPermissions()`
3. Verifica que el item de navegación use el permiso correcto

### Error "Acceso Denegado"
1. Verifica que el usuario tenga el rol correcto
2. Verifica que `ProtectRoute` use los parámetros correctos
3. Revisa la consola del navegador para errores

### Usuario no puede acceder a un área
1. Verifica que el usuario tenga `role: 'jefe_area'` o `'comandante'`
2. Verifica que el área coincida exactamente (case-sensitive)
3. Usa `hasAccessToArea()` para debugging
