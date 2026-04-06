import React from 'react';
import type { AnalysisResult } from '../lib/adTypes';
import { ScoreCard } from './ScoreCard';
import { CognitiveMetricsDisplay } from './CognitiveMetricsDisplay';
import { SegmentBreakdown } from './SegmentBreakdown';
import { SuggestionsPanel } from './SuggestionsPanel';
import { EngagementChart } from './EngagementChart';
import { BrainMap } from './BrainMap';

interface ResultsDashboardProps {
  result: AnalysisResult;
  duration: number | null;
  onReset: () => void;
}

export function ResultsDashboard({ result, duration, onReset }: ResultsDashboardProps) {
  const avgAttention = result.attention_scores.length
    ? result.attention_scores.reduce((a, b) => a + b, 0) / result.attention_scores.length
    : 0;
  const avgMemory = result.memory_scores.length
    ? result.memory_scores.reduce((a, b) => a + b, 0) / result.memory_scores.length
    : 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 16px 80px',
        animation: 'fadeInUp 0.6s ease forwards',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          animation: 'fadeIn 0.4s ease',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Analysis Results
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.15)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--accent-cyan)',
              }}
            >
              {result.simulation_source === 'tribev2' ? 'TRIBE v2' : 'Parametric'} Engine
            </span>
            {duration && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}
              >
                {(duration / 1000).toFixed(1)}s
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span>✨</span>
          Analyze Another Ad
        </button>
      </div>

      {/* Main Grid: Score + Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Score Card */}
        <ScoreCard score={result.engagement_score} label={result.engagement_label} />

        {/* Cognitive Metrics */}
        <CognitiveMetricsDisplay
          attention={avgAttention}
          memory={avgMemory}
          cognitiveLoad={result.cognitive_load}
          emotionalValence={result.emotional_valence}
        />
      </div>

      {/* Engagement Chart */}
      {result.segments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <EngagementChart
            segments={result.segments}
            attentionScores={result.attention_scores}
            memoryScores={result.memory_scores}
          />
        </div>
      )}

      {/* Two-column: Segments + Brain */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: result.brain_response ? '1fr 320px' : '1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Segment Breakdown */}
        <SegmentBreakdown segments={result.segments} />

        {/* Brain Map */}
        {result.brain_response && <BrainMap brainResponse={result.brain_response} />}
      </div>

      {/* Strengths, Weaknesses, Suggestions */}
      <SuggestionsPanel
        strengths={result.strengths}
        weaknesses={result.weaknesses}
        suggestions={result.suggestions}
      />

      {/* Attention Flow Badge */}
      <div
        style={{
          marginTop: 24,
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'fadeInUp 0.5s ease 700ms both',
        }}
      >
        <span style={{ fontSize: 16 }}>🔄</span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            Attention Pattern
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: result.attention_flow === 'rising' || result.attention_flow === 'u_shaped'
                ? 'var(--status-good)'
                : result.attention_flow === 'flat'
                ? 'var(--status-warn)'
                : 'var(--status-bad)',
            }}
          >
            {result.attention_flow === 'u_shaped' ? 'U-Shaped' :
             result.attention_flow === 'rising' ? 'Rising' :
             result.attention_flow === 'falling' ? 'Declining' : 'Flat'}
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 400,
                color: 'var(--text-muted)',
                marginLeft: 8,
              }}
            >
              {result.attention_flow === 'u_shaped'
                ? '— Peaks at start and end. Optimal for recall.'
                : result.attention_flow === 'rising'
                ? '— Builds momentum. Great for conversion.'
                : result.attention_flow === 'falling'
                ? '— Drops off. Consider restructuring.'
                : '— Consistent. Good for information delivery.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
