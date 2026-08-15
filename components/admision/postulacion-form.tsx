"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, Upload, Instagram, Clock } from "lucide-react"
import { edadDe } from "@/lib/utils/edad"

type Status = { open: boolean; cohortId?: string; cohortName?: string } | null

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700/70 text-white placeholder-zinc-500 px-4 py-3 text-sm focus:border-red-500/60 focus:outline-none transition-colors"
const labelCls = "block text-xs font-mono tracking-[0.15em] uppercase text-zinc-400 mb-2"

export function PostulacionForm() {
  const [status, setStatus] = useState<Status>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)

  const [form, setForm] = useState({
    fullName: "", profession: "", birthDate: "", dni: "", distrito: "", residencia: "", celular: "", correo: "",
  })

  const edad = edadDe(form.birthDate)

  useEffect(() => {
    fetch("/api/admission")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ open: false }))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (pdf && pdf.type !== "application/pdf") { setError("El CERTIJOVEN debe ser un PDF."); return }
    if (pdf && pdf.size > 10 * 1024 * 1024) { setError("El PDF no debe superar 10 MB."); return }
    if (edad === null) { setError("Ingresa una fecha de nacimiento válida."); return }
    if (edad < 16 || edad > 70) { setError("La edad debe estar entre 16 y 70 años."); return }

    setSubmitting(true)
    try {
      // 1. Crear postulación
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          profession: form.profession,
          birthDate: form.birthDate,
          dni: form.dni,
          distrito: form.distrito,
          residencia: form.residencia || undefined,
          celular: form.celular,
          correo: form.correo || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "No se pudo enviar la postulación."); setSubmitting(false); return }

      // 2. Subir CERTIJOVEN (opcional pero recomendado)
      if (pdf) {
        const up = await fetch("/api/admission/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cohortId: data.cohortId, applicationId: data.applicationId,
            contentType: "application/pdf", sizeBytes: pdf.size,
          }),
        })
        const upData = await up.json()
        if (up.ok && upData.uploadUrl) {
          await fetch(upData.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: pdf })
          await fetch("/api/admission", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId: data.applicationId, cohortId: data.cohortId, certijovenKey: upData.key }),
          })
        }
      }

      setDone(true)
    } catch {
      setError("Ocurrió un error. Inténtalo nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  // ── Convocatoria cerrada ──
  if (!status?.open) {
    return (
      <div className="p-8 md:p-12 border border-zinc-800/60 bg-zinc-900/30 text-center max-w-2xl mx-auto">
        <Clock className="w-10 h-10 text-red-500/70 mx-auto mb-5" />
        <h3 className="text-2xl font-black text-white mb-3">Convocatoria cerrada</h3>
        <p className="text-zinc-400 leading-relaxed mb-6">
          En este momento no tenemos una convocatoria abierta. Muy pronto abriremos
          el proceso de admisión para una nueva promoción. Mantente atento a nuestras
          redes sociales para enterarte de la próxima convocatoria.
        </p>
        <div className="inline-flex items-center gap-2 text-red-400 text-sm font-mono tracking-wider">
          <Instagram className="w-4 h-4" /> Síguenos para no perderte la próxima convocatoria
        </div>
      </div>
    )
  }

  // ── Postulación enviada ──
  if (done) {
    return (
      <div className="p-8 md:p-12 border border-red-500/30 bg-red-500/[0.04] text-center max-w-2xl mx-auto">
        <CheckCircle2 className="w-12 h-12 text-red-500 mx-auto mb-5" />
        <h3 className="text-2xl font-black text-white mb-3">¡Postulación recibida!</h3>
        <p className="text-zinc-400 leading-relaxed">
          Gracias por postular a la <strong className="text-white">{status.cohortName}</strong>.
          El área de Instrucción revisará tu solicitud y tus documentos. Te contactaremos
          al número que registraste para informarte sobre la siguiente etapa.
        </p>
      </div>
    )
  }

  // ── Formulario ──
  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-5">
      <div className="text-center mb-2">
        <span className="text-red-400 text-xs font-mono tracking-[0.2em] uppercase">
          {status.cohortName} · Inscripción abierta
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelCls}>Nombres y apellidos completos</label>
          <input className={inputCls} required value={form.fullName} onChange={set("fullName")} placeholder="Ej. Juan Carlos Pérez Rojas" />
        </div>
        <div>
          <label className={labelCls}>Profesión y/o ocupación</label>
          <input className={inputCls} required value={form.profession} onChange={set("profession")} placeholder="Ej. Estudiante, técnico…" />
        </div>
        <div>
          <label className={labelCls}>
            Fecha de nacimiento
            {edad !== null && (
              <span className="ml-2 text-red-400 normal-case tracking-normal">· {edad} años</span>
            )}
          </label>
          <input
            className={inputCls}
            required
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.birthDate}
            onChange={set("birthDate")}
          />
        </div>
        <div>
          <label className={labelCls}>DNI</label>
          <input className={inputCls} required inputMode="numeric" maxLength={8} value={form.dni} onChange={set("dni")} placeholder="8 dígitos" />
        </div>
        <div>
          <label className={labelCls}>Distrito</label>
          <input className={inputCls} required value={form.distrito} onChange={set("distrito")} placeholder="Ej. Ancón" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Dirección / residencia</label>
          <input className={inputCls} value={form.residencia} onChange={set("residencia")} placeholder="Ej. Av. Los Cedros 123, Ancón" />
        </div>
        <div>
          <label className={labelCls}>Celular</label>
          <input className={inputCls} required inputMode="numeric" value={form.celular} onChange={set("celular")} placeholder="Ej. 987654321" />
        </div>
        <div>
          <label className={labelCls}>Correo electrónico</label>
          <input className={inputCls} type="email" value={form.correo} onChange={set("correo")} placeholder="Ej. nombre@correo.com" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>CERTIJOVEN (PDF)</label>
          <label className="flex items-center gap-3 w-full bg-zinc-900/60 border border-dashed border-zinc-700/70 text-zinc-400 px-4 py-3 text-sm cursor-pointer hover:border-red-500/50 transition-colors">
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">{pdf ? pdf.name : "Adjunta tu certificado CERTIJOVEN en PDF (máx. 10 MB)"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={e => setPdf(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/[0.05] px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 text-sm tracking-[0.1em] uppercase transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : "Enviar postulación"}
      </button>
      <p className="text-xs text-zinc-500 text-center">
        Al enviar aceptas que la Compañía use tus datos para el proceso de admisión.
      </p>
    </form>
  )
}
