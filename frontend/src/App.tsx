import React, { useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CenterPanel } from './components/CenterPanel';
import { CognitiveMetricsPanel } from './components/CognitiveMetricsPanel';
import { ActionPanel } from './components/ActionPanel';
import { RewardStrip } from './components/RewardStrip';
import { GradingModal } from './components/GradingModal';
import { ToastContainer } from './components/ToastContainer';
import { useAppState } from './lib/useAppState';
import { TaskId, ActionType, ActionParams } from './lib/types';
export function App() {
  const {
    state,
    dispatch,
    handleReset,
    handleStep,
    handleGrade,
    handleReorder,
    addToast
  } = useAppState();
  const {
    observation,
    prevObservation,
    stepHistory,
    rewardHistory,
    selectedTask,
    selectedAction,
    actionParams,
    isLoading,
    isDone,
    gradingResult,
    apiConnected,
    showHeatmap,
    showRewardStrip,
    lastReward,
    lastRewardBreakdown,
    changedSegmentIds,
    toasts
  } = state;
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (observation && !isLoading) handleStep();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleReset, handleStep, observation, isLoading]);
  const handleEmphasize = useCallback(
    (id: string) => {
      dispatch({
        type: 'SET_SELECTED_ACTION',
        payload: 'emphasize'
      });
      dispatch({
        type: 'SET_ACTION_PARAMS',
        payload: {
          segmentId: id
        }
      });
      handleStep('emphasize', {
        segmentId: id
      });
    },
    [dispatch, handleStep]
  );
  const handleDeemphasize = useCallback(
    (id: string) => {
      dispatch({
        type: 'SET_SELECTED_ACTION',
        payload: 'de-emphasize'
      });
      dispatch({
        type: 'SET_ACTION_PARAMS',
        payload: {
          segmentId: id
        }
      });
      handleStep('de-emphasize', {
        segmentId: id
      });
    },
    [dispatch, handleStep]
  );
  const handleTryAgain = useCallback(() => {
    handleReset(selectedTask);
  }, [handleReset, selectedTask]);
  const handleTryHarder = useCallback(() => {
    const nextTask = Math.min(3, selectedTask + 1) as TaskId;
    handleReset(nextTask);
  }, [handleReset, selectedTask]);
  const handleCloseGrading = useCallback(() => {
    dispatch({
      type: 'SET_DONE',
      payload: false
    });
    dispatch({
      type: 'SET_GRADING_RESULT',
      payload: null
    });
  }, [dispatch]);
  const segments = observation?.segments ?? [];
  const prevSegments = prevObservation?.segments;
  const step = observation?.step ?? 0;
  const maxSteps = observation?.maxSteps ?? 20;
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)'
      }}>
      
      {/* Main three-column layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0
        }}>
        
        {/* Left sidebar */}
        <Sidebar
          selectedTask={selectedTask}
          onSelectTask={(task) =>
          dispatch({
            type: 'SET_SELECTED_TASK',
            payload: task
          })
          }
          onReset={handleReset}
          step={step}
          maxSteps={maxSteps}
          isDone={isDone}
          isLoading={isLoading}
          apiConnected={apiConnected}
          onGrade={handleGrade} />
        

        {/* Center panel */}
        <CenterPanel
          segments={segments}
          prevSegments={prevSegments}
          changedSegmentIds={changedSegmentIds}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() =>
          dispatch({
            type: 'TOGGLE_HEATMAP'
          })
          }
          onEmphasize={handleEmphasize}
          onDeemphasize={handleDeemphasize}
          onReorder={handleReorder}
          isLoading={isLoading} />
        

        {/* Right panel */}
        <aside
          style={{
            width: 360,
            minWidth: 360,
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
          
          {/* Metrics panel */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 16px 0'
            }}>
            
            {observation ?
            <CognitiveMetricsPanel
              observation={observation}
              prevObservation={prevObservation}
              isLoading={isLoading} /> :


            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 8
              }}>
              
                <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textAlign: 'center'
                }}>
                
                  Cognitive Metrics
                </div>
                <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  maxWidth: 200
                }}>
                
                  Start an episode to see live cognitive metrics
                </div>
              </div>
            }
          </div>

          {/* Action panel */}
          <div
            style={{
              padding: '12px 16px 16px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              flexShrink: 0
            }}>
            
            <ActionPanel
              selectedAction={selectedAction}
              actionParams={actionParams}
              segments={segments}
              isLoading={isLoading}
              onSelectAction={(action) =>
              dispatch({
                type: 'SET_SELECTED_ACTION',
                payload: action
              })
              }
              onUpdateParams={(params) =>
              dispatch({
                type: 'SET_ACTION_PARAMS',
                payload: params
              })
              }
              onApply={() => handleStep()} />
            
          </div>
        </aside>
      </div>

      {/* Reward strip */}
      <RewardStrip
        reward={lastReward}
        breakdown={lastRewardBreakdown}
        rewardHistory={rewardHistory}
        stepHistory={stepHistory}
        isCollapsed={!showRewardStrip}
        onToggle={() =>
        dispatch({
          type: 'TOGGLE_REWARD_STRIP'
        })
        } />
      

      {/* Grading modal */}
      {(isDone || gradingResult) && gradingResult &&
      <GradingModal
        result={gradingResult}
        currentTask={selectedTask}
        onTryAgain={handleTryAgain}
        onTryHarder={handleTryHarder}
        onClose={handleCloseGrading} />

      }

      {/* Toast notifications */}
      <ToastContainer
        toasts={toasts}
        onRemove={(id) =>
        dispatch({
          type: 'REMOVE_TOAST',
          payload: id
        })
        } />
      

      {/* Global CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>);

}