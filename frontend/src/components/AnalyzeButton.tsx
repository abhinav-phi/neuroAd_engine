import React from 'react';

interface AnalyzeButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export function AnalyzeButton({ onClick, disabled, isLoading }: AnalyzeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '16px 32px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background:
          disabled || isLoading
            ? 'rgba(0,212,255,0.08)'
            : 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)',
        color: disabled || isLoading ? 'var(--text-muted)' : '#fff',
        boxShadow:
          disabled || isLoading
            ? 'none'
            : '0 4px 24px rgba(0,212,255,0.25), 0 0 0 1px rgba(0,212,255,0.2)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow =
            '0 6px 32px rgba(0,212,255,0.35), 0 0 0 1px rgba(0,212,255,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!disabled && !isLoading) {
          e.currentTarget.style.boxShadow =
            '0 4px 24px rgba(0,212,255,0.25), 0 0 0 1px rgba(0,212,255,0.2)';
        }
      }}
    >
      {isLoading ? (
        <>
          <div
            style={{
              width: 20,
              height: 20,
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Analyzing Cognitive Response…
        </>
      ) : (
        <>
          <span style={{ fontSize: 20 }}>🧠</span>
          Analyze Ad
          <span style={{ fontSize: 14, opacity: 0.7 }}>⚡</span>
        </>
      )}
    </button>
  );
}
