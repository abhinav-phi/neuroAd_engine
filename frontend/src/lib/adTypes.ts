// ──────────────────────────────────────────────
// NeuroAd — Ad Analysis Types
// ──────────────────────────────────────────────

export interface BrainRegion {
  region_name: string;
  activation_level: number;
  hemisphere: string;
  cognitive_function: string;
}

export interface BrainResponseData {
  source: string;
  region_activations: BrainRegion[];
  cortical_attention_map: number[];
  cortical_memory_map: number[];
  cortical_emotion_map: number[];
  cortical_load_map: number[];
}

export interface SegmentAnalysis {
  id: string;
  content: string;
  segment_type: string;
  position: number;
  attention: number;
  memory: number;
  complexity_score: number;
  emotional_intensity: number;
}

export interface Suggestion {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

export interface AnalysisResult {
  engagement_score: number;
  engagement_label: string;
  attention_scores: number[];
  memory_scores: number[];
  cognitive_load: number;
  emotional_valence: number;
  attention_flow: string;
  segments: SegmentAnalysis[];
  strengths: string[];
  weaknesses: string[];
  suggestions: Suggestion[];
  brain_response: BrainResponseData | null;
  simulation_source: string;
}

export type AnalysisPhase =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'results'
  | 'error';

export type InputMode = 'text' | 'image' | 'video';

export interface AnalysisState {
  phase: AnalysisPhase;
  inputMode: InputMode;
  textInput: string;
  selectedFile: File | null;
  filePreviewUrl: string | null;
  result: AnalysisResult | null;
  error: string | null;
  analysisDuration: number | null;
}
