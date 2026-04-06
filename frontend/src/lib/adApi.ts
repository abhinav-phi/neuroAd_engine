// ──────────────────────────────────────────────
// NeuroAd — Ad Analysis API Client
// ──────────────────────────────────────────────

import type { AnalysisResult } from './adTypes';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:7860').replace(/\/+$/, '');

/** Max time (ms) to wait for any single API call before aborting */
const API_TIMEOUT_MS = 30_000;

/**
 * Wrapper around fetch() that automatically aborts after `timeoutMs`.
 * Prevents the UI from getting stuck on "Analyzing…" forever.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Analysis timed out. The server may be starting up — please wait a moment and try again.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp11(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function getEngagementLabel(score: number): string {
  const pct = score * 100;
  if (pct >= 80) return 'High Performing';
  if (pct >= 50) return 'Moderate';
  return 'Needs Improvement';
}

// ── Fallback insight generators (client-side) ────────────────────────

function generateFallbackStrengths(result: AnalysisResult): string[] {
  const strengths: string[] = [];
  const avgAtt = result.attention_scores.length
    ? result.attention_scores.reduce((a, b) => a + b, 0) / result.attention_scores.length
    : 0;
  const avgMem = result.memory_scores.length
    ? result.memory_scores.reduce((a, b) => a + b, 0) / result.memory_scores.length
    : 0;

  if (result.engagement_score >= 0.7)
    strengths.push('Strong overall engagement — your ad is likely to capture and retain audience interest.');
  if (avgAtt >= 0.6)
    strengths.push('High attention scores — your content effectively grabs viewer focus.');
  if (avgMem >= 0.55)
    strengths.push('Good memory retention — key messages are likely to be remembered.');
  if (result.cognitive_load < 0.45)
    strengths.push('Low cognitive load — your message is easy to process and understand.');
  if (result.emotional_valence > 0.2)
    strengths.push('Positive emotional resonance — your ad evokes favorable feelings.');

  if (!strengths.length) strengths.push('Your ad has a solid foundation to build upon.');
  return strengths;
}

function generateFallbackWeaknesses(result: AnalysisResult): string[] {
  const weaknesses: string[] = [];
  const avgAtt = result.attention_scores.length
    ? result.attention_scores.reduce((a, b) => a + b, 0) / result.attention_scores.length
    : 0;

  if (result.engagement_score < 0.5)
    weaknesses.push('Overall engagement is below average — the ad may fail to hold viewer interest.');
  if (avgAtt < 0.45)
    weaknesses.push('Low attention scores — viewers may scroll past without engaging.');
  if (result.cognitive_load > 0.65)
    weaknesses.push('High cognitive load — the content is too complex for quick comprehension.');
  if (result.emotional_valence < -0.2)
    weaknesses.push('Negative emotional response — the ad may create unfavorable associations.');

  return weaknesses;
}

function generateFallbackSuggestions(result: AnalysisResult): AnalysisResult['suggestions'] {
  const suggestions: AnalysisResult['suggestions'] = [];
  const avgAtt = result.attention_scores.length
    ? result.attention_scores.reduce((a, b) => a + b, 0) / result.attention_scores.length
    : 0;

  if (avgAtt < 0.55)
    suggestions.push({
      title: 'Strengthen Your Hook',
      description: 'Open with a provocative question, surprising statistic, or bold claim.',
      impact: 'high',
      category: 'attention',
    });
  if (result.cognitive_load > 0.55)
    suggestions.push({
      title: 'Simplify Your Message',
      description: 'Break complex ideas into shorter sentences. Remove jargon.',
      impact: 'high',
      category: 'clarity',
    });
  if (result.engagement_score < 0.75)
    suggestions.push({
      title: 'Add CTA Urgency',
      description: "Use time-sensitive language like 'Limited time' or 'Act now' to drive action.",
      impact: 'medium',
      category: 'conversion',
    });

  if (!suggestions.length)
    suggestions.push({
      title: 'A/B Test Variations',
      description: 'Your ad performs well! Try testing small variations to find the optimal version.',
      impact: 'low',
      category: 'optimization',
    });

  return suggestions;
}

// ── Normalize any response to AnalysisResult ─────────────────────────

function normalizeToAnalysisResult(data: any): AnalysisResult {
  const engagement = clamp01(data.engagement_score ?? data.score ?? data.metrics?.engagement_score ?? data.metrics?.engagement ?? 0);
  let attentionScores: number[] = data.attention_scores ?? data.metrics?.attention_scores ?? [];
  let memoryScores: number[] = data.memory_scores ?? data.metrics?.memory_retention ?? [];
  const cognitiveLoad = clamp01(data.cognitive_load ?? data.metrics?.cognitive_load ?? 0.5);
  const emotionalValence = clamp11(data.emotional_valence ?? data.metrics?.emotional_valence ?? 0);
  const attentionFlow = data.attention_flow ?? data.metrics?.attention_flow ?? 'flat';

  // Client-side fallback for arrays if backend video/image analysis didn't return them
  if (attentionScores.length === 0) {
    attentionScores = [0.4, 0.6, 0.8, 0.7, 0.5];
    memoryScores = [0.3, 0.5, 0.7, 0.6, 0.4];
  }

  // Build segments from response or synthesize
  let segments = data.segments ?? [];
  if (!segments.length) {
    segments = attentionScores.map((att: number, i: number) => ({
      id: `seg_${i}`,
      content: `Extracted visual/audio context segment ${i + 1}`,
      segment_type: i === 0 ? 'hook' : i === attentionScores.length - 1 ? 'cta' : 'feature',
      position: i,
      attention: att,
      memory: memoryScores[i] ?? 0.5,
      complexity_score: cognitiveLoad,
      emotional_intensity: Math.abs(emotionalValence),
    }));
  }

  const result: AnalysisResult = {
    engagement_score: engagement,
    engagement_label: data.engagement_label ?? getEngagementLabel(engagement),
    attention_scores: attentionScores.map(clamp01),
    memory_scores: memoryScores.map(clamp01),
    cognitive_load: cognitiveLoad,
    emotional_valence: emotionalValence,
    attention_flow: attentionFlow,
    segments,
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    suggestions: data.suggestions ?? [],
    brain_response: data.brain_response ?? data.metrics?.brain_response ?? null,
    simulation_source: data.simulation_source ?? 'parametric',
  };

  // Client-side fallback for missing insights
  if (!result.strengths.length) result.strengths = generateFallbackStrengths(result);
  if (!result.weaknesses.length) result.weaknesses = generateFallbackWeaknesses(result);
  if (!result.suggestions.length) result.suggestions = generateFallbackSuggestions(result);

  return result;
}

// ── API functions ────────────────────────────────────────────────────

export async function analyzeAdText(text: string): Promise<AnalysisResult> {
  const res = await fetchWithTimeout(`${BASE_URL}/analyze_ad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Analysis failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return normalizeToAnalysisResult(data);
}

export async function analyzeAdImage(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithTimeout(`${BASE_URL}/tribe_predict_image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Image analysis failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return normalizeToAnalysisResult(data);
}

export async function analyzeAdVideo(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Video analysis gets a longer timeout since video uploads are larger
  const res = await fetchWithTimeout(`${BASE_URL}/analyze-video`, {
    method: 'POST',
    body: formData,
  }, 45_000);
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Video analysis failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return normalizeToAnalysisResult(data);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/health`, {}, 5_000);
    return res.ok;
  } catch {
    return false;
  }
}
