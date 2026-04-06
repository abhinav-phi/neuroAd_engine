import React from 'react';
import { Navbar } from './components/Navbar';
import { AdUpload } from './components/AdUpload';
import { AnalyzeButton } from './components/AnalyzeButton';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ResultsDashboard } from './components/ResultsDashboard';
import { useAdAnalysis } from './lib/useAdAnalysis';

export function App() {
  const {
    phase,
    inputMode,
    textInput,
    selectedFile,
    filePreviewUrl,
    result,
    error,
    analysisDuration,
    canAnalyze,
    setInputMode,
    setTextInput,
    handleFileSelect,
    analyze,
    reset,
    retry,
  } = useAdAnalysis();

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        {/* ── IDLE STATE: Hero + Upload ── */}
        {(phase === 'idle') && (
          <div
            style={{
              width: '100%',
              maxWidth: 900,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 60,
              gap: 40,
            }}
          >
            {/* Hero */}
            <div
              style={{
                textAlign: 'center',
                animation: 'fadeInUp 0.6s ease',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  marginBottom: 16,
                  background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-cyan) 60%, var(--accent-purple) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Test Your Ad Before
                <br />
                You Run It
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-secondary)',
                  maxWidth: 520,
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}
              >
                AI-powered cognitive analysis using neuroscience models.
                Predict engagement, attention, and memory retention — <em>before</em> spending a dollar.
              </p>

              {/* Trust badges */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 24,
                  marginTop: 24,
                }}
              >
                {[
                  { icon: '🧠', text: 'TRIBE v2 Engine' },
                  { icon: '⚡', text: 'Real-time Analysis' },
                  { icon: '📊', text: 'Cognitive Metrics' },
                ].map((badge) => (
                  <div
                    key={badge.text}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{badge.icon}</span>
                    {badge.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Section */}
            <AdUpload
              inputMode={inputMode}
              textInput={textInput}
              filePreviewUrl={filePreviewUrl}
              selectedFile={selectedFile}
              onModeChange={setInputMode}
              onTextChange={setTextInput}
              onFileSelect={handleFileSelect}
            />

            {/* Analyze Button */}
            <AnalyzeButton
              onClick={analyze}
              disabled={!canAnalyze}
              isLoading={false}
            />

            {/* Footer hint */}
            <div
              style={{
                textAlign: 'center',
                paddingBottom: 40,
                animation: 'fadeIn 0.5s ease 0.8s both',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  maxWidth: 400,
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                Powered by neuroscience-inspired cognitive simulation.
                No data is stored — your ads remain private.
              </p>
            </div>
          </div>
        )}

        {/* ── ANALYZING STATE ── */}
        {phase === 'analyzing' && (
          <div style={{ paddingTop: 80 }}>
            <LoadingOverlay onCancel={reset} />
          </div>
        )}

        {/* ── RESULTS STATE ── */}
        {phase === 'results' && result && (
          <div style={{ width: '100%', paddingTop: 40 }}>
            <ResultsDashboard
              result={result}
              duration={analysisDuration}
              onReset={reset}
            />
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {phase === 'error' && (
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              paddingTop: 120,
              textAlign: 'center',
              animation: 'fadeInUp 0.4s ease',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: 'rgba(255,77,106,0.1)',
                border: '1px solid rgba(255,77,106,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                margin: '0 auto 24px',
              }}
            >
              ⚠️
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 8px',
              }}
            >
              Analysis Failed
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              {error || 'Something went wrong. Please try again.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={retry}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                Try Again
              </button>
              <button
                onClick={reset}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00D4FF, #8B5CF6)',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Global keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}