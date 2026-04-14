/**
 * CUARTEL-CRM — Configuración de Compañía
 *
 * Este es el ÚNICO archivo que cada compañía necesita editar
 * para personalizar toda la aplicación.
 *
 * Después de editar:
 * 1. Coloca tu logo en /public/logo.png
 * 2. Coloca tus imágenes hero en /public/hero/
 * 3. Reinicia el servidor de desarrollo
 */

export const companyConfig = {
  // ================================================================
  // IDENTIDAD
  // ================================================================
  id: "163",
  name: "Compañía de Bomberos Voluntarios Ancón",
  shortName: "Bomberos Ancón 163",
  motto: "Excelencia en Servicio",
  foundedYear: 1952,
  /** "compania" = UBO con número propio | "estacion" = dependiente de otra */
  type: "compania" as const,
  /**
   * Determina la jerarquía de grados según Art. 113 RIF CGBVP:
   * - "centenaria": ≥ 100 años → Brigadier General, Brigadier Mayor…
   * - "mas_50": 50–99 años
   * - "menos_50": < 50 años → grados más básicos disponibles
   */
  ageCategory: "menos_50" as const,

  // ================================================================
  // UBICACIÓN
  // ================================================================
  location: {
    department: "Lima",
    province: "Lima",
    district: "Ancón",
    address: "Av. Principal S/N, Ancón",
    coordinates: { lat: -11.7746, lng: -77.1185 },
    timezone: "America/Lima",
  },

  // ================================================================
  // CONTACTO
  // ================================================================
  contact: {
    phone: "116",
    emergency: "911",
    email: "contacto@bomberos163.pe",
    website: "https://bomberos163.pe",
  },

  // ================================================================
  // REDES SOCIALES
  // ================================================================
  social: {
    facebook: "https://facebook.com/bomberos163",
    instagram: "https://instagram.com/bomberos163",
    tiktok: null as string | null,
    youtube: null as string | null,
    twitter: null as string | null,
  },

  // ================================================================
  // COMANDANCIA DEPARTAMENTAL
  // ================================================================
  departmental: {
    name: "Comandancia Departamental Lima Norte",
    code: "CD-LIMA-NORTE",
  },

  // ================================================================
  // TEMA VISUAL
  // Editar los valores HSL para cambiar la paleta de colores.
  // Herramienta: https://hslpicker.com/
  // ================================================================
  theme: {
    /** Color primario en HSL (h: tono, s: saturación %, l: luminosidad %) */
    primary: { h: 0, s: 84, l: 60 },
    /** Color secundario */
    secondary: { h: 187, s: 92, l: 50 },
    /** Color de acento (botones de acción, badges) */
    accent: { h: 24, s: 95, l: 53 },

    /** Clases Tailwind para gradientes de fondo (login, hero) */
    gradientFrom: "from-red-600",
    gradientTo: "to-red-900",

    /** Ruta del logo en /public/ */
    logoPath: "/logo.png",
    /** Mostrar ícono Shield si no hay logo propio */
    showDefaultShieldIcon: true,

    /** Imágenes del carrusel hero en /public/hero/ (relativas a /public) */
    heroImages: [
      "/placeholder.svg?height=800&width=1600",
      "/placeholder.svg?height=800&width=1600",
      "/placeholder.svg?height=800&width=1600",
    ],
    showCarousel: true,
  },

  // ================================================================
  // FEATURE FLAGS
  // Deshabilitar módulos que la compañía no use (false = ruta inactiva)
  // ================================================================
  features: {
    landing: true,
    intranet: true,
    guardianocturna: true,
    esbas: true,
    incidencias: true,
    inventario: true,
    contenido: true,
    cronograma: true,
  },

  // ================================================================
  // LANDING — SECCIONES VISIBLES
  // ================================================================
  landing: {
    showAdmision: true,
    showEquipo: true,
    showServicios: true,
    showNoticias: true,
    showContacto: true,
    showFAQ: true,
  },

  // ================================================================
  // GUARDIA NOCTURNA
  // ================================================================
  guardia: {
    totalCamas: 12,
    horarioInicio: "20:00",
    horarioFin: "08:00",
    /** Días máximos que un efectivo puede reservar por adelantado */
    maxDiasReserva: 7,
    /** false = requiere aprobación manual de jefatura */
    aprobacionAutomatica: false,
    sectores: ["Sector A", "Sector B", "Sector C"],
  },
} as const

// ================================================================
// TIPOS DERIVADOS (no editar)
// ================================================================
export type CompanyConfig = typeof companyConfig
export type AgeCategory = CompanyConfig["ageCategory"]
export type CompanyType = CompanyConfig["type"]

/**
 * Genera las CSS variables del tema desde la configuración.
 * Se llama en el layout raíz para inyectar el tema dinámicamente.
 */
export function generateThemeCSS(config: CompanyConfig): string {
  const { primary, secondary, accent } = config.theme
  return `
    --primary: ${primary.h} ${primary.s}% ${primary.l}%;
    --secondary: ${secondary.h} ${secondary.s}% ${secondary.l}%;
    --accent: ${accent.h} ${accent.s}% ${accent.l}%;
    --ring: ${primary.h} ${primary.s}% ${primary.l}%;
  `.trim()
}
