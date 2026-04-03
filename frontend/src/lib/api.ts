import {
  Observation,
  StepResult,
  GradingResult,
  ActionType,
  ActionParams,
  TaskId } from
'./types';
import {
  getMockObservation,
  getMockStepResult,
  getMockGradingResult } from
'./mockData';

const BASE_URL =
typeof process !== 'undefined' && process.env?.REACT_APP_API_URL || '';
const USE_MOCK = !BASE_URL;

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
  const result = await apiFetch<{observation: Observation;}>('/reset', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId })
  });
  _currentObs = result.observation;
  return result.observation;
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
  const result = await apiFetch<StepResult>('/step', {
    method: 'POST',
    body: JSON.stringify({ action, params })
  });
  _currentObs = result.observation;
  return result;
}

export async function getState(): Promise<Observation> {
  if (USE_MOCK) {
    await delay(300);
    if (!_currentObs) throw new Error('No active episode.');
    return _currentObs;
  }
  return apiFetch<Observation>('/state');
}

export async function gradeEpisode(): Promise<GradingResult> {
  if (USE_MOCK) {
    await delay(800);
    if (!_currentObs) throw new Error('No active episode.');
    return getMockGradingResult(_currentObs);
  }
  return apiFetch<GradingResult>('/grade', { method: 'POST' });
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