'use client'

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const TOOLTIP_STYLE = { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 11, color: '#e8e5e0' }

interface DonutProps {
  data: { name: string; value: number; color: string }[]
  size?: number
}

export function DonutChart({ data, size = 160 }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ fontSize: 12, color: 'var(--graphite)' }}>Sin datos</p>
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={size * 0.3} outerRadius={size * 0.44} paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface HBarProps {
  data: { name: string; value: number; color?: string }[]
  height?: number
}

export function HorizontalBarChart({ data, height = 160 }: HBarProps) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 60, right: 16 }}>
        <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? '#3b82f6'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
