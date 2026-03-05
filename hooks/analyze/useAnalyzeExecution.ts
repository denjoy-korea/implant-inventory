import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AnalysisReport } from '../../types';
import { runAnalysis } from '../../services/analysisService';
import { PROCESSING_MESSAGES } from '../../components/analyze/analyzeProcessingMessages';
import { startAnalyzeProgressTicker } from './analyzeProgressTicker';

const ANALYZE_MIN_DELAY_MS = 2500;

interface UseAnalyzeExecutionParams {
  setProgress: Dispatch<SetStateAction<number>>;
  setProcessingMsg: Dispatch<SetStateAction<string>>;
}

interface UseAnalyzeExecutionResult {
  executeAnalyze: (fixtureFile: File, surgeryFiles: File[]) => Promise<AnalysisReport>;
}

export function useAnalyzeExecution({
  setProgress,
  setProcessingMsg,
}: UseAnalyzeExecutionParams): UseAnalyzeExecutionResult {
  const executeAnalyze = useCallback(async (fixtureFile: File, surgeryFiles: File[]) => {
    const progressInterval = startAnalyzeProgressTicker({
      setProgress,
      setProcessingMsg,
      processingMessages: PROCESSING_MESSAGES,
    });

    try {
      // 분석이 너무 빨리 끝나면 오히려 신뢰도가 떨어질 수 있으므로,
      // 체감상 꼼꼼히 검토하는 느낌을 주기 위해 최소 2.5초의 인위적 지연을 추가합니다.
      const [result] = await Promise.all([
        runAnalysis(fixtureFile, surgeryFiles),
        new Promise((resolve) => setTimeout(resolve, ANALYZE_MIN_DELAY_MS)),
      ]);
      return result;
    } finally {
      clearInterval(progressInterval);
    }
  }, [setProcessingMsg, setProgress]);

  return { executeAnalyze };
}
