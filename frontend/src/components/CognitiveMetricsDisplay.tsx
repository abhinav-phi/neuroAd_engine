import React from 'react';

interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
  format?: 'percent' | 'valence' | 'load';
  description?: string;
  delay?: number;
}

function MetricCard({ icon, label, value, format = 'percent', description, delay = 0 }: MetricCardProps) {
  const getDisplay = () => {
    if (format === 'valence') {
      const v = value;
      if (v >= 0.3) return { text: 'Positive', color: 'var(--status-good)' };
      if (v >= -0.1) return { text: 'Neutral', color: 'var(--status-warn)' };
      return { text: 'Negative', color: 'var(--status-bad)' };
    }
    if (format === 'load') {
      const pct = Math.round(value * 100);
      const color = value < 0.4 ? 'var(--status-good)' : value < 0.65 ? 'var(--status-warn)' : 'var(--status-bad)';
      return { text: `${pct}%`, color };
    }
    const pct = Math.round(value * 100);
    const color = value >= 0.7 ? 'var(--status-good)' : value >= 0.4 ? 'var(--status-warn)' : 'var(--status-bad)';
    return { text: `${pct}%`, color };
  };

  const display = getDisplay();
  const barWidth = format === 'valence' ? Math.abs(value) * 50 + 50 : value * 100;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: `fadeInUp 0.4s ease ${delay}ms both`,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${display.color}40`;
        e.currentTarget.style.boxShadow = `0 0 16px ${display.color}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 800,
            color: display.color,
          }}
        >
          {display.text}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: 'var(--bg-elevated)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            borderRadius: 2,
            background: display.color,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 8px ${display.color}60`,
          }}
        />
      </div>

      {description && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

interface CognitiveMetricsProps {
  attention: number;
  memory: number;
  cognitiveLoad: number;
  emotionalValence: number;
}

export function CognitiveMetricsDisplay({ attention, memory, cognitiveLoad, emotionalValence }: CognitiveMetricsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}
    >
      <MetricCard
        icon="👁️"
        label="Attention"
        value={attention}
        format="percent"
        description="How well your ad captures and holds viewer focus."
        delay={100}
      />
      <MetricCard
        icon="🧠"
        label="Memory"
        value={memory}
        format="percent"
        description="Likelihood of key messages being remembered."
        delay={200}
      />
      <MetricCard
        icon="⚡"
        label="Cognitive Load"
        value={cognitiveLoad}
        format="load"
        description={cognitiveLoad < 0.5 ? 'Easy to process — good!' : 'May overwhelm readers.'}
        delay={300}
      />
      <MetricCard
        icon="💜"
        label="Emotion"
        value={emotionalValence}
        format="valence"
        description="Emotional response evoked by your ad content."
        delay={400}
      />
    </div>
  );
}
