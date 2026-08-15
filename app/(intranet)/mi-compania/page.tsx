import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ddb, TABLE, ScanCommand } from "@/lib/db/dynamodb"
import { Flame, Users, Truck } from "lucide-react"
import { SyncButton } from "@/components/cgbvp/sync-button"

export const dynamic = 'force-dynamic'

export default async function MiCompaniaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Get latest status record (Scan + sort by timestamp desc)
  const { Items = [] } = await ddb.send(new ScanCommand({
    TableName: TABLE.cgbvpStatus,
  }))

  const sorted = Items.sort((a: any, b: any) =>
    (b.timestamp ?? '').localeCompare(a.timestamp ?? '')
  )
  const status = sorted[0] as any | undefined

  if (!status) {
    return (
      <div style={{ maxWidth: 800, padding: 40 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--bone)", marginBottom: 16 }}>
          Mi Compañía
        </h1>
        <div style={{ padding: "32px 24px", background: "var(--ink-deep)", border: "1px solid var(--ink-line)", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--graphite)" }}>
            Aún no se ha sincronizado con la extranet CGBVP
          </p>
        </div>
        <SyncButton />
      </div>
    )
  }

  const estadoColor: Record<string, { bg: string; color: string }> = {
    operativo: { bg: "rgba(16,185,129,0.12)", color: "#34d399" },
    parcial: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" },
    inoperativo: { bg: "rgba(220,38,38,0.12)", color: "var(--red-163)" },
  }
  const ec = estadoColor[status.estado] ?? estadoColor.operativo

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <header style={{ paddingBottom: 16, borderBottom: "1px solid var(--ink-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Flame className="h-6 w-6" style={{ color: "var(--red-163)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em" }}>
            Mi Compañía
          </h1>
        </div>
      </header>

      {/* Status banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--ink-deep)", border: "1px solid var(--ink-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ec.color, boxShadow: `0 0 8px ${ec.color}`, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: ec.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {status.estado}
          </span>
        </div>
        {status.timestamp && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--graphite)", letterSpacing: "0.06em" }}>
            {new Date(status.timestamp).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Jefes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "16px 20px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", marginBottom: 6, textTransform: "uppercase" }}>Primer Jefe</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--bone)" }}>{status.primerJefe || "—"}</p>
        </div>
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "16px 20px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", marginBottom: 6, textTransform: "uppercase" }}>Segundo Jefe</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--bone)" }}>{status.segundoJefe || "—"}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 16px", textAlign: "center" }}>
          <Users className="h-5 w-5 mx-auto" style={{ color: "var(--graphite)", marginBottom: 10 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--bone)", marginBottom: 4 }}>
            {status.personalEnTurno ?? 0}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", textTransform: "uppercase" }}>Personal en turno</p>
        </div>
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 16px", textAlign: "center" }}>
          <Truck className="h-5 w-5 mx-auto" style={{ color: "var(--graphite)", marginBottom: 10 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--bone)", marginBottom: 4 }}>
            {status.vehiculosOperativos ?? 0}
            <span style={{ fontSize: 14, color: "var(--steel)" }}>/{status.vehiculosTotal ?? 0}</span>
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", textTransform: "uppercase" }}>Vehículos operativos</p>
        </div>
      </div>

      {/* Sincronización manual */}
      <SyncButton />
    </div>
  )
}
