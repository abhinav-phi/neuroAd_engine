import React from 'react';
import { Loader2 } from 'lucide-react';
import { ActionType, ActionParams, Segment } from '../lib/types';
import { actionLabel } from '../lib/utils';
const ACTION_TYPES: ActionType[] = [
'reorder',
'swap',
'emphasize',
'de-emphasize',
'modify_hook',
'split',
'merge',
'set_pacing'];

interface ActionPanelProps {
  selectedAction: ActionType;
  actionParams: ActionParams;
  segments: Segment[];
  isLoading: boolean;
  onSelectAction: (action: ActionType) => void;
  onUpdateParams: (params: ActionParams) => void;
  onApply: () => void;
  errorMessage?: string;
}
function SegmentSelect({
  label,
  value,
  onChange,
  segments





}: {label: string;value: string;onChange: (v: string) => void;segments: Segment[];}) {
  return (
    <div
      style={{
        marginBottom: 10
      }}>
      
      <label
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          display: 'block',
          marginBottom: 4,
          letterSpacing: '0.06em'
        }}>
        
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '7px 10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          cursor: 'pointer',
          outline: 'none'
        }}>
        
        <option value="">Select segment...</option>
        {segments.map((s, i) =>
        <option key={s.id} value={s.id}>
            S{i + 1} — {s.type} ({s.content.slice(0, 30)}...)
          </option>
        )}
      </select>
    </div>);

}
function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01







}: {label: string;value: number;onChange: (v: number) => void;min?: number;max?: number;step?: number;}) {
  return (
    <div
      style={{
        marginBottom: 10
      }}>
      
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4
        }}>
        
        <label
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em'
          }}>
          
          {label}
        </label>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent-cyan)'
          }}>
          
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent-cyan)',
          cursor: 'pointer',
          height: 4
        }} />
      
    </div>);

}
function ActionContextInputs({
  action,
  params,
  segments,
  onUpdate





}: {action: ActionType;params: ActionParams;segments: Segment[];onUpdate: (p: ActionParams) => void;}) {
  switch (action) {
    case 'reorder':
      return (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--text-secondary)'
          }}>
          
          Drag segment cards in the workspace to reorder. The action will apply
          automatically on drop.
        </div>);

    case 'swap':
      return (
        <>
          <SegmentSelect
            label="Segment A"
            value={params.segmentA ?? ''}
            onChange={(v) =>
            onUpdate({
              segmentA: v
            })
            }
            segments={segments} />
          
          <SegmentSelect
            label="Segment B"
            value={params.segmentB ?? ''}
            onChange={(v) =>
            onUpdate({
              segmentB: v
            })
            }
            segments={segments} />
          
        </>);

    case 'emphasize':
    case 'de-emphasize':
      return (
        <SegmentSelect
          label="Target Segment"
          value={params.segmentId ?? ''}
          onChange={(v) =>
          onUpdate({
            segmentId: v
          })
          }
          segments={segments} />);


    case 'modify_hook':
      return (
        <div
          style={{
            marginBottom: 10
          }}>
          
          <label
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 4,
              letterSpacing: '0.06em'
            }}>
            
            New Hook Content
          </label>
          <textarea
            value={params.hookContent ?? ''}
            onChange={(e) =>
            onUpdate({
              hookContent: e.target.value
            })
            }
            placeholder="Enter new hook text..."
            rows={3}
            style={{
              width: '100%',
              padding: '7px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box'
            }} />
          
        </div>);

    case 'split':
      return (
        <>
          <SegmentSelect
            label="Segment to Split"
            value={params.segmentId ?? ''}
            onChange={(v) =>
            onUpdate({
              segmentId: v
            })
            }
            segments={segments} />
          
          <SliderInput
            label="Split Position"
            value={params.splitPosition ?? 0.5}
            onChange={(v) =>
            onUpdate({
              splitPosition: v
            })
            } />
          
        </>);

    case 'merge':
      return (
        <>
          <SegmentSelect
            label="First Segment"
            value={params.segmentA ?? ''}
            onChange={(v) =>
            onUpdate({
              segmentA: v
            })
            }
            segments={segments} />
          
          <SegmentSelect
            label="Second Segment"
            value={params.segmentB ?? ''}
            onChange={(v) =>
            onUpdate({
              segmentB: v
            })
            }
            segments={segments} />
          
        </>);

    case 'set_pacing':
      return (
        <SliderInput
          label="Pacing Value"
          value={params.pacingValue ?? 0.5}
          onChange={(v) =>
          onUpdate({
            pacingValue: v
          })
          } />);


    default:
      return null;
  }
}
export function ActionPanel({
  selectedAction,
  actionParams,
  segments,
  isLoading,
  onSelectAction,
  onUpdateParams,
  onApply,
  errorMessage
}: ActionPanelProps) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: 16
      }}>
      
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 10
        }}>
        
        Apply Action
      </div>

      {/* Action type pills */}
      <div
        style={{
          display: 'flex',
          gap: 5,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 12,
          scrollbarWidth: 'none'
        }}>
        
        {ACTION_TYPES.map((action) => {
          const isSelected = selectedAction === action;
          return (
            <button
              key={action}
              onClick={() => onSelectAction(action)}
              style={{
                flexShrink: 0,
                padding: '5px 10px',
                background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-pill)',
                color: isSelected ? 'var(--bg-base)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}>
              
              {actionLabel(action)}
            </button>);

        })}
      </div>

      {/* Context inputs */}
      <div
        style={{
          marginBottom: 12
        }}>
        
        <ActionContextInputs
          action={selectedAction}
          params={actionParams}
          segments={segments}
          onUpdate={onUpdateParams} />
        
      </div>

      {/* Error message */}
      {errorMessage &&
      <div
        style={{
          padding: '6px 10px',
          marginBottom: 10,
          background: 'rgba(255,77,106,0.08)',
          border: '1px solid rgba(255,77,106,0.3)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--status-bad)'
        }}>
        
          {errorMessage}
        </div>
      }

      {/* Apply button */}
      <button
        onClick={onApply}
        disabled={isLoading}
        title="Apply Action (Enter)"
        style={{
          width: '100%',
          padding: '11px 0',
          background: isLoading ? 'rgba(0,212,255,0.3)' : 'var(--accent-cyan)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: isLoading ? 'rgba(0,212,255,0.7)' : 'var(--bg-base)',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all var(--transition-fast)',
          boxShadow: isLoading ? 'none' : 'var(--shadow-glow-cyan)'
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 0 24px rgba(0,212,255,0.5)';
          }
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = isLoading ?
          'none' :
          'var(--shadow-glow-cyan)';
        }}>
        
        {isLoading ?
        <>
            <Loader2
            size={14}
            style={{
              animation: 'spin 1s linear infinite'
            }} />
          
            Processing...
          </> :

        'Apply Action'
        }
      </button>
    </div>);

}