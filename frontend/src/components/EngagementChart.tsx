import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SegmentAnalysis } from '../lib/adTypes';

interface EngagementChartProps {
  segments: SegmentAnalysis[];
  attentionScores: number[];
  memoryScores: number[];
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    hook: 'Hook',
    feature: 'Body',
    cta: 'CTA',
    testimonial: 'Testimonial',
  };
  return map[type] ?? type;
}

export function EngagementChart({ segments, attentionScores, memoryScores }: EngagementChartProps) {
  const data = segments.map((seg, i) => ({
    name: `${getTypeLabel(seg.segment_type)}`,
    attention: Math.round((attentionScores[i] ?? seg.attention) * 100),
    memory: Math.round((memoryScores[i] ?? seg.memory) * 100),
  }));

  if (!data.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        animation: 'fadeInUp 0.5s ease 350ms both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 16 }}>📈</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Engagement Trend
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="attGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-primary)',
            }}
            formatter={(value: number) => [`${value}%`]}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          />
          <Area
            type="monotone"
            dataKey="attention"
            stroke="#00D4FF"
            strokeWidth={2}
            fill="url(#attGradient)"
            name="Attention"
            dot={{ r: 4, fill: '#00D4FF', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#00D4FF', stroke: '#fff', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="memory"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#memGradient)"
            name="Memory"
            dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
