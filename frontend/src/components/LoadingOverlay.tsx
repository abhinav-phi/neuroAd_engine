import React from 'react';

const STAGES = [
  { label: 'Parsing ad content', icon: '📝' },
  { label: 'Simulating cognitive response', icon: '🧠' },
  { label: 'Analyzing attention patterns', icon: '👁️' },
  { label: 'Evaluating memory retention', icon: '💾' },
  { label: 'Generating insights', icon: '💡' },
];

interface LoadingOverlayProps {
  onCancel?: () => void;
}

export function LoadingOverlay({ onCancel }: LoadingOverlayProps) {
  const [stageIndex, setStageIndex] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);

  // Cycle through stages, but cap at last stage instead of looping forever
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stage = STAGES[stageIndex];
  const isSlow = elapsed > 20;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        padding: '80px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Pulsing Brain Animation */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(139,92,246,0.05) 70%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: 48 }}>🧠</span>
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === 0 ? 'var(--accent-cyan)' : i === 1 ? 'var(--accent-purple)' : 'var(--accent-gold)',
              top: '50%',
              left: '50%',
              transformOrigin: '0 0',
              animation: `orbit${i} ${2 + i * 0.5}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Stage text */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          AI is Analyzing Your Ad
        </div>
        <div
          key={stageIndex}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--accent-cyan)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <span>{stage.icon}</span>
          {stage.label}
        </div>

        {/* Elapsed timer */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 8,
          }}
        >
          {elapsed}s elapsed
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 300,
          height: 3,
          borderRadius: 2,
          background: 'var(--bg-elevated)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
            animation: 'shimmer 1.5s ease infinite',
            backgroundSize: '200% 100%',
            width: '100%',
          }}
        />
      </div>

      {/* Slow warning + Cancel button */}
      {isSlow && (
        <div
          style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--accent-gold, #FFB800)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            ⚠️ This is taking longer than expected. The AI server may be waking up.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '8px 24px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid rgba(255,184,0,0.3)',
                background: 'rgba(255,184,0,0.08)',
                color: 'var(--accent-gold, #FFB800)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,184,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,184,0,0.08)';
              }}
            >
              Cancel Analysis
            </button>
          )}
        </div>
      )}

      {/* CSS for orbiting dots */}
      <style>{`
        @keyframes orbit0 {
          from { transform: rotate(0deg) translateX(58px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(58px) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: rotate(120deg) translateX(62px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(62px) rotate(-480deg); }
        }
        @keyframes orbit2 {
          from { transform: rotate(240deg) translateX(55px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(55px) rotate(-600deg); }
        }
      `}</style>
    </div>
  );
}
