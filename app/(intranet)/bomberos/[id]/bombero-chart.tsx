'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { mes: string; horas: number; emergencias: number }[]
}

export default function BomberoChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Emergencias', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="horas" name="Horas" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={28} />
        <Line yAxisId="right" dataKey="emergencias" name="Emergencias" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
