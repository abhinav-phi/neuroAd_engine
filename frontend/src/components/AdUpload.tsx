import React, { useCallback, useRef, useState } from 'react';
import type { InputMode } from '../lib/adTypes';

interface AdUploadProps {
  inputMode: InputMode;
  textInput: string;
  filePreviewUrl: string | null;
  selectedFile: File | null;
  onModeChange: (mode: InputMode) => void;
  onTextChange: (text: string) => void;
  onFileSelect: (file: File | null) => void;
}

const SAMPLE_AD = `🚀 Stop Wasting 73% of Your Ad Budget

Most brands lose thousands on ads that never convert. Our AI-powered platform analyzes your creative in seconds — predicting engagement before you spend a single dollar.

✅ Neuroscience-backed insights
✅ Real-time cognitive scoring
✅ 3x higher conversion rates

Join 2,000+ marketers who test before they invest.

👉 Start your free trial today — no credit card required.`;

export function AdUpload({
  inputMode,
  textInput,
  filePreviewUrl,
  selectedFile,
  onModeChange,
  onTextChange,
  onFileSelect,
}: AdUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const tabs: { mode: InputMode; label: string; icon: string }[] = [
    { mode: 'text', label: 'Ad Text', icon: '✏️' },
    { mode: 'image', label: 'Image', icon: '🖼️' },
    { mode: 'video', label: 'Video', icon: '🎥' },
  ];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        animation: 'fadeInUp 0.5s ease forwards',
      }}
    >
      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => {
              onModeChange(tab.mode);
              if (tab.mode === 'text') onFileSelect(null);
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background:
                inputMode === tab.mode
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(139,92,246,0.1))'
                  : 'transparent',
              color:
                inputMode === tab.mode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              boxShadow:
                inputMode === tab.mode
                  ? '0 0 0 1px rgba(0,212,255,0.25), 0 2px 8px rgba(0,0,0,0.2)'
                  : 'none',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <div style={{ position: 'relative' }}>
          <textarea
            value={textInput}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your ad copy here..."
            style={{
              width: '100%',
              minHeight: 220,
              padding: 20,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.7,
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {textInput.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={() => onTextChange(SAMPLE_AD)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.color = 'var(--accent-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Try Sample Ad
            </button>
          </div>
        </div>
      )}

      {/* Image / Video Upload Mode */}
      {(inputMode === 'image' || inputMode === 'video') && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={inputMode === 'image' ? 'image/*' : 'video/*'}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                minHeight: 220,
                borderRadius: 'var(--radius-md)',
                border: `2px dashed ${isDragOver ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                background: isDragOver
                  ? 'rgba(0,212,255,0.04)'
                  : 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'rgba(0,212,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                {inputMode === 'image' ? '🖼️' : '🎬'}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  {isDragOver
                    ? 'Drop your file here'
                    : `Drop ${inputMode === 'image' ? 'an image' : 'a video'} or click to browse`}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  {inputMode === 'image'
                    ? 'PNG, JPG, WebP up to 10MB'
                    : 'MP4, MOV, WebM up to 50MB'}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                overflow: 'hidden',
              }}
            >
              {/* Preview */}
              {inputMode === 'image' && filePreviewUrl && (
                <div
                  style={{
                    width: '100%',
                    height: 200,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={filePreviewUrl}
                    alt="Ad preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
              {inputMode === 'video' && filePreviewUrl && (
                <div
                  style={{
                    width: '100%',
                    height: 200,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <video
                    src={filePreviewUrl}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                    muted
                    playsInline
                    controls
                  />
                </div>
              )}

              {/* File info bar */}
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>
                    {inputMode === 'image' ? '🖼️' : '🎬'}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onFileSelect(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255,77,106,0.3)',
                    background: 'rgba(255,77,106,0.08)',
                    color: 'var(--status-bad)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
