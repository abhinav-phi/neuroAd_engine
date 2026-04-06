import React, { useEffect, useState } from 'react';

interface ScoreCardProps {
  score: number; // 0–1
  label: string;
}

export function ScoreCard({ score, label }: ScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const percentage = Math.round(score * 100);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(eased * percentage));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [percentage]);

  const getColor = () => {
    if (percentage >= 80) return 'var(--status-good)';
    if (percentage >= 50) return 'var(--status-warn)';
    return 'var(--status-bad)';
  };

  const getGradient = () => {
    if (percentage >= 80) return 'linear-gradient(135deg, #10E88A, #00D4FF)';
    if (percentage >= 50) return 'linear-gradient(135deg, #FFB800, #FF8C00)';
    return 'linear-gradient(135deg, #FF4D6A, #FF6B6B)';
  };

  const color = getColor();
  const circumference = 2 * Math.PI * 58;
  const dashOffset = circumference * (1 - score);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        animation: 'scaleIn 0.5s ease forwards',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Circular gauge */}
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r="58"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r="58"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 70 70)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 8px ${color}80)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 800,
              background: getGradient(),
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}
          >
            {animatedScore}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            / 100
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}
        >
          Engagement Score
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color,
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            background: `${color}15`,
            border: `1px solid ${color}30`,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
