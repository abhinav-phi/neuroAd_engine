import React from 'react';
import type { SegmentAnalysis } from '../lib/adTypes';

interface SegmentBreakdownProps {
  segments: SegmentAnalysis[];
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    hook: 'var(--accent-cyan)',
    feature: 'var(--accent-purple)',
    cta: 'var(--accent-gold)',
    testimonial: '#10E88A',
    data: '#64748B',
    emotional: '#FF6B6B',
  };
  return map[type] ?? 'var(--text-secondary)';
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    hook: 'Hook',
    feature: 'Body',
    cta: 'CTA',
    testimonial: 'Testimonial',
    data: 'Data',
    emotional: 'Emotional',
    brand_safety: 'Brand',
    comparison: 'Comparison',
  };
  return map[type] ?? type;
}

export function SegmentBreakdown({ segments }: SegmentBreakdownProps) {
  if (!segments.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.5s ease 300ms both',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>📊</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Segment-wise Breakdown
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}
        >
          {segments.length} segments
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 100px 100px',
          gap: 8,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Content
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Type
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Attention
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Memory
        </span>
      </div>

      {/* Segment rows */}
      {segments.map((seg, i) => {
        const typeColor = getTypeColor(seg.segment_type);
        const attColor = seg.attention >= 0.6 ? 'var(--status-good)' : seg.attention >= 0.4 ? 'var(--status-warn)' : 'var(--status-bad)';
        const memColor = seg.memory >= 0.55 ? 'var(--status-good)' : seg.memory >= 0.35 ? 'var(--status-warn)' : 'var(--status-bad)';

        return (
          <div
            key={seg.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 100px 100px',
              gap: 8,
              padding: '14px 20px',
              borderBottom: i < segments.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              transition: 'background 0.15s ease',
              animation: `fadeInUp 0.3s ease ${150 + i * 80}ms both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,212,255,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Content */}
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {seg.content}
            </div>

            {/* Type badge */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: typeColor,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: `${typeColor}15`,
                  border: `1px solid ${typeColor}30`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {getTypeLabel(seg.segment_type)}
              </span>
            </div>

            {/* Attention bar */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${seg.attention * 100}%`,
                      borderRadius: 3,
                      background: attColor,
                      transition: 'width 0.8s ease',
                      boxShadow: `0 0 4px ${attColor}60`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: attColor,
                    fontWeight: 600,
                    minWidth: 30,
                    textAlign: 'right',
                  }}
                >
                  {Math.round(seg.attention * 100)}
                </span>
              </div>
            </div>

            {/* Memory bar */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${seg.memory * 100}%`,
                      borderRadius: 3,
                      background: memColor,
                      transition: 'width 0.8s ease',
                      boxShadow: `0 0 4px ${memColor}60`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: memColor,
                    fontWeight: 600,
                    minWidth: 30,
                    textAlign: 'right',
                  }}
                >
                  {Math.round(seg.memory * 100)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
