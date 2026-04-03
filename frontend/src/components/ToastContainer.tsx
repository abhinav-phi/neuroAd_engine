import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { Toast } from '../lib/types';
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}
export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none'
      }}>
      
      {toasts.map((toast) => {
        const colors = {
          success: {
            bg: 'rgba(16,232,138,0.08)',
            border: 'rgba(16,232,138,0.3)',
            text: 'var(--status-good)',
            icon: <CheckCircle size={13} />
          },
          error: {
            bg: 'rgba(255,77,106,0.08)',
            border: 'rgba(255,77,106,0.3)',
            text: 'var(--status-bad)',
            icon: <AlertCircle size={13} />
          },
          warning: {
            bg: 'rgba(255,184,0,0.08)',
            border: 'rgba(255,184,0,0.3)',
            text: 'var(--status-warn)',
            icon: <AlertTriangle size={13} />
          }
        }[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(8px)',
              animation: 'slideInRight 300ms ease forwards',
              minWidth: 240,
              maxWidth: 320,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}>
            
            <span
              style={{
                color: colors.text,
                flexShrink: 0
              }}>
              
              {colors.icon}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-primary)',
                flex: 1
              }}>
              
              {toast.message}
            </span>
            <button
              onClick={() => onRemove(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0
              }}>
              
              <X size={11} />
            </button>
          </div>);

      })}
    </div>);

}