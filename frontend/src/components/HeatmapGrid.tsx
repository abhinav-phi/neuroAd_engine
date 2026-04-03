import React, { useState, Fragment, memo } from 'react';
import { Segment } from '../lib/types';
interface HeatmapGridProps {
  segments: Segment[];
}
const METRICS = [
{
  key: 'attention' as const,
  label: 'Attention'
},
{
  key: 'memory' as const,
  label: 'Memory'
},
{
  key: 'load' as const,
  label: 'Cog. Load'
}];

function interpolateColor(value: number): string {
  // 0 = red, 0.5 = yellow, 1 = green
  if (value < 0.5) {
    const t = value * 2;
    const r = Math.round(255 + (255 - 255) * t);
    const g = Math.round(77 + (184 - 77) * t);
    const b = Math.round(106 + (0 - 106) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (value - 0.5) * 2;
    const r = Math.round(255 + (16 - 255) * t);
    const g = Math.round(184 + (232 - 184) * t);
    const b = Math.round(0 + (138 - 0) * t);
    return `rgb(${r},${g},${b})`;
  }
}
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  value: number;
  segmentLabel: string;
  metricLabel: string;
}
export function HeatmapGrid({ segments }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    segmentLabel: '',
    metricLabel: ''
  });
  return (
    <div
      style={{
        position: 'relative',
        overflowX: 'auto'
      }}>
      
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16
        }}>
        
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--status-bad)'
          }}>
          
          Low
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background:
            'linear-gradient(to right, var(--status-bad), var(--status-warn), var(--status-good))'
          }} />
        
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--status-good)'
          }}>
          
          High
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `60px repeat(${METRICS.length}, 1fr)`,
          gap: 4
        }}>
        
        {/* Header row */}
        <div />
        {METRICS.map((m) =>
        <div
          key={m.key}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '4px 0'
          }}>
          
            {m.label}
          </div>
        )}

        {/* Data rows */}
        {segments.map((seg, si) =>
        <Fragment key={seg.id}>
            <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center'
            }}>
            
              S{si + 1}
            </div>
            {METRICS.map((m) => {
            const value = seg.metrics[m.key];
            const bg = interpolateColor(value);
            return (
              <div
                key={m.key}
                onMouseEnter={(e) => {
                  const rect = (
                  e.currentTarget as HTMLElement).
                  getBoundingClientRect();
                  setTooltip({
                    visible: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    value,
                    segmentLabel: `S${si + 1} (${seg.type})`,
                    metricLabel: m.label
                  });
                }}
                onMouseLeave={() =>
                setTooltip((t) => ({
                  ...t,
                  visible: false
                }))
                }
                style={{
                  height: 40,
                  background: bg,
                  borderRadius: 'var(--radius-sm)',
                  opacity: 0.85,
                  cursor: 'crosshair',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity var(--transition-fast)',
                  border: '1px solid rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '1';
                }}
                onMouseOut={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '0.85';
                }}>
                
                  <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(0,0,0,0.7)'
                  }}>
                  
                    {value.toFixed(2)}
                  </span>
                </div>);

          })}
          </Fragment>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible &&
      <div
        style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-primary)',
          pointerEvents: 'none',
          zIndex: 100,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}>
        
          <div
          style={{
            color: 'var(--text-secondary)',
            marginBottom: 2
          }}>
          
            {tooltip.segmentLabel} · {tooltip.metricLabel}
          </div>
          <div
          style={{
            color: 'var(--accent-cyan)',
            fontWeight: 600
          }}>
          
            {tooltip.value.toFixed(4)}
          </div>
        </div>
      }
    </div>);

}