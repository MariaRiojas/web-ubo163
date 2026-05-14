/**
 * [DEPRECADO] — data/seed.ts
 *
 * Este seed usaba el schema v1 con columnas que ya no existen. Fue reemplazado
 * por `data/seed-v2.ts` que trabaja con el schema v2 completo (dormitorios +
 * camarotes + camas, máquinas + compartimientos + QR, cursos LMS, etc.).
 *
 * Para seed inicial, ejecute:
 *   npm run db:seed:v2
 *
 * Si necesita seed operativo (partes de emergencia), use:
 *   npm run db:seed:operativo
 */

throw new Error(
  'data/seed.ts está deprecado. Use `npm run db:seed:v2` o `npm run db:seed:operativo`.',
)
