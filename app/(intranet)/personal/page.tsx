import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { PersonalClient } from "./personal-client"
import { Users } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// Datos de ejemplo — en producción: await getActiveProfiles(search)
const MOCK_PROFILES = [
  { id: '1', fullName: 'Brigadier Torres Mendoza', grade: 'brigadier', status: 'activo', gender: 'masculino', section: 'Jefatura', role: 'primer_jefe', specialties: ['Gestión de Crisis', 'Rescate Urbano'], joinDate: '2000-03-15' },
  { id: '2', fullName: 'Ten. Brigadier Ramírez Silva', grade: 'teniente_brigadier', status: 'activo', gender: 'masculino', section: 'Jefatura', role: 'segundo_jefe', specialties: ['Operaciones', 'Rescate Vertical'], joinDate: '2005-08-10' },
  { id: '3', fullName: 'Capitán Herrera Vargas', grade: 'capitan', status: 'activo', gender: 'masculino', section: 'Máquinas', role: 'jefe_seccion', specialties: ['Vehículos', 'Rescate Vehicular'], joinDate: '2008-04-20' },
  { id: '4', fullName: 'Teniente Córdova Quispe', grade: 'teniente', status: 'activo', gender: 'femenino', section: 'Servicios Generales', role: 'jefe_seccion', specialties: ['Logística', 'Hazmat'], joinDate: '2010-07-15' },
  { id: '5', fullName: 'Teniente Soto Palacios', grade: 'teniente', status: 'activo', gender: 'masculino', section: 'Instrucción', role: 'jefe_seccion', specialties: ['ESBAS', 'Incendios'], joinDate: '2009-02-28' },
  { id: '6', fullName: 'Teniente Flores Medina', grade: 'teniente', status: 'activo', gender: 'femenino', section: 'Prehospitalaria', role: 'jefe_seccion', specialties: ['APH Avanzada', 'Rescate Médico'], joinDate: '2011-05-12' },
  { id: '7', fullName: 'Teniente Vega Castro', grade: 'teniente', status: 'activo', gender: 'masculino', section: 'Administración', role: 'jefe_seccion', specialties: ['Finanzas', 'RR.HH.'], joinDate: '2012-09-01' },
  { id: '8', fullName: 'Subteniente Ruiz Palomino', grade: 'subteniente', status: 'activo', gender: 'femenino', section: 'Imagen', role: 'jefe_seccion', specialties: ['Comunicación', 'Redes Sociales'], joinDate: '2015-03-10' },
  { id: '9', fullName: 'Seccionario Cárdenas López', grade: 'seccionario', status: 'activo', gender: 'masculino', section: 'Máquinas', role: 'miembro', specialties: ['Combate de Incendios'], joinDate: '2022-01-15' },
  { id: '10', fullName: 'Seccionaria Díaz Tello', grade: 'seccionario', status: 'activo', gender: 'femenino', section: 'Prehospitalaria', role: 'miembro', specialties: ['Primeros Auxilios'], joinDate: '2022-01-15' },
  { id: '11', fullName: 'Seccionario Mendoza Quiroz', grade: 'seccionario', status: 'activo', gender: 'masculino', section: 'Máquinas', role: 'miembro', specialties: ['Rescate Vehicular'], joinDate: '2022-06-01' },
  { id: '12', fullName: 'Seccionaria Quispe Huanca', grade: 'seccionario', status: 'activo', gender: 'femenino', section: 'Instrucción', role: 'miembro', specialties: [], joinDate: '2023-01-10' },
  { id: '13', fullName: 'Aspirante González Pérez', grade: 'aspirante', status: 'aspirante_en_curso', gender: 'masculino', section: '—', role: 'miembro', specialties: [], joinDate: '2024-01-20' },
  { id: '14', fullName: 'Aspirante Mamani Torres', grade: 'aspirante', status: 'aspirante_en_curso', gender: 'femenino', section: '—', role: 'miembro', specialties: [], joinDate: '2024-01-20' },
]

export default async function PersonalPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canEdit = permissions.includes('personnel.edit')

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Personal"
        description="Directorio de efectivos activos de la compañía"
      />
      <PersonalClient profiles={MOCK_PROFILES} canEdit={canEdit} />
    </div>
  )
}
