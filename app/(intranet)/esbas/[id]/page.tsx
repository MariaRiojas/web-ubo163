import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap } from "lucide-react"

// TODO Phase 3: full lesson detail with theory, practice and evaluation tabs
export default async function EsbasLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  if (!id) notFound()

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title={`Lección ${id}`}
        description="Detalle de la lección ESBAS"
      />
      <Card className="glass border-primary/10">
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Contenido de la lección en desarrollo — Fase 3.</p>
        </CardContent>
      </Card>
    </div>
  )
}
