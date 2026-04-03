import React, { useEffect, useState, useRef } from 'react';
import { RotateCcw, Zap, Brain } from 'lucide-react';
import { TaskId } from '../lib/types';
interface SidebarProps {
  selectedTask: TaskId;
  onSelectTask: (task: TaskId) => void;
  onReset: (task?: TaskId) => void;
  step: number;
  maxSteps: number;
  isDone: boolean;
  isLoading: boolean;
  apiConnected: boolean;
  onGrade: () => void;
}
const TASKS = [
{
  id: 1 as TaskId,
  label: 'Task 1',
  subtitle: 'Easy',
  badge: 'Easy',
  color: 'var(--status-good)',
  segments: 5
},
{
  id: 2 as TaskId,
  label: 'Task 2',
  subtitle: 'Medium',
  badge: 'Medium',
  color: 'var(--status-warn)',
  segments: 6
},
{
  id: 3 as TaskId,
  label: 'Task 3',
  subtitle: 'Hard',
  badge: 'Hard',
  color: 'var(--status-bad)',
  segments: 7
}];

function StepCounter({ step, maxSteps }: {step: number;maxSteps: number;}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = maxSteps > 0 ? step / maxSteps : 0;
  const offset = circumference * (1 - progress);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
      }}>
      
      <div
        style={{
          position: 'relative',
          width: 96,
          height: 96
        }}>
        
        <svg
          width="96"
          height="96"
          style={{
            transform: 'rotate(-90deg)'
          }}>
          
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="3" />
          
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="var(--accent-cyan)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 500ms cubic-bezier(0.4,0,0.2,1)'
            }} />
          
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              lineHeight: 1
            }}>
            
            {String(step).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 2
            }}>
            
            / {maxSteps}
          </span>
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
        
        Step Counter
      </span>
    </div>);

}
export function Sidebar({
  selectedTask,
  onSelectTask,
  onReset,
  step,
  maxSteps,
  isDone,
  isLoading,
  apiConnected,
  onGrade
}: SidebarProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const handleTaskClick = (taskId: TaskId) => {
    if (step > 0 && !isDone) {
      setShowResetConfirm(true);
      onSelectTask(taskId);
    } else {
      onSelectTask(taskId);
      onReset(taskId);
    }
  };
  const handleResetClick = () => {
    if (step > 0 && !isDone) {
      setShowResetConfirm(true);
    } else {
      onReset();
    }
  };
  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
      
      {/* Logo */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
          
          <div
            style={{
              width: 32,
              height: 32,
              background: 'rgba(0,212,255,0.12)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0,212,255,0.2)'
            }}>
            
            <BrainWaveIcon />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                letterSpacing: '-0.02em'
              }}>
              
              CogniFlow
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em'
              }}>
              
              AD TESTING ENV
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px'
        }}>
        
        {/* Task Selector */}
        <div
          style={{
            marginBottom: 4
          }}>
          
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8,
              paddingLeft: 4
            }}>
            
            Select Task
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
            
            {TASKS.map((task) => {
              const isActive = selectedTask === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: isActive ?
                    'rgba(0,212,255,0.06)' :
                    'transparent',
                    border: '1px solid',
                    borderColor: isActive ?
                    'rgba(0,212,255,0.2)' :
                    'var(--border-subtle)',
                    borderLeft: `3px solid ${isActive ? 'var(--accent-cyan)' : 'transparent'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: isActive ? 'var(--shadow-glow-cyan)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                  
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: isActive ?
                        'var(--text-primary)' :
                        'var(--text-secondary)'
                      }}>
                      
                      {task.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 1
                      }}>
                      
                      {task.segments} segments
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 600,
                      color: task.color,
                      background: `${task.color}18`,
                      border: `1px solid ${task.color}33`,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-pill)',
                      letterSpacing: '0.05em'
                    }}>
                    
                    {task.badge}
                  </span>
                </button>);

            })}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--border-subtle)',
            margin: '16px 0'
          }} />
        

        {/* Reset Button */}
        <button
          onClick={handleResetClick}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,77,106,0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-bad)',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,77,106,0.08)';
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
            'transparent';
          }}>
          
          <RotateCcw size={12} />
          Reset Episode
        </button>

        {/* Grade button */}
        {step > 0 &&
        <button
          onClick={onGrade}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '9px 12px',
            marginTop: 6,
            background: 'rgba(255,184,0,0.08)',
            border: '1px solid rgba(255,184,0,0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-gold)',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all var(--transition-fast)'
          }}>
          
            <Zap size={12} />
            Grade Episode
          </button>
        }

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--border-subtle)',
            margin: '16px 0'
          }} />
        

        {/* Step Counter */}
        <StepCounter step={step} maxSteps={maxSteps} />

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--border-subtle)',
            margin: '16px 0'
          }} />
        

        {/* Episode Status */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}>
          
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
            
            Episode Status
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: isDone ?
              'var(--accent-gold)' :
              step > 0 ?
              'var(--accent-cyan)' :
              'var(--text-muted)',
              background: isDone ?
              'var(--accent-gold-dim)' :
              step > 0 ?
              'var(--accent-cyan-dim)' :
              'rgba(61,81,102,0.2)',
              border: `1px solid ${isDone ? 'rgba(255,184,0,0.3)' : step > 0 ? 'rgba(0,212,255,0.3)' : 'var(--border-subtle)'}`,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              letterSpacing: '0.05em'
            }}>
            
            {isDone ? 'Complete' : step > 0 ? 'In Progress' : 'Not Started'}
          </span>
        </div>
      </div>

      {/* API Status */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
        
        <div
          style={{
            position: 'relative',
            width: 8,
            height: 8
          }}>
          
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: apiConnected ?
              'var(--status-good)' :
              'var(--status-bad)'
            }} />
          
          {apiConnected &&
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--status-good)',
              animation: 'dotPulse 1.5s ease-in-out infinite'
            }} />

          }
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: apiConnected ? 'var(--status-good)' : 'var(--status-bad)'
          }}>
          
          {apiConnected ? 'Connected' : 'Disconnected'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            marginLeft: 'auto'
          }}>
          
          {process.env.REACT_APP_API_URL ? 'API' : 'Mock'}
        </span>
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm &&
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(8,12,20,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setShowResetConfirm(false)}>
        
          <div
          className="glass-card"
          style={{
            padding: 24,
            width: 280,
            animation: 'scaleIn 200ms ease forwards'
          }}
          onClick={(e) => e.stopPropagation()}>
          
            <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8
            }}>
            
              Reset Episode?
            </div>
            <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 20
            }}>
            
              This will clear all progress for the current episode.
            </div>
            <div
            style={{
              display: 'flex',
              gap: 8
            }}>
            
              <button
              onClick={() => setShowResetConfirm(false)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                cursor: 'pointer'
              }}>
              
                Cancel
              </button>
              <button
              onClick={() => {
                setShowResetConfirm(false);
                onReset();
              }}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'rgba(255,77,106,0.15)',
                border: '1px solid rgba(255,77,106,0.4)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--status-bad)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}>
              
                Reset
              </button>
            </div>
          </div>
        </div>
      }
    </aside>);

}
function BrainWaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1 9 Q3 5 5 9 Q7 13 9 9 Q11 5 13 9 Q15 13 17 9"
        stroke="var(--accent-cyan)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none" />
      
    </svg>);

}