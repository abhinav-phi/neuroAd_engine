import {
  Observation,
  GradingResult,
  StepResult,
  RewardBreakdown } from
'./types';

export const MOCK_SEGMENTS_TASK1 = [
{
  id: 's1',
  position: 1,
  type: 'hook' as const,
  content:
  "Struggling to focus in a world of endless distractions? You're not alone — and there's a science-backed solution.",
  metrics: { attention: 0.82, memory: 0.74, load: 0.35, valence: 0.6 }
},
{
  id: 's2',
  position: 2,
  type: 'body' as const,
  content:
  'Cognitive overload affects 73% of knowledge workers daily. Our platform uses neurofeedback to identify your peak focus windows.',
  metrics: { attention: 0.61, memory: 0.58, load: 0.52, valence: 0.2 }
},
{
  id: 's3',
  position: 3,
  type: 'testimonial' as const,
  content:
  '"After 30 days, my deep work sessions increased by 2.4x. I can\'t imagine going back." — Sarah K., Product Lead',
  metrics: { attention: 0.71, memory: 0.79, load: 0.28, valence: 0.75 }
},
{
  id: 's4',
  position: 4,
  type: 'body' as const,
  content:
  'Our adaptive algorithm learns your cognitive rhythms and surfaces the right content at the right moment — no willpower required.',
  metrics: { attention: 0.55, memory: 0.62, load: 0.61, valence: 0.3 }
},
{
  id: 's5',
  position: 5,
  type: 'CTA' as const,
  content:
  'Start your free 14-day trial today. No credit card required. Join 12,000+ professionals already optimizing their minds.',
  metrics: { attention: 0.78, memory: 0.71, load: 0.4, valence: 0.65 }
}];


export const MOCK_SEGMENTS_TASK2 = [
{
  id: 's1',
  position: 1,
  type: 'hook' as const,
  content:
  'What if your ad could read minds? With CogniFlow, it practically does.',
  metrics: { attention: 0.75, memory: 0.68, load: 0.3, valence: 0.55 }
},
{
  id: 's2',
  position: 2,
  type: 'body' as const,
  content:
  'Traditional A/B testing takes weeks. Cognitive simulation gives you answers in minutes by modeling real neural response patterns.',
  metrics: { attention: 0.58, memory: 0.65, load: 0.58, valence: 0.25 }
},
{
  id: 's3',
  position: 3,
  type: 'body' as const,
  content:
  'Our proprietary attention model is trained on 2.3M ad exposures with validated EEG data from 8,000 participants.',
  metrics: { attention: 0.52, memory: 0.71, load: 0.65, valence: 0.15 }
},
{
  id: 's4',
  position: 4,
  type: 'testimonial' as const,
  content:
  '"We cut our testing cycle from 6 weeks to 3 days and saw a 34% lift in conversion." — Marcus T., CMO',
  metrics: { attention: 0.69, memory: 0.77, load: 0.32, valence: 0.7 }
},
{
  id: 's5',
  position: 5,
  type: 'body' as const,
  content:
  'Integrate with your existing creative workflow. Supports all major ad formats: video, display, native, and social.',
  metrics: { attention: 0.48, memory: 0.55, load: 0.7, valence: 0.1 }
},
{
  id: 's6',
  position: 6,
  type: 'CTA' as const,
  content:
  'Request a demo and see your first cognitive report in under 24 hours.',
  metrics: { attention: 0.72, memory: 0.66, load: 0.38, valence: 0.6 }
}];


export const MOCK_SEGMENTS_TASK3 = [
{
  id: 's1',
  position: 1,
  type: 'hook' as const,
  content:
  'The human brain processes 11 million bits per second. Your ad gets 0.3 seconds. Make them count.',
  metrics: { attention: 0.88, memory: 0.81, load: 0.42, valence: 0.5 }
},
{
  id: 's2',
  position: 2,
  type: 'body' as const,
  content:
  "Priming effects, cognitive fluency, and emotional valence — three levers most advertisers ignore. We don't.",
  metrics: { attention: 0.65, memory: 0.72, load: 0.68, valence: 0.3 }
},
{
  id: 's3',
  position: 3,
  type: 'body' as const,
  content:
  'Our dual-process optimization engine targets both System 1 (intuitive) and System 2 (deliberate) cognitive pathways simultaneously.',
  metrics: { attention: 0.51, memory: 0.63, load: 0.78, valence: 0.1 }
},
{
  id: 's4',
  position: 4,
  type: 'testimonial' as const,
  content:
  '"The cognitive load reduction alone saved us $2.1M in creative iterations last quarter." — Dr. Priya S., VP Research',
  metrics: { attention: 0.74, memory: 0.82, load: 0.25, valence: 0.8 }
},
{
  id: 's5',
  position: 5,
  type: 'body' as const,
  content:
  'Real-time biometric validation. Predictive recall scoring. Emotional arc mapping. All in one platform.',
  metrics: { attention: 0.6, memory: 0.68, load: 0.62, valence: 0.35 }
},
{
  id: 's6',
  position: 6,
  type: 'body' as const,
  content:
  'Enterprise-grade security with SOC 2 Type II compliance. Your creative IP stays yours, always.',
  metrics: { attention: 0.44, memory: 0.58, load: 0.55, valence: 0.2 }
},
{
  id: 's7',
  position: 7,
  type: 'CTA' as const,
  content:
  "Schedule a cognitive audit of your top 3 performing ads. Discover what's working — and what's costing you.",
  metrics: { attention: 0.79, memory: 0.73, load: 0.44, valence: 0.65 }
}];


function computeGlobalMetrics(segments: typeof MOCK_SEGMENTS_TASK1): {
  engagement: number;
  avgAttention: number;
  avgMemory: number;
  avgLoad: number;
  avgValence: number;
  attentionPattern: 'U-Shaped' | 'Rising' | 'Flat' | 'Declining';
} {
  const n = segments.length;
  const avgAttention =
  segments.reduce((s, seg) => s + seg.metrics.attention, 0) / n;
  const avgMemory = segments.reduce((s, seg) => s + seg.metrics.memory, 0) / n;
  const avgLoad = segments.reduce((s, seg) => s + seg.metrics.load, 0) / n;
  const avgValence = segments.reduce((s, seg) => s + seg.metrics.valence, 0) / n;
  const engagement =
  avgAttention * 0.4 +
  avgMemory * 0.3 +
  (1 - avgLoad) * 0.15 +
  (avgValence + 1) / 2 * 0.15;

  const attentions = segments.map((s) => s.metrics.attention);
  const first = attentions[0];
  const last = attentions[attentions.length - 1];
  const mid = attentions[Math.floor(attentions.length / 2)];
  let attentionPattern: 'U-Shaped' | 'Rising' | 'Flat' | 'Declining' = 'Flat';
  if (first > mid && last > mid) attentionPattern = 'U-Shaped';else
  if (last > first + 0.1) attentionPattern = 'Rising';else
  if (first > last + 0.1) attentionPattern = 'Declining';

  return {
    engagement,
    avgAttention,
    avgMemory,
    avgLoad,
    avgValence,
    attentionPattern
  };
}

export function getMockObservation(taskId: 1 | 2 | 3): Observation {
  const segMap = {
    1: MOCK_SEGMENTS_TASK1,
    2: MOCK_SEGMENTS_TASK2,
    3: MOCK_SEGMENTS_TASK3
  };
  const segments = segMap[taskId];
  const metrics = computeGlobalMetrics(segments);
  return { segments, metrics, step: 0, maxSteps: 20 };
}

export function getMockStepResult(
currentObs: Observation,
action: string)
: StepResult {
  const jitter = () => (Math.random() - 0.45) * 0.12;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const newSegments = currentObs.segments.map((seg) => ({
    ...seg,
    metrics: {
      attention: clamp(seg.metrics.attention + jitter()),
      memory: clamp(seg.metrics.memory + jitter()),
      load: clamp(seg.metrics.load + jitter()),
      valence: Math.max(-1, Math.min(1, seg.metrics.valence + jitter()))
    }
  }));

  // Apply action-specific improvements
  if (action === 'emphasize') {
    const idx = Math.floor(Math.random() * newSegments.length);
    newSegments[idx].metrics.attention = clamp(
      newSegments[idx].metrics.attention + 0.08
    );
    newSegments[idx].metrics.memory = clamp(
      newSegments[idx].metrics.memory + 0.05
    );
  } else if (action === 'de-emphasize') {
    const idx = Math.floor(Math.random() * newSegments.length);
    newSegments[idx].metrics.load = clamp(newSegments[idx].metrics.load - 0.1);
  } else if (action === 'modify_hook') {
    newSegments[0].metrics.attention = clamp(
      newSegments[0].metrics.attention + 0.1
    );
    newSegments[0].metrics.valence = Math.min(
      1,
      newSegments[0].metrics.valence + 0.08
    );
  } else if (action === 'set_pacing') {
    newSegments.forEach((s) => {
      s.metrics.load = clamp(s.metrics.load - 0.05);
    });
  }

  const newMetrics = computeGlobalMetrics(newSegments);
  const oldMetrics = currentObs.metrics;

  const attentionDelta = newMetrics.avgAttention - oldMetrics.avgAttention;
  const memoryDelta = newMetrics.avgMemory - oldMetrics.avgMemory;
  const loadPenalty = -(newMetrics.avgLoad - oldMetrics.avgLoad) * 0.5;
  const bonus = newMetrics.engagement > oldMetrics.engagement ? 0.05 : 0;
  const reward = attentionDelta * 0.4 + memoryDelta * 0.3 + loadPenalty + bonus;

  const newStep = currentObs.step + 1;
  const done = newStep >= currentObs.maxSteps;

  return {
    observation: {
      segments: newSegments,
      metrics: newMetrics,
      step: newStep,
      maxSteps: currentObs.maxSteps
    },
    reward,
    rewardBreakdown: { attentionDelta, memoryDelta, loadPenalty, bonus },
    done,
    info: {}
  };
}

export function getMockGradingResult(obs: Observation): GradingResult {
  const constraintSatisfaction = Math.min(1, obs.metrics.engagement * 1.1);
  const engagementQuality = obs.metrics.engagement;
  const efficiency = Math.max(0.3, 1 - obs.step / obs.maxSteps * 0.5);
  const score =
  constraintSatisfaction * 0.3 + engagementQuality * 0.4 + efficiency * 0.3;

  const feedbacks = [
  'Strong attention shaping with effective U-shaped flow. Memory retention improved significantly over baseline. Consider reducing cognitive load in middle segments for further gains.',
  'Good engagement trajectory with rising attention pattern. Testimonial placement is effective. Optimize the hook segment for stronger initial impact.',
  'Solid performance with balanced metrics. The CTA placement drives strong recall. Focus on valence improvement in body segments to boost emotional resonance.'];


  return {
    score,
    breakdown: { constraintSatisfaction, engagementQuality, efficiency },
    feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)]
  };
}