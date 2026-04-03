import { useReducer, useCallback, useRef } from 'react';
import {
  AppState,
  AppAction,
  ActionType,
  ActionParams,
  TaskId,
  Observation } from
'./types';
import { resetEpisode, stepEpisode, gradeEpisode } from './api';

const initialState: AppState = {
  observation: null,
  prevObservation: null,
  stepHistory: [],
  rewardHistory: [],
  selectedTask: 1,
  selectedAction: 'emphasize',
  actionParams: {},
  isLoading: false,
  isDone: false,
  gradingResult: null,
  isGrading: false,
  apiConnected: true,
  showHeatmap: false,
  showRewardStrip: true,
  lastReward: null,
  lastRewardBreakdown: null,
  changedSegmentIds: new Set(),
  toasts: []
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_OBSERVATION':
      return { ...state, observation: action.payload };

    case 'SET_PREV_OBSERVATION':
      return { ...state, prevObservation: action.payload };

    case 'SET_STEP_RESULT':{
        const result = action.payload;
        const changedIds = new Set<string>();
        if (state.observation) {
          result.observation.segments.forEach((newSeg) => {
            const oldSeg = state.observation!.segments.find(
              (s) => s.id === newSeg.id
            );
            if (oldSeg) {
              const changed =
              Math.abs(newSeg.metrics.attention - oldSeg.metrics.attention) >
              0.005 ||
              Math.abs(newSeg.metrics.memory - oldSeg.metrics.memory) > 0.005 ||
              Math.abs(newSeg.metrics.load - oldSeg.metrics.load) > 0.005 ||
              Math.abs(newSeg.metrics.valence - oldSeg.metrics.valence) > 0.005;
              if (changed) changedIds.add(newSeg.id);
            }
          });
        }
        return {
          ...state,
          prevObservation: state.observation,
          observation: result.observation,
          lastReward: result.reward,
          lastRewardBreakdown: result.rewardBreakdown,
          rewardHistory: [...state.rewardHistory, result.reward],
          isDone: result.done,
          changedSegmentIds: changedIds,
          stepHistory: [
          {
            step: result.observation.step,
            action: state.selectedAction,
            params: state.actionParams,
            reward: result.reward,
            metrics: result.observation.metrics
          },
          ...state.stepHistory]

        };
      }

    case 'SET_SELECTED_TASK':
      return { ...state, selectedTask: action.payload };

    case 'SET_SELECTED_ACTION':
      return { ...state, selectedAction: action.payload, actionParams: {} };

    case 'SET_ACTION_PARAMS':
      return {
        ...state,
        actionParams: { ...state.actionParams, ...action.payload }
      };

    case 'SET_DONE':
      return { ...state, isDone: action.payload };

    case 'SET_GRADING_RESULT':
      return { ...state, gradingResult: action.payload, isGrading: false };

    case 'SET_IS_GRADING':
      return { ...state, isGrading: action.payload };

    case 'SET_API_CONNECTED':
      return { ...state, apiConnected: action.payload };

    case 'TOGGLE_HEATMAP':
      return { ...state, showHeatmap: !state.showHeatmap };

    case 'TOGGLE_REWARD_STRIP':
      return { ...state, showRewardStrip: !state.showRewardStrip };

    case 'RESET_STATE':
      return {
        ...initialState,
        selectedTask: action.payload?.task ?? state.selectedTask,
        apiConnected: state.apiConnected
      };

    case 'REORDER_SEGMENTS':{
        if (!state.observation) return state;
        return {
          ...state,
          observation: {
            ...state.observation,
            segments: action.payload
          }
        };
      }

    case 'CLEAR_CHANGED_SEGMENTS':
      return { ...state, changedSegmentIds: new Set() };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload)
      };

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const clearChangedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback(
    (type: 'success' | 'error' | 'warning', message: string) => {
      const id = Math.random().toString(36).slice(2);
      dispatch({ type: 'ADD_TOAST', payload: { id, type, message } });
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
    },
    []
  );

  const handleReset = useCallback(
    async (taskId?: TaskId) => {
      const task = taskId ?? state.selectedTask;
      dispatch({ type: 'RESET_STATE', payload: { task } });
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const obs = await resetEpisode(task);
        dispatch({ type: 'SET_OBSERVATION', payload: obs });
        addToast('success', `Task ${task} episode started`);
      } catch (err) {
        addToast('error', `Reset failed: ${(err as Error).message}`);
        dispatch({ type: 'SET_API_CONNECTED', payload: false });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.selectedTask, addToast]
  );

  const handleStep = useCallback(
    async (action?: ActionType, params?: ActionParams) => {
      const a = action ?? state.selectedAction;
      const p = params ?? state.actionParams;
      if (!state.observation) {
        addToast('error', 'No active episode. Please reset first.');
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const result = await stepEpisode(a, p);
        dispatch({ type: 'SET_STEP_RESULT', payload: result });
        if (result.done) {
          addToast('success', 'Episode complete! Grading...');
          // Auto-grade
          dispatch({ type: 'SET_IS_GRADING', payload: true });
          const grade = await gradeEpisode();
          dispatch({ type: 'SET_GRADING_RESULT', payload: grade });
        } else {
          addToast(
            result.reward > 0 ? 'success' : 'warning',
            `Step ${result.observation.step}: reward ${result.reward > 0 ? '+' : ''}${result.reward.toFixed(3)}`
          );
        }
        // Clear changed highlights after 3s
        if (clearChangedTimer.current) clearTimeout(clearChangedTimer.current);
        clearChangedTimer.current = setTimeout(() => {
          dispatch({ type: 'CLEAR_CHANGED_SEGMENTS' });
        }, 3000);
      } catch (err) {
        addToast('error', `Step failed: ${(err as Error).message}`);
        dispatch({ type: 'SET_API_CONNECTED', payload: false });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.selectedAction, state.actionParams, state.observation, addToast]
  );

  const handleGrade = useCallback(async () => {
    dispatch({ type: 'SET_IS_GRADING', payload: true });
    try {
      const grade = await gradeEpisode();
      dispatch({ type: 'SET_GRADING_RESULT', payload: grade });
      dispatch({ type: 'SET_DONE', payload: true });
    } catch (err) {
      addToast('error', `Grading failed: ${(err as Error).message}`);
    } finally {
      dispatch({ type: 'SET_IS_GRADING', payload: false });
    }
  }, [addToast]);

  const handleReorder = useCallback(
    async (newSegments: Observation['segments']) => {
      dispatch({ type: 'REORDER_SEGMENTS', payload: newSegments });
      // Auto-step with reorder action
      if (state.observation) {
        const newOrder = newSegments.map((s) => s.id);
        await handleStep('reorder', { newOrder });
      }
    },
    [state.observation, handleStep]
  );

  return {
    state,
    dispatch,
    handleReset,
    handleStep,
    handleGrade,
    handleReorder,
    addToast
  };
}