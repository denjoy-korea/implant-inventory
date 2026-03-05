import { useCallback } from 'react';
import type { AnalysisReport } from '../../types';

interface UseAnalyzeHandleAnalyzeParams {
  fixtureFile: File | null;
  surgeryFiles: File[];
  analyzeStartMessage: string;
  executeAnalyze: (fixtureFile: File, surgeryFiles: File[]) => Promise<AnalysisReport>;
  setAnalyzeError: (message: string) => void;
  startAnalyzeProcessing: (initialMessage: string) => void;
  completeAnalyzeProcessing: (report: AnalysisReport) => void;
  failAnalyzeProcessing: (message: string) => void;
  classifyAnalyzeError: (error: unknown) => string;
  trackAnalyzeStart: () => void;
  trackAnalyzeComplete: (report: AnalysisReport) => void;
  trackAnalyzeError: (message: string) => void;
}

interface UseAnalyzeHandleAnalyzeResult {
  handleAnalyze: () => Promise<void>;
}

export function useAnalyzeHandleAnalyze({
  fixtureFile,
  surgeryFiles,
  analyzeStartMessage,
  executeAnalyze,
  setAnalyzeError,
  startAnalyzeProcessing,
  completeAnalyzeProcessing,
  failAnalyzeProcessing,
  classifyAnalyzeError: classifyAnalyzeErrorMessage,
  trackAnalyzeStart,
  trackAnalyzeComplete,
  trackAnalyzeError,
}: UseAnalyzeHandleAnalyzeParams): UseAnalyzeHandleAnalyzeResult {
  const handleAnalyze = useCallback(async () => {
    if (!fixtureFile || surgeryFiles.length === 0) {
      setAnalyzeError('재고 목록 파일과 수술기록지를 모두 업로드해주세요.');
      return;
    }

    trackAnalyzeStart();
    startAnalyzeProcessing(analyzeStartMessage);

    try {
      const result = await executeAnalyze(fixtureFile, surgeryFiles);
      trackAnalyzeComplete(result);
      completeAnalyzeProcessing(result);
    } catch (error) {
      console.error('[AnalyzePage] runAnalysis failed:', error);
      const message = classifyAnalyzeErrorMessage(error);
      trackAnalyzeError(message);
      failAnalyzeProcessing(message);
    }
  }, [
    analyzeStartMessage,
    classifyAnalyzeErrorMessage,
    completeAnalyzeProcessing,
    executeAnalyze,
    failAnalyzeProcessing,
    fixtureFile,
    setAnalyzeError,
    startAnalyzeProcessing,
    surgeryFiles,
    trackAnalyzeComplete,
    trackAnalyzeError,
    trackAnalyzeStart,
  ]);

  return { handleAnalyze };
}
