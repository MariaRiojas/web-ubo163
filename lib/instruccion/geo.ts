/**
 * Geocerco de la compañía para validar el registro de asistencia.
 *
 * La asistencia solo es válida si el efectivo está físicamente dentro del radio
 * de la compañía (Av. José Paredes Roncal 755, Ancón). Las coordenadas del centro
 * viven en `company.config.ts` (location.coordinates) — AJÚSTALAS al punto GPS
 * exacto de la estación.
 */
import { companyConfig } from '@/company.config'

/** Radio permitido alrededor de la compañía, en metros. */
export const GEOFENCE_RADIUS_M = 250

export const COMPANY_COORDS = companyConfig.location.coordinates // { lat, lng }

/** Distancia entre dos coordenadas (fórmula de Haversine), en metros. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371_000 // radio terrestre (m)
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

/** Distancia (m) desde un punto a la compañía. */
export function distanceToCompany(lat: number, lng: number): number {
  return haversineM(lat, lng, COMPANY_COORDS.lat, COMPANY_COORDS.lng)
}

/** ¿El punto está dentro del geocerco de la compañía? */
export function isWithinGeofence(lat: number, lng: number, radiusM: number = GEOFENCE_RADIUS_M): boolean {
  return distanceToCompany(lat, lng) <= radiusM
}
