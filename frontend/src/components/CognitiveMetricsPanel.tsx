import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Tooltip } from
'recharts';
import { Observation, GlobalMetrics } from '../lib/types';
import {
  getMetricColor,
  getLoadColor,
  getValenceLabel,
  getValenceColor,
  getAttentionPatternDescription,
  getAttentionPatternColor,
  formatDelta } from
'../lib/utils';
interface CognitiveMetricsPanelProps {
  observation: Observation;
  prevObservation: Observation | null;
  isLoading: boolean;
}
// Count-up hook
function useCountUp(target: number, duration = 400) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef<number>();
  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);else
      prevRef.current = end;
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);
  return display;
}
function KPIBlock({ value, prevValue }: {value: number;prevValue?: number;}) {
  const animated = useCountUp(value);
  const delta = prevValue !== undefined ? value - prevValue : null;
  return (
    <div
      style={{
        padding: '16px',
        background: 'rgba(255,184,0,0.04)',
        border: '1px solid rgba(255,184,0,0.15)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 16
      }}>
      
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6
        }}>
        
        Overall Engagement
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 44,
          fontWeight: 600,
          color: 'var(--accent-gold)',
          lineHeight: 1,
          textShadow: 'var(--shadow-glow-gold)',
          transition: 'color var(--transition-med)'
        }}>
        
        {animated.toFixed(3)}
      </div>
      {delta !== null && Math.abs(delta) > 0.0005 &&
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 600,
          color: delta > 0 ? 'var(--status-good)' : 'var(--status-bad)',
          marginTop: 6,
          animation: 'deltaFadeIn 300ms ease forwards'
        }}>
        
          {delta > 0 ? '↑' : '↓'} {formatDelta(delta)}
        </div>
      }
    </div>);

}
function MiniBarChart({
  segments,
  metricKey,
  color,
  label





}: {segments: Observation['segments'];metricKey: 'attention' | 'memory';color: string;label: string;}) {
  const data = segments.map((s, i) => ({
    name: `S${i + 1}`,
    value: s.metrics[metricKey]
  }));
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}>
        
        {label}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          
          <XAxis
            dataKey="name"
            tick={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fill: 'var(--text-muted)'
            }}
            axisLine={false}
            tickLine={false} />
          
          <YAxis domain={[0, 1]} hide />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-primary)'
                  }}>
                  
                  {payload[0].name}: {Number(payload[0].value).toFixed(3)}
                </div>);

            }} />
          
          <Bar
            dataKey="value"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={400}>
            
            {data.map((entry, i) =>
            <Cell key={i} fill={getMetricColor(entry.value)} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);

}
function ArcGauge({ value }: {value: number;}) {
  const radius = 44;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - value);
  const color = getLoadColor(value);
  const animated = useCountUp(value);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}>
        
        Cognitive Load
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 100, height: 56 }}>
          <svg width="100" height="56" viewBox="0 0 100 56">
            {/* Background arc */}
            <path
              d="M 8 50 A 42 42 0 0 1 92 50"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="6"
              strokeLinecap="round" />
            
            {/* Value arc */}
            <path
              d="M 8 50 A 42 42 0 0 1 92 50"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition:
                'stroke-dashoffset 500ms cubic-bezier(0.4,0,0.2,1), stroke 300ms ease'
              }} />
            
          </svg>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}>
            
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 600,
                color,
                lineHeight: 1
              }}>
              
              {animated.toFixed(2)}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
            { label: 'Low', range: '< 0.4', color: 'var(--status-good)' },
            { label: 'Med', range: '0.4–0.7', color: 'var(--status-warn)' },
            { label: 'High', range: '> 0.7', color: 'var(--status-bad)' }].
            map((tier) =>
            <div
              key={tier.label}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              
                <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tier.color
                }} />
              
                <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-muted)'
                }}>
                
                  {tier.label} {tier.range}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);

}
function ValenceMeter({ value }: {value: number;}) {
  const pct = (value + 1) / 2 * 100;
  const color = getValenceColor(value);
  const label = getValenceLabel(value);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}>
        
        Emotional Valence
      </div>
      <div style={{ position: 'relative', height: 20, marginBottom: 8 }}>
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 6,
            transform: 'translateY(-50%)',
            background:
            'linear-gradient(to right, var(--status-bad), var(--border-subtle) 50%, var(--status-good))',
            borderRadius: 3
          }} />
        
        {/* Dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            background: color,
            borderRadius: '50%',
            boxShadow: `0 0 8px ${color}`,
            border: '2px solid var(--bg-surface)',
            transition: 'left 400ms cubic-bezier(0.4,0,0.2,1)',
            zIndex: 1
          }} />
        
        {/* Labels */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--status-bad)'
          }}>
          
          −1
        </div>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--status-good)'
          }}>
          
          +1
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color,
          textAlign: 'center'
        }}>
        
        {label} ({value >= 0 ? '+' : ''}
        {value.toFixed(2)})
      </div>
    </div>);

}
function AttentionFlowCard({
  segments,
  pattern



}: {segments: Observation['segments'];pattern: string;}) {
  const data = segments.map((s, i) => ({
    name: `S${i + 1}`,
    value: s.metrics.attention
  }));
  const patternColor = getAttentionPatternColor(pattern);
  const description = getAttentionPatternDescription(pattern);
  return (
    <div
      style={{
        marginBottom: 16,
        background: 'rgba(0,212,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: 12
      }}>
      
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}>
        
        Attention Flow
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          
          <defs>
            <linearGradient id="attnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--accent-cyan)"
                stopOpacity={0.3} />
              
              <stop
                offset="95%"
                stopColor="var(--accent-cyan)"
                stopOpacity={0} />
              
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--accent-cyan)"
            strokeWidth={1.5}
            fill="url(#attnGrad)"
            isAnimationActive
            animationDuration={400}
            dot={false} />
          
        </AreaChart>
      </ResponsiveContainer>
      <div
        style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: patternColor
          }}>
          
          {pattern}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--text-muted)',
            flex: 1
          }}>
          
          {description}
        </span>
      </div>
    </div>);

}
function BeforeAfterTable({
  current,
  previous



}: {current: GlobalMetrics;previous: GlobalMetrics;}) {
  const rows = [
  {
    label: 'Engagement',
    curr: current.engagement,
    prev: previous.engagement
  },
  {
    label: 'Attention',
    curr: current.avgAttention,
    prev: previous.avgAttention
  },
  { label: 'Memory', curr: current.avgMemory, prev: previous.avgMemory },
  { label: 'Load', curr: current.avgLoad, prev: previous.avgLoad }];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}>
        
        Before / After
      </div>
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden'
        }}>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            padding: '6px 10px',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
          
          {['Metric', 'Before', 'After', 'Δ'].map((h) =>
          <span
            key={h}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
            
              {h}
            </span>
          )}
        </div>
        {rows.map((row, i) => {
          const delta = row.curr - row.prev;
          return (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                padding: '5px 10px',
                background:
                i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
              }}>
              
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-secondary)'
                }}>
                
                {row.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)'
                }}>
                
                {row.prev.toFixed(3)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: getMetricColor(row.curr)
                }}>
                
                {row.curr.toFixed(3)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  color:
                  delta > 0.001 ?
                  'var(--status-good)' :
                  delta < -0.001 ?
                  'var(--status-bad)' :
                  'var(--text-muted)'
                }}>
                
                {delta > 0.001 ? '↑' : delta < -0.001 ? '↓' : '—'}
                {Math.abs(delta) > 0.001 ? Math.abs(delta).toFixed(3) : ''}
              </span>
            </div>);

        })}
      </div>
    </div>);

}
function ShimmerBlock({ height = 60 }: {height?: number;}) {
  return (
    <div
      style={{
        height,
        borderRadius: 'var(--radius-sm)',
        background:
        'linear-gradient(90deg, var(--bg-elevated) 25%, rgba(255,255,255,0.04) 50%, var(--bg-elevated) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        marginBottom: 16
      }} />);


}
export function CognitiveMetricsPanel({
  observation,
  prevObservation,
  isLoading
}: CognitiveMetricsPanelProps) {
  const { metrics, segments } = observation;
  const prevMetrics = prevObservation?.metrics;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '0 2px'
      }}>
      
      {/* Live pulse header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)'
        }}>
        
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-cyan)'
            }} />
          
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              animation: 'dotPulse 1.5s ease-in-out infinite'
            }} />
          
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
          
          Cognitive Metrics
        </span>
      </div>

      {isLoading ?
      <>
          <ShimmerBlock height={80} />
          <ShimmerBlock height={110} />
          <ShimmerBlock height={110} />
          <ShimmerBlock height={80} />
          <ShimmerBlock height={60} />
        </> :

      <>
          <KPIBlock
          value={metrics.engagement}
          prevValue={prevMetrics?.engagement} />
        
          <MiniBarChart
          segments={segments}
          metricKey="attention"
          color="var(--accent-cyan)"
          label="Attention Scores" />
        
          <MiniBarChart
          segments={segments}
          metricKey="memory"
          color="var(--accent-purple)"
          label="Memory Retention" />
        
          <ArcGauge value={metrics.avgLoad} />
          <ValenceMeter value={metrics.avgValence} />
          <AttentionFlowCard
          segments={segments}
          pattern={metrics.attentionPattern} />
        
          {prevMetrics &&
        <BeforeAfterTable current={metrics} previous={prevMetrics} />
        }
        </>
      }
    </div>);

}