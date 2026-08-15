'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { mes: string; horas: number; emergencias: number }[]
}

const INK_LINE = '#232B3B'
const STEEL = '#8B96A5'
const RED = '#DC2626'
const BRASS = '#C4A062'

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '6px 10px', fontSize: 12 }}>
      <div style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: <b style={{ color: 'var(--bone)' }}>{p.value}</b></div>
      ))}
    </div>
  )
}

export default function BomberoChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={INK_LINE} vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: STEEL }} axisLine={{ stroke: INK_LINE }} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: STEEL }} axisLine={false} tickLine={false} width={34} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: STEEL }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(196,160,98,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: STEEL }} />
        <Bar yAxisId="left" dataKey="horas" name="Horas" fill={RED} radius={[2, 2, 0, 0]} barSize={26} />
        <Line yAxisId="right" dataKey="emergencias" name="Emergencias" stroke={BRASS} strokeWidth={2} dot={{ r: 3, fill: BRASS }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
