import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { profiles, cgbvpAttendance, emergencies, cgbvpShiftAttendance, cgbvpCompanyStatus } from "@/lib/db/schema"
import { eq, and, desc, sql, count } from "drizzle-orm"
import { GRADE_LABEL, type Grade } from "@/lib/cgbvp/grades"
import { MIN_HOURS_PER_QUARTER } from "@/lib/cgbvp/requirements"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Calendar, AlertTriangle, GraduationCap, Mail, Phone, UserCircle, Pencil } from "lucide-react"
import Link from "next/link"

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const profileId = session.user.profileId

  // Profile
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  })
  if (!profile) redirect("/login")

  const grade = profile.grade as Grade
  const gradeLabel = GRADE_LABEL[grade] ?? grade

  // Check if currently on shift (latest company status)
  const latestStatus = await db
    .select({ id: cgbvpCompanyStatus.id })
    .from(cgbvpCompanyStatus)
    .orderBy(desc(cgbvpCompanyStatus.createdAt))
    .limit(1)

  let enTurno = false
  if (latestStatus[0]) {
    const onShift = await db
      .select({ id: cgbvpShiftAttendance.id })
      .from(cgbvpShiftAttendance)
      .where(and(
        eq(cgbvpShiftAttendance.statusId, latestStatus[0].id),
        eq(cgbvpShiftAttendance.profileId, profileId),
      ))
      .limit(1)
    enTurno = onShift.length > 0
  }

  // Attendance records
  const attendance = await db
    .select()
    .from(cgbvpAttendance)
    .where(eq(cgbvpAttendance.profileId, profileId))
    .orderBy(desc(cgbvpAttendance.anio), desc(cgbvpAttendance.mes))

  // Last month attendance for KPIs
  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth() // 1-indexed
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const lastMonthData = attendance.find(a => a.mes === lastMonth && a.anio === lastMonthYear)

  const horasUltMes = lastMonthData?.horasAcumuladas ?? 0
  const diasUltMes = lastMonthData?.diasAsistidos ?? 0

  // Monthly meta
  const metaMensual = Math.round(MIN_HOURS_PER_QUARTER[grade] / 3)
  const cumplPct = metaMensual > 0 ? Math.min(100, Math.round((horasUltMes / metaMensual) * 100)) : 0

  // Emergencies count (al mando)
  const [emergencyCount] = await db
    .select({ count: count() })
    .from(emergencies)
    .where(eq(emergencies.alMandoId, profileId))

  const numEmergencias = Number(emergencyCount?.count ?? 0)

  // Initials
  const initials = (profile.fullName ?? "U")
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Current month for compliance card
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentMonthData = attendance.find(a => a.mes === currentMonth && a.anio === currentYear)
  const horasAcum = currentMonthData?.horasAcumuladas ?? 0
  const horasRestantes = Math.max(0, metaMensual - horasAcum)
  const cumplCurrentPct = metaMensual > 0 ? Math.min(100, Math.round((horasAcum / metaMensual) * 100)) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {gradeLabel}
              </p>
              <p className="text-xl font-bold truncate">{profile.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {profile.codigoCgbvp && `Código: ${profile.codigoCgbvp}`}
                {profile.codigoCgbvp && profile.dni && " · "}
                {profile.dni && `DNI: ${profile.dni}`}
              </p>
              {enTurno && (
                <Badge className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">
                  En turno
                </Badge>
              )}
            </div>
            <Link
              href="/perfil/editar"
              className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar datos
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Contact info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Información de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{profile.email ?? "Sin correo registrado"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{profile.phone ?? "Sin teléfono registrado"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCircle className="h-4 w-4 shrink-0" />
            <span>
              {profile.emergencyContactName
                ? `${profile.emergencyContactName}${profile.emergencyContactPhone ? ` — ${profile.emergencyContactPhone}` : ""}`
                : "Sin contacto de emergencia"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <Clock className="h-5 w-5 mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{horasUltMes}h</p>
            <p className="text-xs text-muted-foreground">HORAS ÚLT. MES</p>
            <p className="text-xs text-muted-foreground">Meta: {metaMensual}h · {cumplPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Calendar className="h-5 w-5 mb-1 text-indigo-600" />
            <p className="text-2xl font-bold">{diasUltMes}</p>
            <p className="text-xs text-muted-foreground">DÍAS ÚLT. MES</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <AlertTriangle className="h-5 w-5 mb-1 text-red-600" />
            <p className="text-2xl font-bold">{numEmergencias}</p>
            <p className="text-xs text-muted-foreground">EMERGENCIAS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <GraduationCap className="h-5 w-5 mb-1 text-amber-600" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">CURSOS</p>
            <p className="text-xs text-muted-foreground">0 completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumplimiento reglamentario */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cumplimiento reglamentario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </p>
            <p className="text-sm text-muted-foreground">
              Meta: {metaMensual}h para {gradeLabel}
            </p>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{horasAcum}h acumuladas</p>
            <p className="text-3xl font-bold text-primary">{cumplCurrentPct}%</p>
          </div>
          <Progress
            value={cumplCurrentPct}
            className="h-3 mb-1"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{horasAcum}h acumuladas</span>
            <span>{horasRestantes}h restantes</span>
          </div>
        </CardContent>
      </Card>

      {/* Historial de asistencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Historial de asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros de asistencia.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 pr-4">Mes</th>
                    <th className="text-right py-2 px-2">Días asist.</th>
                    <th className="text-right py-2 px-2">Guardias</th>
                    <th className="text-right py-2 px-2">Horas</th>
                    <th className="text-right py-2 px-2">Cumpl.</th>
                    <th className="text-right py-2 pl-2">Emergencias</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => {
                    const horas = a.horasAcumuladas ?? 0
                    const pct = metaMensual > 0 ? Math.min(100, Math.round((horas / metaMensual) * 100)) : 0
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          {MONTH_NAMES[a.mes]} {a.anio}
                        </td>
                        <td className="text-right py-2 px-2">{a.diasAsistidos ?? 0}</td>
                        <td className="text-right py-2 px-2">{a.diasGuardia ?? 0}</td>
                        <td className="text-right py-2 px-2 font-bold">{horas}h</td>
                        <td className="text-right py-2 px-2">
                          <span className="text-green-600 font-medium">{pct}%</span>
                        </td>
                        <td className="text-right py-2 pl-2">{a.numEmergencias ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        Solo tú puedes ver y editar esta información. Los datos de asistencia se sincronizan automáticamente desde el CGBVP.
      </p>
    </div>
  )
}
