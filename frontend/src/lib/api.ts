import {
  Observation,
  StepResult,
  GradingResult,
  ActionType,
  ActionParams,
  RewardBreakdown,
  Segment,
  SegmentType,
  TaskId } from
'./types';
import {
  getMockObservation,
  getMockStepResult,
  getMockGradingResult } from
'./mockData';

// const BASE_URL =
// typeof process !== 'undefined' && process.env?.REACT_APP_API_URL || '';
// const USE_MOCK = !BASE_URL;

const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'https://abhi1haggu-neuroad-engine.hf.space';

const USE_MOCK = false;

type BackendAttentionFlow = 'rising' | 'falling' | 'u_shaped' | 'flat';

interface BackendSegment {
  id: string;
  content: string;
  segment_type: string;
  position: number;
  complexity_score?: number;
}

interface BackendCognitiveMetrics {
  attention_scores: number[];
  memory_retention: number[];
  cognitive_load: number;
  emotional_valence: number;
  engagement_score: number;
  attention_flow: BackendAttentionFlow;
}

interface BackendObservation {
  task_id: string;
  task_description: string;
  segments: BackendSegment[];
  cognitive_metrics: BackendCognitiveMetrics;
  step: number;
  max_steps: number;
  actions_taken: string[];
  constraints: Record<string, unknown>;
}

interface BackendEnvState {
  scenario: {segments: BackendSegment[];};
  cognitive_metrics: BackendCognitiveMetrics;
  step: number;
  max_steps: number;
}

interface BackendRewardInfo {
  attention_delta?: number;
  memory_delta?: number;
  engagement_delta?: number;
  load_penalty?: number;
  repetition_penalty?: number;
  novelty_bonus?: number;
  flow_bonus?: number;
}

interface BackendGradeResult {
  score: number;
  breakdown: Record<string, number>;
  feedback: string;
  task_id?: string;
  steps_taken?: number;
}

interface BackendStepResponse {
  observation: BackendObservation;
  reward: number;
  done: boolean;
  info?: Record<string, unknown>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function mapAttentionPattern(flow: BackendAttentionFlow): Observation['metrics']['attentionPattern'] {
  if (flow === 'rising') return 'Rising';
  if (flow === 'falling') return 'Declining';
  if (flow === 'u_shaped') return 'U-Shaped';
  return 'Flat';
}

function mapSegmentType(segmentType: string): SegmentType {
  if (segmentType === 'hook') return 'hook';
  if (segmentType === 'cta') return 'CTA';
  if (segmentType === 'testimonial') return 'testimonial';
  return 'body';
}

function mapBackendObservation(obs: BackendObservation): Observation {
  const metrics = obs.cognitive_metrics;
  const avgAttention = mean(metrics.attention_scores);
  const avgMemory = mean(metrics.memory_retention);

  const segments: Segment[] = obs.segments.map((seg, i) => ({
    id: seg.id,
    position: i + 1,
    type: mapSegmentType(seg.segment_type),
    content: seg.content,
    metrics: {
      attention: metrics.attention_scores[i] ?? avgAttention,
      memory: metrics.memory_retention[i] ?? avgMemory,
      load: metrics.cognitive_load,
      valence: metrics.emotional_valence
    }
  }));

  return {
    segments,
    metrics: {
      engagement: metrics.engagement_score,
      avgAttention,
      avgMemory,
      avgLoad: metrics.cognitive_load,
      avgValence: metrics.emotional_valence,
      attentionPattern: mapAttentionPattern(metrics.attention_flow)
    },
    step: obs.step,
    maxSteps: obs.max_steps
  };
}

function mapBackendState(state: BackendEnvState): Observation {
  return mapBackendObservation({
    task_id: 'state',
    task_description: '',
    segments: state.scenario.segments,
    cognitive_metrics: state.cognitive_metrics,
    step: state.step,
    max_steps: state.max_steps,
    actions_taken: [],
    constraints: {}
  });
}

function mapRewardBreakdown(info?: BackendRewardInfo): RewardBreakdown {
  if (!info) {
    return { attentionDelta: 0, memoryDelta: 0, loadPenalty: 0, bonus: 0 };
  }

  const bonus =
  (info.engagement_delta ?? 0) +
  (info.novelty_bonus ?? 0) +
  (info.flow_bonus ?? 0) +
  (info.repetition_penalty ?? 0);

  return {
    attentionDelta: info.attention_delta ?? 0,
    memoryDelta: info.memory_delta ?? 0,
    loadPenalty: info.load_penalty ?? 0,
    bonus
  };
}

function mapBackendGrade(result: BackendGradeResult): GradingResult {
  const breakdown = result.breakdown ?? {};
  return {
    score: result.score,
    breakdown: {
      constraintSatisfaction: breakdown.constraints_score ?? breakdown.constraintSatisfaction ?? 0,
      engagementQuality: breakdown.quality_score ?? breakdown.engagementQuality ?? result.score,
      efficiency: breakdown.efficiency_score ?? breakdown.efficiency ?? 0
    },
    feedback: result.feedback
  };
}

function mapTaskId(taskId: TaskId): string {
  if (taskId === 1) return 'task_1_easy';
  if (taskId === 2) return 'task_2_medium';
  return 'task_3_hard';
}

function indexById(segments: Segment[], segmentId: string): number {
  return segments.findIndex((s) => s.id === segmentId);
}

function toBackendAction(action: ActionType, params: ActionParams, currentObs: Observation | null): {
  operation: string;
  params: Record<string, unknown>;
} {
  const segments = currentObs?.segments ?? [];
  const defaultSegmentId = segments[0]?.id;

  if (action === 'reorder') {
    const desired = params.newOrder;
    if (Array.isArray(desired) && desired.length === segments.length) {
      const permutation = desired.map((segmentId) => indexById(segments, segmentId));
      if (permutation.every((idx) => idx >= 0)) {
        return { operation: 'reorder', params: { new_order: permutation } };
      }
    }
    return { operation: 'reorder', params: { new_order: segments.map((_s, i) => i) } };
  }

  if (action === 'swap') {
    const posA = params.segmentA ? indexById(segments, params.segmentA) : 0;
    const posB = params.segmentB ? indexById(segments, params.segmentB) : Math.min(1, segments.length - 1);
    return { operation: 'swap', params: { pos_a: Math.max(0, posA), pos_b: Math.max(0, posB) } };
  }

  if (action === 'emphasize') {
    return { operation: 'emphasize', params: { segment_id: params.segmentId ?? defaultSegmentId } };
  }

  if (action === 'de-emphasize') {
    return { operation: 'de_emphasize', params: { segment_id: params.segmentId ?? defaultSegmentId } };
  }

  if (action === 'modify_hook') {
    const text = (params.hookContent ?? '').toLowerCase();
    let strategy: 'question' | 'statistic' | 'story' | 'bold_claim' = 'bold_claim';
    if (text.includes('?')) strategy = 'question';else
    if (/\d/.test(text)) strategy = 'statistic';else
    if (text.includes('story') || text.includes('journey') || text.includes('once')) strategy = 'story';
    return { operation: 'modify_hook', params: { strategy } };
  }

  if (action === 'split') {
    return { operation: 'split_segment', params: { segment_id: params.segmentId ?? defaultSegmentId } };
  }

  if (action === 'merge') {
    const first = params.segmentA ?? defaultSegmentId;
    const second = params.segmentB ?? segments[1]?.id ?? defaultSegmentId;
    return {
      operation: 'merge_segments',
      params: { segment_ids: [first, second] }
    };
  }

  if (action === 'set_pacing') {
    const value = params.pacingValue ?? 0.5;
    const pacing = value >= 0.67 ? 'fast' : value >= 0.34 ? 'medium' : 'slow';
    return {
      operation: 'set_pacing',
      params: { segment_id: params.segmentId ?? defaultSegmentId, pacing }
    };
  }

  return { operation: 'swap', params: { pos_a: 0, pos_b: Math.min(1, segments.length - 1) } };
}

// Simulate network delay for mock
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let _currentObs: Observation | null = null;

export async function resetEpisode(taskId: TaskId): Promise<Observation> {
  if (USE_MOCK) {
    await delay(600);
    const obs = getMockObservation(taskId);
    _currentObs = obs;
    return obs;
  }
  const result = await apiFetch<{observation: BackendObservation;}>('/reset', {
    method: 'POST',
    body: JSON.stringify({ task_id: mapTaskId(taskId) })
  });
  const observation = mapBackendObservation(result.observation);
  _currentObs = observation;
  return observation;
}

export async function stepEpisode(
action: ActionType,
params: ActionParams)
: Promise<StepResult> {
  if (USE_MOCK) {
    await delay(700);
    if (!_currentObs) throw new Error('No active episode. Please reset first.');
    const result = getMockStepResult(_currentObs, action);
    _currentObs = result.observation;
    return result;
  }
  const backendAction = toBackendAction(action, params, _currentObs);
  const result = await apiFetch<BackendStepResponse>('/step', {
    method: 'POST',
    body: JSON.stringify(backendAction)
  });

  const observation = mapBackendObservation(result.observation);
  const info = result.info ?? {};
  const rewardInfo =
  typeof info.reward_info === 'object' && info.reward_info !== null ?
  info.reward_info as BackendRewardInfo :
  undefined;

  const mapped: StepResult = {
    observation,
    reward: result.reward,
    rewardBreakdown: mapRewardBreakdown(rewardInfo),
    done: result.done,
    info
  };

  _currentObs = observation;
  return mapped;
}

export async function getState(): Promise<Observation> {
  if (USE_MOCK) {
    await delay(300);
    if (!_currentObs) throw new Error('No active episode.');
    return _currentObs;
  }
  const result = await apiFetch<{state?: BackendEnvState;observation?: BackendObservation;}>('/state');
  if (result.state) {
    const obs = mapBackendState(result.state);
    _currentObs = obs;
    return obs;
  }
  if (result.observation) {
    const obs = mapBackendObservation(result.observation);
    _currentObs = obs;
    return obs;
  }
  throw new Error('Invalid /state response shape.');
}

export async function gradeEpisode(): Promise<GradingResult> {
  if (USE_MOCK) {
    await delay(800);
    if (!_currentObs) throw new Error('No active episode.');
    return getMockGradingResult(_currentObs);
  }
  const result = await apiFetch<{grade?: BackendGradeResult;} | BackendGradeResult>('/grade', {
    method: 'POST'
  });
  const grade = 'grade' in result && result.grade ? result.grade : result;
  return mapBackendGrade(grade);
}

export async function checkApiHealth(): Promise<boolean> {
  if (USE_MOCK) return true;
  try {
    await apiFetch('/health');
    return true;
  } catch {
    return false;
  }
}