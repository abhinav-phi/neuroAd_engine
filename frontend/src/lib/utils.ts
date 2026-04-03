import { SegmentType } from './types';

export function getMetricColor(value: number): string {
  if (value >= 0.7) return 'var(--status-good)';
  if (value >= 0.4) return 'var(--status-warn)';
  return 'var(--status-bad)';
}

export function getMetricClass(value: number): string {
  if (value >= 0.7) return 'metric-good';
  if (value >= 0.4) return 'metric-warn';
  return 'metric-bad';
}

export function getSegmentTypeColor(type: SegmentType): string {
  const colors: Record<SegmentType, string> = {
    hook: 'var(--accent-cyan)',
    CTA: 'var(--accent-gold)',
    testimonial: 'var(--accent-purple)',
    body: 'var(--status-neutral)'
  };
  return colors[type];
}

export function getSegmentTypeBg(type: SegmentType): string {
  const colors: Record<SegmentType, string> = {
    hook: 'rgba(0,212,255,0.12)',
    CTA: 'rgba(255,184,0,0.12)',
    testimonial: 'rgba(139,92,246,0.12)',
    body: 'rgba(100,116,139,0.12)'
  };
  return colors[type];
}

export function getValenceLabel(valence: number): string {
  if (valence >= 0.6) return 'Strongly Positive';
  if (valence >= 0.2) return 'Mildly Positive';
  if (valence >= -0.2) return 'Neutral';
  if (valence >= -0.6) return 'Mildly Negative';
  return 'Strongly Negative';
}

export function getValenceColor(valence: number): string {
  if (valence >= 0.2) return 'var(--status-good)';
  if (valence >= -0.2) return 'var(--status-warn)';
  return 'var(--status-bad)';
}

export function getAttentionPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    'U-Shaped': 'Attention peaks at start and end — optimal for recall.',
    Rising: 'Attention builds throughout — strong for conversion.',
    Flat: 'Consistent attention — good for information retention.',
    Declining: 'Attention drops off — consider restructuring.'
  };
  return descriptions[pattern] ?? '';
}

export function getAttentionPatternColor(pattern: string): string {
  const colors: Record<string, string> = {
    'U-Shaped': 'var(--status-good)',
    Rising: 'var(--accent-cyan)',
    Flat: 'var(--status-warn)',
    Declining: 'var(--status-bad)'
  };
  return colors[pattern] ?? 'var(--text-secondary)';
}

export function formatDelta(delta: number, decimals = 3): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(decimals)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function useCountUp(target: number, duration = 300): number {
  return target; // Simplified — actual animation handled via CSS
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function getLoadColor(load: number): string {
  if (load < 0.4) return 'var(--status-good)';
  if (load < 0.7) return 'var(--status-warn)';
  return 'var(--status-bad)';
}

export function getScoreColor(score: number): string {
  if (score >= 0.7) return 'var(--status-good)';
  if (score >= 0.4) return 'var(--status-warn)';
  return 'var(--status-bad)';
}

export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    reorder: 'Reorder',
    swap: 'Swap',
    emphasize: 'Emphasize',
    'de-emphasize': 'De-emphasize',
    modify_hook: 'Modify Hook',
    split: 'Split',
    merge: 'Merge',
    set_pacing: 'Set Pacing'
  };
  return labels[action] ?? action;
}