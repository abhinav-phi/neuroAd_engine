import React from 'react';
import type { Suggestion } from '../lib/adTypes';

interface SuggestionsPanelProps {
  strengths: string[];
  weaknesses: string[];
  suggestions: Suggestion[];
}

function getImpactColor(impact: string): string {
  if (impact === 'high') return 'var(--status-bad)';
  if (impact === 'medium') return 'var(--status-warn)';
  return 'var(--status-neutral)';
}

function getImpactLabel(impact: string): string {
  if (impact === 'high') return 'HIGH';
  if (impact === 'medium') return 'MED';
  return 'LOW';
}

export function SuggestionsPanel({ strengths, weaknesses, suggestions }: SuggestionsPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Strengths */}
      {strengths.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.5s ease 400ms both',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>✅</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--status-good)',
              }}
            >
              Strengths
            </span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {strengths.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  animation: `fadeInUp 0.3s ease ${500 + i * 60}ms both`,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--status-good)',
                    marginTop: 6,
                    flexShrink: 0,
                    boxShadow: '0 0 6px var(--status-good)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.5s ease 500ms both',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--status-warn)',
              }}
            >
              Areas for Improvement
            </span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weaknesses.map((w, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  animation: `fadeInUp 0.3s ease ${600 + i * 60}ms both`,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--status-warn)',
                    marginTop: 6,
                    flexShrink: 0,
                    boxShadow: '0 0 6px var(--status-warn)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  {w}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.5s ease 600ms both',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>💡</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--accent-cyan)',
              }}
            >
              AI Suggestions
            </span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  animation: `fadeInUp 0.3s ease ${700 + i * 80}ms both`,
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      color: getImpactColor(s.impact),
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: `${getImpactColor(s.impact)}15`,
                      border: `1px solid ${getImpactColor(s.impact)}30`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {getImpactLabel(s.impact)} impact
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
