import React from 'react';
export function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 40
      }}>
      
      <BrainWaveAnimation />
      <div
        style={{
          textAlign: 'center',
          maxWidth: 320
        }}>
        
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8
          }}>
          
          Ready to Optimize
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-muted)'
          }}>
          
          Select a task from the sidebar and click{' '}
          <span
            style={{
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)'
            }}>
            
            Reset Episode
          </span>{' '}
          to begin the cognitive optimization loop.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
        
        {[
        {
          key: 'R',
          label: 'Reset'
        },
        {
          key: '↵',
          label: 'Apply Action'
        }].
        map(({ key, label }) =>
        <div
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)'
          }}>
          
            <kbd
            style={{
              padding: '2px 7px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              fontSize: 10,
              color: 'var(--text-secondary)'
            }}>
            
              {key}
            </kbd>
            {label}
          </div>
        )}
      </div>
    </div>);

}
function BrainWaveAnimation() {
  return (
    <div
      style={{
        opacity: 0.4
      }}>
      
      <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
        <path
          d="M0 30 Q10 10 20 30 Q30 50 40 30 Q50 10 60 30 Q70 50 80 30 Q90 10 100 30 Q110 50 120 30"
          stroke="var(--accent-cyan)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: 200,
            animation: 'barGrow 2s ease-in-out infinite alternate'
          }} />
        
        <style>{`
          @keyframes waveAnim {
            0% { stroke-dashoffset: 200; opacity: 0.3; }
            50% { stroke-dashoffset: 0; opacity: 0.8; }
            100% { stroke-dashoffset: -200; opacity: 0.3; }
          }
          path { animation: waveAnim 3s ease-in-out infinite; }
        `}</style>
      </svg>
    </div>);

}