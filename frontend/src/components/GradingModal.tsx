import React, { useEffect, useState, createElement } from 'react';
import { X, Download, RotateCcw, TrendingUp } from 'lucide-react';
import { GradingResult, TaskId } from '../lib/types';
import { getScoreColor } from '../lib/utils';
interface GradingModalProps {
  result: GradingResult;
  currentTask: TaskId;
  onTryAgain: () => void;
  onTryHarder: () => void;
  onClose: () => void;
}
function ScoreRing({ score }: {score: number;}) {
  const [animated, setAnimated] = useState(0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated);
  const color = getScoreColor(score);
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(eased * score);
      if (t < 1) requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return (
    <div
      style={{
        position: 'relative',
        width: 180,
        height: 180
      }}>
      
      <svg
        width="180"
        height="180"
        style={{
          transform: 'rotate(-90deg)'
        }}>
        
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="10" />
        
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke 300ms ease',
            filter: `drop-shadow(0 0 8px ${color})`
          }} />
        
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
        
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 36,
            fontWeight: 700,
            color,
            lineHeight: 1
          }}>
          
          {animated.toFixed(2)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: 4,
            textAlign: 'center'
          }}>
          
          Cognitive Score
        </div>
      </div>
    </div>);

}
function Confetti() {
  const colors = [
  'var(--accent-cyan)',
  'var(--accent-gold)',
  'var(--accent-purple)',
  'var(--status-good)',
  'var(--status-warn)',
  '#FF6B6B'];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}>
      
      {Array.from({
        length: 18
      }).map((_, i) =>
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${5 + i * 5.5 % 90}%`,
          top: '-10px',
          width: i % 3 === 0 ? 8 : 6,
          height: i % 3 === 0 ? 8 : 6,
          borderRadius: i % 2 === 0 ? '50%' : '2px',
          background: colors[i % colors.length],
          animation: `confettiFall ${1.5 + i % 4 * 0.3}s ease-in ${i * 0.08}s forwards`,
          opacity: 0
        }} />

      )}
    </div>);

}
export function GradingModal({
  result,
  currentTask,
  onTryAgain,
  onTryHarder,
  onClose
}: GradingModalProps) {
  const { score, breakdown, feedback } = result;
  const scoreColor = getScoreColor(score);
  const handleExport = () => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogniflow-grade-task${currentTask}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const breakdownRows = [
  {
    label: 'Constraint Satisfaction',
    value: breakdown.constraintSatisfaction,
    weight: '30%'
  },
  {
    label: 'Engagement Quality',
    value: breakdown.engagementQuality,
    weight: '40%'
  },
  {
    label: 'Efficiency (steps used)',
    value: breakdown.efficiency,
    weight: '30%'
  }];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(8,12,20,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 300ms ease forwards'
      }}>
      
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'scaleIn 300ms cubic-bezier(0.4,0,0.2,1) forwards',
          overflow: 'hidden',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
        
        <Confetti />

        {/* Header */}
        <div
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}>
          
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 4
              }}>
              
              Episode Complete
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)'
              }}>
              
              Final Cognitive Optimization Evaluation
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}>
            
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: 24
          }}>
          
          {/* Score ring */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 28
            }}>
            
            <ScoreRing score={score} />
          </div>

          {/* Breakdown table */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 20
            }}>
            
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.02)'
              }}>
              
              {['Criterion', 'Score', 'Weight'].map((h) =>
              <span
                key={h}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textAlign: h === 'Criterion' ? 'left' : 'right'
                }}>
                
                  {h}
                </span>
              )}
            </div>
            {breakdownRows.map((row, i) => {
              const barWidth = `${row.value * 100}%`;
              return (
                <div
                  key={row.label}
                  style={{
                    padding: '12px 16px',
                    borderBottom:
                    i < breakdownRows.length - 1 ?
                    '1px solid var(--border-subtle)' :
                    'none',
                    background:
                    i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}>
                  
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center',
                      marginBottom: 6
                    }}>
                    
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        color: 'var(--text-primary)'
                      }}>
                      
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: getScoreColor(row.value),
                        textAlign: 'right',
                        marginRight: 16
                      }}>
                      
                      {row.value.toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        textAlign: 'right',
                        minWidth: 32
                      }}>
                      
                      {row.weight}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: 'var(--border-subtle)',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                    
                    <div
                      style={{
                        height: '100%',
                        width: barWidth,
                        background: getScoreColor(row.value),
                        borderRadius: 2,
                        transition: 'width 800ms cubic-bezier(0.4,0,0.2,1)'
                      }} />
                    
                  </div>
                </div>);

            })}
          </div>

          {/* Feedback */}
          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.12)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 24
            }}>
            
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8
              }}>
              
              AI Feedback
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                margin: 0
              }}>
              
              {feedback}
            </p>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10
            }}>
            
            <button
              onClick={onTryAgain}
              style={{
                flex: 1,
                padding: '11px 0',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                'rgba(0,212,255,0.3)';
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                'var(--border-subtle)';
              }}>
              
              <RotateCcw size={12} /> Try Again
            </button>
            {currentTask < 3 &&
            <button
              onClick={onTryHarder}
              style={{
                flex: 1,
                padding: '11px 0',
                background: 'rgba(255,184,0,0.08)',
                border: '1px solid rgba(255,184,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-gold)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all var(--transition-fast)'
              }}>
              
                <TrendingUp size={12} /> Try Harder Task
              </button>
            }
            <button
              onClick={handleExport}
              style={{
                padding: '11px 16px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all var(--transition-fast)'
              }}>
              
              <Download size={12} /> Export
            </button>
          </div>
        </div>
      </div>
    </div>);

}