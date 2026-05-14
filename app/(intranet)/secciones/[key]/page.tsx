import { redirect } from 'next/navigation'

/**
 * Ruta legacy de sección. Redirige a `/areas/[key]` con la misma clave.
 */
export default async function SeccionLegacyByKey({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  redirect(`/areas/${key}`)
}
