import React from 'react';
import type { BrainResponseData } from '../lib/adTypes';

interface BrainMapProps {
  brainResponse: BrainResponseData | null;
}

interface RegionDisplay {
  name: string;
  label: string;
  function: string;
  icon: string;
  x: number;
  y: number;
  size: number;
}

const REGIONS: RegionDisplay[] = [
  { name: 'V1', label: 'Visual Cortex', function: 'Visual Attention', icon: '👁️', x: 50, y: 28, size: 44 },
  { name: 'PEF', label: 'Parietal Eye Fields', function: 'Attention Control', icon: '🎯', x: 72, y: 42, size: 38 },
  { name: 'Hippocampus', label: 'Hippocampus', function: 'Memory Encoding', icon: '🧠', x: 50, y: 58, size: 46 },
  { name: 'Amygdala', label: 'Amygdala', function: 'Emotion Processing', icon: '💜', x: 28, y: 42, size: 38 },
  { name: 'IFSa', label: 'Prefrontal Cortex', function: 'Cognitive Control', icon: '⚡', x: 50, y: 78, size: 40 },
];

function getActivationColor(level: number): string {
  if (level >= 0.7) return '#00D4FF';
  if (level >= 0.4) return '#FFB800';
  return '#FF4D6A';
}

export function BrainMap({ brainResponse }: BrainMapProps) {
  if (!brainResponse) return null;

  const activationMap = new Map<string, number>();
  brainResponse.region_activations.forEach((r) => {
    activationMap.set(r.region_name, r.activation_level);
  });

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 20px',
        animation: 'fadeInUp 0.5s ease 500ms both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 16 }}>🧬</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Neural Activation Map
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.15)',
          }}
        >
          {brainResponse.source.toUpperCase()}
        </span>
      </div>

      {/* Brain visualization */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '80%',
          borderRadius: 'var(--radius-md)',
          background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.03) 0%, transparent 70%)',
          overflow: 'hidden',
        }}
      >
        {/* Brain outline */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Brain shape */}
          <ellipse
            cx="50"
            cy="50"
            rx="38"
            ry="42"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          {/* Midline */}
          <line
            x1="50"
            y1="8"
            x2="50"
            y2="92"
            stroke="var(--border-subtle)"
            strokeWidth="0.3"
            strokeDasharray="1,3"
          />

          {/* Connection lines */}
          {REGIONS.map((region, i) => {
            const activation = activationMap.get(region.name) ?? 0;
            const color = getActivationColor(activation);
            return REGIONS.slice(i + 1).map((other, j) => {
              const otherActivation = activationMap.get(other.name) ?? 0;
              const avgActivation = (activation + otherActivation) / 2;
              return (
                <line
                  key={`${region.name}-${other.name}`}
                  x1={region.x}
                  y1={region.y}
                  x2={other.x}
                  y2={other.y}
                  stroke={color}
                  strokeWidth={avgActivation * 0.8}
                  opacity={avgActivation * 0.3}
                />
              );
            });
          })}
        </svg>

        {/* Region nodes */}
        {REGIONS.map((region) => {
          const activation = activationMap.get(region.name) ?? 0;
          const color = getActivationColor(activation);
          const pct = Math.round(activation * 100);

          return (
            <div
              key={region.name}
              style={{
                position: 'absolute',
                left: `${region.x}%`,
                top: `${region.y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                animation: `scaleIn 0.4s ease ${300 + REGIONS.indexOf(region) * 100}ms both`,
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: 'absolute',
                  width: region.size * 1.8,
                  height: region.size * 1.8,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color}${Math.round(activation * 30).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />

              {/* Node circle */}
              <div
                style={{
                  width: region.size,
                  height: region.size,
                  borderRadius: '50%',
                  background: `${color}15`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${color}40`,
                  position: 'relative',
                  zIndex: 2,
                  transition: 'transform 0.2s ease',
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: region.size * 0.4 }}>{region.icon}</span>
              </div>

              {/* Label */}
              <div
                style={{
                  textAlign: 'center',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    color,
                    letterSpacing: '0.05em',
                  }}
                >
                  {pct}%
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 8,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {region.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {[
          { label: 'High', color: '#00D4FF' },
          { label: 'Medium', color: '#FFB800' },
          { label: 'Low', color: '#FF4D6A' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: item.color,
                boxShadow: `0 0 6px ${item.color}60`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
