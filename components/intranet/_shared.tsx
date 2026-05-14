import {
  Home, User, Moon, Megaphone, Building2,
  ClipboardCheck, AlertCircle, FileText, QrCode,
  BookOpen, Library, GraduationCap,
  Truck, Wrench, HeartPulse, Camera, Briefcase,
  Radio, BarChart3, TrendingUp, Award, ListChecks, Users,
  Settings, Shield, UserCog, Bed, Calendar,
  Package, Inbox, Send,
} from 'lucide-react'
import type { MenuIcon } from '@/lib/navigation/menu-builder'
import type { ComponentType, SVGProps } from 'react'

/**
 * Mapeo de los íconos nombrados del builder a componentes Lucide.
 * Centralizado acá para que sidebar y mobile-nav los compartan.
 */
export const MENU_ICON_MAP: Record<MenuIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  home: Home,
  user: User,
  moon: Moon,
  megaphone: Megaphone,
  building: Building2,
  'clipboard-check': ClipboardCheck,
  'alert-circle': AlertCircle,
  'file-text': FileText,
  'qr-code': QrCode,
  'book-open': BookOpen,
  library: Library,
  'graduation-cap': GraduationCap,
  truck: Truck,
  wrench: Wrench,
  'heart-pulse': HeartPulse,
  camera: Camera,
  briefcase: Briefcase,
  radio: Radio,
  'chart-bar': BarChart3,
  'chart-line': TrendingUp,
  award: Award,
  'list-checks': ListChecks,
  users: Users,
  settings: Settings,
  shield: Shield,
  'user-cog': UserCog,
  bed: Bed,
  calendar: Calendar,
  package: Package,
  inbox: Inbox,
  send: Send,
}

/**
 * Mapeo de claves de sección (RIF) a sus sellos alfabéticos de 2 letras.
 * Se usan en los headers de sección tipo "Área de Máquinas".
 */
export const SECTION_SEALS: Record<string, string> = {
  maquinas: 'MQ',
  servicios_generales: 'SG',
  instruccion: 'IN',
  prehospitalaria: 'SN',
  administracion: 'AD',
  imagen: 'IM',
  jefatura: 'JF',
}

/**
 * Etiquetas humanas de los grados CGBVP según NDR Uniformes.
 */
export const GRADE_LABELS: Record<string, string> = {
  postulante: 'Postulante',
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Teniente Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brigadier Mayor',
  brigadier_general: 'Brigadier General',
}

/**
 * Saludo según hora local de Lima (UTC-5), usado en la pantalla de inicio.
 *   05:00–11:59 → Buenos días
 *   12:00–18:59 → Buenas tardes
 *   19:00–04:59 → Buenas noches
 */
export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/**
 * Formatea el nombre institucional para mostrar en UI.
 * Toma "RIOJAS MENDOZA, María Elena" → "RIOJAS MENDOZA, María".
 */
export function formatShortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim()
  const firstFirstName = parts[1].trim().split(/\s+/)[0]
  return `${apellidos}, ${firstFirstName}`
}

/**
 * Iniciales para avatar. "RIOJAS MENDOZA, María Elena" → "MR".
 * (Primera letra del primer nombre + primera letra del primer apellido)
 */
export function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) {
    return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  }
  const firstApellido = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
  const firstNombre = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
  return `${firstNombre}${firstApellido}`.toUpperCase()
}
