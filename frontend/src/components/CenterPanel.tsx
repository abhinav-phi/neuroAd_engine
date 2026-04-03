import React, { useCallback, useState } from 'react';
import { List, LayoutGrid } from 'lucide-react';
import { Segment } from '../lib/types';
import { SegmentCard } from './SegmentCard';
import { HeatmapGrid } from './HeatmapGrid';
import { getSegmentTypeColor } from '../lib/utils';
import { EmptyState } from './EmptyState';
interface CenterPanelProps {
  segments: Segment[];
  prevSegments?: Segment[];
  changedSegmentIds: Set<string>;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onEmphasize: (id: string) => void;
  onDeemphasize: (id: string) => void;
  onReorder: (segments: Segment[]) => void;
  isLoading: boolean;
}
const SEGMENT_TYPE_LEGEND = [
{
  type: 'hook',
  label: 'Hook'
},
{
  type: 'CTA',
  label: 'CTA'
},
{
  type: 'testimonial',
  label: 'Testimonial'
},
{
  type: 'body',
  label: 'Body'
}] as
const;
function ShimmerCard({ index }: {index: number;}) {
  return (
    <div
      style={{
        height: 110,
        borderRadius: 'var(--radius-md)',
        background:
        'linear-gradient(90deg, var(--bg-elevated) 25%, rgba(255,255,255,0.03) 50%, var(--bg-elevated) 75%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.5s infinite ${index * 0.1}s`,
        border: '1px solid var(--border-subtle)'
      }} />);


}
export function CenterPanel({
  segments,
  prevSegments,
  changedSegmentIds,
  showHeatmap,
  onToggleHeatmap,
  onEmphasize,
  onDeemphasize,
  onReorder,
  isLoading
}: CenterPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newSegments = [...segments];
    const [moved] = newSegments.splice(dragIndex, 1);
    newSegments.splice(dropIndex, 0, moved);
    const reindexed = newSegments.map((s, i) => ({
      ...s,
      position: i + 1
    }));
    onReorder(reindexed);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const isEmpty = segments.length === 0;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
        minWidth: 0
      }}>
      
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-surface)',
          flexShrink: 0
        }}>
        
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
          
          Ad Segments
        </span>
        {segments.length > 0 &&
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            background: 'var(--accent-cyan-dim)',
            border: '1px solid rgba(0,212,255,0.2)',
            padding: '1px 7px',
            borderRadius: 'var(--radius-pill)'
          }}>
          
            {segments.length}
          </span>
        }

        {/* Type legend */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginLeft: 8
          }}>
          
          {SEGMENT_TYPE_LEGEND.map(({ type, label }) =>
          <div
            key={type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
            
              <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: getSegmentTypeColor(type as any)
              }} />
            
              <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-muted)'
              }}>
              
                {label}
              </span>
            </div>
          )}
        </div>

        {/* Heatmap toggle */}
        <button
          onClick={onToggleHeatmap}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            background: showHeatmap ? 'rgba(0,212,255,0.1)' : 'transparent',
            border: `1px solid ${showHeatmap ? 'rgba(0,212,255,0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            color: showHeatmap ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all var(--transition-fast)'
          }}>
          
          {showHeatmap ? <List size={11} /> : <div size={11} />}
          {showHeatmap ? 'Segment View' : 'Heatmap View'}
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px'
        }}>
        
        {isEmpty && !isLoading ?
        <EmptyState /> :
        isLoading && isEmpty ?
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
          
            {Array.from({
            length: 4
          }).map((_, i) =>
          <ShimmerCard key={i} index={i} />
          )}
          </div> :
        showHeatmap ?
        <div
          className="glass-card"
          style={{
            padding: 20
          }}>
          
            <HeatmapGrid segments={segments} />
          </div> :

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
          
            {segments.map((segment, index) => {
            const prevSeg = prevSegments?.find((s) => s.id === segment.id);
            const isChanged = changedSegmentIds.has(segment.id);
            const isDraggingThis = dragIndex === index;
            const isDragOver = dragOverIndex === index && dragIndex !== index;
            return (
              <div
                key={segment.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  animation: `cardSlideIn 300ms ease ${index * 60}ms both`,
                  outline: isDragOver ?
                  '2px dashed var(--accent-cyan)' :
                  'none',
                  outlineOffset: 3,
                  borderRadius: 'var(--radius-md)',
                  transition: 'outline var(--transition-fast)'
                }}>
                
                  <SegmentCard
                  segment={segment}
                  prevSegment={prevSeg}
                  isChanged={isChanged}
                  index={index}
                  onEmphasize={onEmphasize}
                  onDeemphasize={onDeemphasize}
                  isDragging={isDraggingThis}
                  dragHandleProps={{}} />
                
                </div>);

          })}
          </div>
        }
      </div>
    </div>);

}