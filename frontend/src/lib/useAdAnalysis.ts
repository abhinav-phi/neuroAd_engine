// ──────────────────────────────────────────────
// NeuroAd — Ad Analysis State Hook
// ──────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type { AnalysisResult, AnalysisPhase, InputMode } from './adTypes';
import { analyzeAdText, analyzeAdImage, analyzeAdVideo } from './adApi';

export function useAdAnalysis() {
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (file) {
      if (file.type.startsWith('image/')) {
        setInputMode('image');
        setFilePreviewUrl(URL.createObjectURL(file));
      } else if (file.type.startsWith('video/')) {
        setInputMode('video');
        setFilePreviewUrl(URL.createObjectURL(file));
      }
    }
  }, [filePreviewUrl]);

  const analyze = useCallback(async () => {
    setError(null);
    setPhase('analyzing');
    startTimeRef.current = Date.now();

    try {
      let analysisResult: AnalysisResult;

      if (inputMode === 'text') {
        if (!textInput.trim()) {
          throw new Error('Please enter ad text to analyze.');
        }
        analysisResult = await analyzeAdText(textInput);
      } else if (inputMode === 'image') {
        if (!selectedFile) {
          throw new Error('Please select an image to analyze.');
        }
        analysisResult = await analyzeAdImage(selectedFile);
      } else {
        if (!selectedFile) {
          throw new Error('Please select a video to analyze.');
        }
        analysisResult = await analyzeAdVideo(selectedFile);
      }

      const duration = Date.now() - startTimeRef.current;
      setAnalysisDuration(duration);
      setResult(analysisResult);
      setPhase('results');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setPhase('error');
    }
  }, [inputMode, textInput, selectedFile]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setError(null);
    setAnalysisDuration(null);
    setTextInput('');
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setInputMode('text');
  }, [filePreviewUrl]);

  const retry = useCallback(() => {
    setError(null);
    setPhase(inputMode === 'text' ? 'idle' : 'idle');
  }, [inputMode]);

  const canAnalyze =
    (inputMode === 'text' && textInput.trim().length > 0) ||
    ((inputMode === 'image' || inputMode === 'video') && selectedFile !== null);

  return {
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
  };
}
