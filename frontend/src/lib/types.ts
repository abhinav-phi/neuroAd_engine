export type SegmentType = 'hook' | 'CTA' | 'testimonial' | 'body';

export interface SegmentMetrics {
  attention: number;
  memory: number;
  load: number;
  valence: number;
}

export interface Segment {
  id: string;
  position: number;
  type: SegmentType;
  content: string;
  metrics: SegmentMetrics;
}

export interface GlobalMetrics {
  engagement: number;
  avgAttention: number;
  avgMemory: number;
  avgLoad: number;
  avgValence: number;
  attentionPattern: 'U-Shaped' | 'Rising' | 'Flat' | 'Declining';
}

export interface Observation {
  segments: Segment[];
  metrics: GlobalMetrics;
  step: number;
  maxSteps: number;
}

export interface RewardBreakdown {
  attentionDelta: number;
  memoryDelta: number;
  loadPenalty: number;
  bonus: number;
}

export interface StepResult {
  observation: Observation;
  reward: number;
  rewardBreakdown: RewardBreakdown;
  done: boolean;
  info: Record<string, unknown>;
}

export interface StepHistoryEntry {
  step: number;
  action: string;
  params: Record<string, unknown>;
  reward: number;
  metrics: GlobalMetrics;
}

export type ActionType =
'reorder' |
'swap' |
'emphasize' |
'de-emphasize' |
'modify_hook' |
'split' |
'merge' |
'set_pacing';

export interface ActionParams {
  segmentA?: string;
  segmentB?: string;
  segmentId?: string;
  hookContent?: string;
  splitPosition?: number;
  pacingValue?: number;
  newOrder?: string[];
}

export interface GradingBreakdown {
  constraintSatisfaction: number;
  engagementQuality: number;
  efficiency: number;
}

export interface GradingResult {
  score: number;
  breakdown: GradingBreakdown;
  feedback: string;
}

export type TaskId = 1 | 2 | 3;

export interface AppState {
  observation: Observation | null;
  prevObservation: Observation | null;
  stepHistory: StepHistoryEntry[];
  rewardHistory: number[];
  selectedTask: TaskId;
  selectedAction: ActionType;
  actionParams: ActionParams;
  isLoading: boolean;
  isDone: boolean;
  gradingResult: GradingResult | null;
  isGrading: boolean;
  apiConnected: boolean;
  showHeatmap: boolean;
  showRewardStrip: boolean;
  lastReward: number | null;
  lastRewardBreakdown: RewardBreakdown | null;
  changedSegmentIds: Set<string>;
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

export type AppAction =
{type: 'SET_LOADING';payload: boolean;} |
{type: 'SET_OBSERVATION';payload: Observation;} |
{type: 'SET_PREV_OBSERVATION';payload: Observation;} |
{type: 'SET_STEP_RESULT';payload: StepResult;} |
{type: 'SET_SELECTED_TASK';payload: TaskId;} |
{type: 'SET_SELECTED_ACTION';payload: ActionType;} |
{type: 'SET_ACTION_PARAMS';payload: ActionParams;} |
{type: 'SET_DONE';payload: boolean;} |
{type: 'SET_GRADING_RESULT';payload: GradingResult | null;} |
{type: 'SET_IS_GRADING';payload: boolean;} |
{type: 'SET_API_CONNECTED';payload: boolean;} |
{type: 'TOGGLE_HEATMAP';} |
{type: 'TOGGLE_REWARD_STRIP';} |
{type: 'RESET_STATE';payload?: {task?: TaskId;};} |
{type: 'REORDER_SEGMENTS';payload: Segment[];} |
{type: 'CLEAR_CHANGED_SEGMENTS';} |
{type: 'ADD_TOAST';payload: Toast;} |
{type: 'REMOVE_TOAST';payload: string;};