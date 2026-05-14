"use client"

import { Award } from 'lucide-react'

/**
 * Tab de Condecoraciones.
 *
 * Muestra los cinco grados de la medalla Dios-Patria-Humanidad según NDR de
 * Uniformes, Insignias, Reconocimientos y Condecoraciones del CGBVP.
 * Hoy está vacío (no hay schema de decorations aún); se mostrará como empty state
 * educativo hasta que haya datos.
 */

const GRADES_CONDECORACION = [
  { roman: 'V', name: 'Soldado del Fuego', desc: 'Grado inicial · servicio destacado', variant: 5 },
  { roman: 'IV', name: 'Caballero del Fuego', desc: 'Trayectoria sostenida con méritos', variant: 4 },
  { roman: 'III', name: 'Servicios Distinguidos', desc: 'Aportes significativos al servicio', variant: 3 },
  { roman: 'II', name: 'Bombero Emérito del Perú', desc: 'Una vida dedicada al voluntariado', variant: 2 },
  { roman: 'I', name: 'Estrella de Fuego', desc: 'Máxima distinción del CGBVP', variant: 1 },
] as const

export function CondecoracionesTab() {
  return (
    <>
      <div className="empty-state">
        <div className="empty-state-icon">
          <Award className="w-12 h-12" strokeWidth={1.4} />
        </div>
        <h3 className="empty-state-title">Aún no ha recibido condecoraciones</h3>
        <p className="empty-state-text">
          Las condecoraciones y reconocimientos que reciba aparecerán aquí. Incluyen los cinco
          grados de la medalla Dios-Patria-Humanidad según la NDR de Uniformes, Insignias,
          Reconocimientos y Condecoraciones del CGBVP.
        </p>
      </div>

      <div className="grades-preview">
        <h4 className="grades-preview-title">Grados de condecoración</h4>
        {GRADES_CONDECORACION.map((g) => (
          <div key={g.roman} className="grade-item">
            <div className={`grade-medal grade-medal--${g.variant}`}>{g.roman}</div>
            <div>
              <div className="grade-name">{g.name}</div>
              <div className="grade-desc">{g.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
