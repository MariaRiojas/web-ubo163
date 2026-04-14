import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Download, FileText, TrendingUp, Users, Clock } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// TODO Phase 3: full reports module with charts, data export and NDR Ascensos report
export default async function ReportesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canGenerateReports = permissions.includes('reports.generate')

  const REPORT_TYPES = [
    { title: 'Horas de servicio trimestral', description: 'Cumplimiento NDR Ascensos por efectivo', icon: Clock, ready: false },
    { title: 'Asistencia a guardias', description: 'Estadísticas de guardias nocturnas', icon: Users, ready: false },
    { title: 'Incidencias por período', description: 'Resumen y estado de incidencias', icon: FileText, ready: false },
    { title: 'Inventario general', description: 'Estado del equipamiento por sección', icon: BarChart3, ready: false },
    { title: 'Progreso ESBAS', description: 'Avance de formación del personal', icon: TrendingUp, ready: false },
  ]

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Generación y exportación de informes institucionales"
      />

      {!canGenerateReports ? (
        <Card className="glass border-primary/10">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No tenés permisos para generar reportes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generación de reportes disponible en Fase 3. Los siguientes informes estarán disponibles:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {REPORT_TYPES.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="glass border-primary/10 opacity-60">
                <CardContent className="pt-4 flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
