import React, { useEffect, useState, memo } from 'react';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2 } from
'lucide-react';
import { Segment } from '../lib/types';
import {
  getSegmentTypeColor,
  getSegmentTypeBg,
  getMetricColor,
  formatDelta } from
'../lib/utils';
interface SegmentCardProps {
  segment: Segment;
  prevSegment?: Segment;
  isChanged: boolean;
  index: number;
  onEmphasize: (id: string) => void;
  onDeemphasize: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}
interface MetricPillProps {
  emoji: string;
  label: string;
  value: number;
  prevValue?: number;
  showDelta: boolean;
}
function MetricPill({
  emoji,
  label,
  value,
  prevValue,
  showDelta
}: MetricPillProps) {
  const delta = prevValue !== undefined ? value - prevValue : 0;
  const color = getMetricColor(value);
  const [deltaVisible, setDeltaVisible] = useState(false);
  useEffect(() => {
    if (showDelta && Math.abs(delta) > 0.005) {
      setDeltaVisible(true);
      const t = setTimeout(() => setDeltaVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showDelta, delta]);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        position: 'relative'
      }}>
      
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 7px',
          background: `${color}12`,
          border: `1px solid ${color}28`,
          borderRadius: 'var(--radius-pill)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 500,
          color
        }}>
        
        <span
          style={{
            fontSize: 9
          }}>
          
          {emoji}
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            marginRight: 1
          }}>
          
          {label}:
        </span>
        {value.toFixed(2)}
      </span>
      {deltaVisible && Math.abs(delta) > 0.005 &&
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          color: delta > 0 ? 'var(--status-good)' : 'var(--status-bad)',
          animation: 'deltaFadeIn 300ms ease forwards'
        }}>
        
          {delta > 0 ? '↑' : '↓'}
          {Math.abs(delta).toFixed(2)}
        </span>
      }
    </div>);

}
export function SegmentCard({
  segment,
  prevSegment,
  isChanged,
  index,
  onEmphasize,
  onDeemphasize,
  dragHandleProps,
  isDragging
}: SegmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const typeColor = getSegmentTypeColor(segment.type);
  const typeBg = getSegmentTypeBg(segment.type);
  const typeLabels: Record<string, string> = {
    hook: 'Hook',
    CTA: 'CTA',
    testimonial: 'Testimonial',
    body: 'Body'
  };
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isDragging ? 'rgba(14,21,32,0.95)' : 'var(--bg-surface)',
        border: `1px solid ${isChanged ? 'var(--accent-cyan)' : hovered ? 'rgba(0,212,255,0.15)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isDragging ?
        '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px var(--accent-cyan)' :
        isChanged ?
        '0 0 16px rgba(0,212,255,0.2)' :
        hovered ?
        '0 4px 16px rgba(0,0,0,0.3)' :
        'var(--shadow-card)',
        transition: 'all var(--transition-med)',
        animation: isChanged ? 'glowPulse 2s ease-in-out' : undefined,
        animationIterationCount: isChanged ? '1' : undefined,
        cursor: isDragging ? 'grabbing' : 'default',
        animationDelay: `${index * 80}ms`
      }}>
      
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: typeColor,
          borderRadius: '10px 0 0 10px'
        }} />
      

      <div
        style={{
          padding: '12px 12px 12px 16px'
        }}>
        
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 8
          }}>
          
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            style={{
              color: 'var(--text-muted)',
              cursor: 'grab',
              marginTop: 1,
              flexShrink: 0,
              opacity: hovered ? 1 : 0.4,
              transition: 'opacity var(--transition-fast)'
            }}>
            
            <GripVertical size={14} />
          </div>

          {/* Position number */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-muted)',
              opacity: 0.4,
              lineHeight: 1,
              flexShrink: 0,
              marginTop: -2
            }}>
            
            {String(segment.position).padStart(2, '0')}
          </span>

          {/* Type badge */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              color: typeColor,
              background: typeBg,
              border: `1px solid ${typeColor}30`,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0,
              marginTop: 2
            }}>
            
            {typeLabels[segment.type]}
          </span>

          {/* Changed indicator */}
          {isChanged &&
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              animation: 'fadeIn 300ms ease forwards'
            }}>
            
              <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent-cyan)',
                boxShadow: '0 0 8px var(--accent-cyan)',
                animation: 'dotPulse 1.5s ease-in-out infinite'
              }} />
            
            </div>
          }

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginLeft: isChanged ? 4 : 'auto',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              opacity: hovered ? 1 : 0.5,
              transition: 'opacity var(--transition-fast)'
            }}>
            
            {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
        </div>

        {/* Content */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: '0 0 10px 0',
            display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
            transition: 'all var(--transition-med)'
          }}>
          
          {segment.content}
        </p>

        {/* Metric pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4
          }}>
          
          <MetricPill
            emoji="🧠"
            label="Attn"
            value={segment.metrics.attention}
            prevValue={prevSegment?.metrics.attention}
            showDelta={isChanged} />
          
          <MetricPill
            emoji="💾"
            label="Mem"
            value={segment.metrics.memory}
            prevValue={prevSegment?.metrics.memory}
            showDelta={isChanged} />
          
          <MetricPill
            emoji="⚡"
            label="Load"
            value={segment.metrics.load}
            prevValue={prevSegment?.metrics.load}
            showDelta={isChanged} />
          
          <MetricPill
            emoji="❤️"
            label="Val"
            value={(segment.metrics.valence + 1) / 2}
            prevValue={
            prevSegment ? (prevSegment.metrics.valence + 1) / 2 : undefined
            }
            showDelta={isChanged} />
          
        </div>

        {/* Hover actions */}
        {hovered &&
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
            animation: 'fadeInUp 150ms ease forwards'
          }}>
          
            <button
            onClick={() => onEmphasize(segment.id)}
            style={{
              padding: '4px 10px',
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}>
            
              Emphasize
            </button>
            <button
            onClick={() => onDeemphasize(segment.id)}
            style={{
              padding: '4px 10px',
              background: 'rgba(100,116,139,0.08)',
              border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-neutral)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}>
            
              De-emphasize
            </button>
          </div>
        }
      </div>
    </div>);

}