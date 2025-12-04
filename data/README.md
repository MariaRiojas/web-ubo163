# Base de Datos del Equipo - Bomberos Ancón 163

Este directorio contiene los datos centralizados del equipo de bomberos.

## Archivo: `team-data.ts`

Contiene la información completa de todos los efectivos de la compañía (actualmente 50 miembros).

### Estructura de Datos

```typescript
interface TeamMember {
  id: string                           // ID único del efectivo
  nombre: string                       // Nombre completo
  cargo: string                        // Cargo o posición
  area: string                         // Área de trabajo
  imagen: string                       // Ruta de la imagen
  email: string                        // Email corporativo
  telefono: string                     // Teléfono de contacto
  especialidades: string[]             // Array de especialidades
  años: number                         // Años de servicio
  genero: "masculino" | "femenino"     // Género (para guardia nocturna)
  activo: boolean                      // Estado del efectivo
}
```

### Distribución Actual por Áreas

- **Comandancia y Jefatura**: 8 personas
- **Operaciones**: 12 personas
- **Sanidad**: 10 personas
- **Servicios**: 8 personas
- **Administración**: 6 personas
- **Imagen Institucional**: 6 personas

**Total: 50 efectivos activos**

## Funciones Disponibles

### `getActiveMembers()`
Retorna todos los miembros activos.

```typescript
const efectivos = getActiveMembers()
```

### `getMembersByArea(area: string)`
Filtra miembros por área específica.

```typescript
const operaciones = getMembersByArea("Operaciones")
```

### `getMemberById(id: string)`
Busca un miembro por su ID único.

```typescript
const miembro = getMemberById("001")
```

### `getMembersByGender(genero: "masculino" | "femenino")`
Filtra miembros por género (útil para guardias nocturnas).

```typescript
const efectivosMasculinos = getMembersByGender("masculino")
```

### `getJefaturaPrincipal()`
Retorna solo los jefes principales de la compañía.

```typescript
const jefes = getJefaturaPrincipal()
```

### `getTotalMembers()`
Retorna el número total de efectivos activos.

```typescript
const total = getTotalMembers()
```

### `getTotalMembersByArea(area: string)`
Retorna el total de efectivos en un área específica.

```typescript
const totalOps = getTotalMembersByArea("Operaciones")
```

## Cómo Agregar un Nuevo Efectivo

1. Abrir `team-data.ts`
2. Agregar el nuevo objeto al array `teamMembers`:

```typescript
{
  id: "051",  // Siguiente ID disponible
  nombre: "Bombero Apellido Nombre",
  cargo: "Bombero Operativo",
  area: "Operaciones",
  imagen: "/placeholder.svg?height=400&width=400",
  email: "apellido@bomberos163.pe",
  telefono: "+51 999 000 051",
  especialidades: ["Especialidad 1", "Especialidad 2"],
  años: 1,
  genero: "masculino",
  activo: true,
}
```

3. El cambio se reflejará automáticamente en todas las páginas que usen estos datos.

## Cómo Desactivar un Efectivo

Cambiar el campo `activo` a `false`:

```typescript
{
  id: "025",
  nombre: "...",
  // ...otros campos
  activo: false,  // Ya no aparecerá en las listas activas
}
```

## Áreas Válidas

- `"Comandancia"`
- `"Jefatura Principal"`
- `"Operaciones"`
- `"Sanidad"`
- `"Servicios"`
- `"Administración"`
- `"Imagen Institucional"`

## Páginas que Usan Esta Data

- **`/equipo`**: Muestra todos los efectivos activos con estadísticas
- **`/nosotros`**: Muestra solo la jefatura principal (3 personas)
- **`/intranet/dashboard`**: Próximamente - filtrado por área
- **`/intranet/guardias`**: Próximamente - filtrado por género

## Mantenimiento

### Actualizar Email
Todos los emails siguen el formato: `apellido@bomberos163.pe`

### Actualizar Teléfonos
Los teléfonos siguen el formato: `+51 999 000 XXX`

### Actualizar Imágenes
Por defecto se usa placeholder. Para imágenes reales:
1. Subir imagen a `/public/team/`
2. Actualizar el campo `imagen`: `"/team/nombre-apellido.jpg"`

## Tips de Performance

- Los datos se importan estáticamente (no hay llamadas API)
- Las funciones de filtrado son optimizadas
- Se cachean automáticamente por Next.js
- Sin impacto en el bundle del cliente

## Ejemplo de Uso Completo

```typescript
import {
  getActiveMembers,
  getMembersByArea,
  getTotalMembers
} from "@/data/team-data"

export default function MiComponente() {
  const todosLosEfectivos = getActiveMembers()
  const equipoSanidad = getMembersByArea("Sanidad")
  const total = getTotalMembers()

  return (
    <div>
      <h1>Total de Efectivos: {total}</h1>
      {todosLosEfectivos.map(efectivo => (
        <Card key={efectivo.id}>
          <h2>{efectivo.nombre}</h2>
          <p>{efectivo.cargo} - {efectivo.area}</p>
        </Card>
      ))}
    </div>
  )
}
```

## Notas Importantes

- ⚠️ No eliminar efectivos del array, solo desactivarlos (`activo: false`)
- ⚠️ Mantener IDs únicos y secuenciales
- ⚠️ No modificar la estructura de la interfaz sin actualizar todas las referencias
- ✅ Los cambios aquí se reflejan automáticamente en toda la aplicación
