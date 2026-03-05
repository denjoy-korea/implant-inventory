import type { AnalysisReport } from '../../types';
import { getGrade } from '../../components/analyze/analyzeGradeConfig';
import { generateReportText } from '../../components/analyze/analyzeReportUtils';
import { pageViewService } from '../../services/pageViewService';
import { submitAnalyzeLeadReport, tryCopyReportText } from './analyzeLeadSubmitHelpers';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const LEAD_SUBMIT_TIMEOUT_MS = 30000;
export const LEAD_REPORT_TEXT_ERROR = '리포트 텍스트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.';
export const LEAD_TIMEOUT_ERROR = '요청 시간(30초)이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.';

interface RunAnalyzeLeadSubmitFlowParams {
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  report: AnalysisReport;
  setIsSubmittingLead: (value: boolean) => void;
  setLeadSubmitError: (value: string) => void;
  setEmailSent: (value: boolean) => void;
  onUnknownSubmitError: (err: unknown) => string;
}

function trackLeadSubmitError(wantDetailedAnalysis: boolean, message: string): void {
  pageViewService.trackEvent(
    'analyze_lead_submit_error',
    { detailed: wantDetailedAnalysis, message },
    'analyze',
  );
}

export async function runAnalyzeLeadSubmitFlow({
  leadEmail,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  report,
  setIsSubmittingLead,
  setLeadSubmitError,
  setEmailSent,
  onUnknownSubmitError,
}: RunAnalyzeLeadSubmitFlowParams): Promise<void> {
  setIsSubmittingLead(true);
  setLeadSubmitError('');
  pageViewService.trackEvent('analyze_lead_submit_start', { detailed: wantDetailedAnalysis }, 'analyze');

  let reportText: string;
  try {
    reportText = generateReportText(report);
  } catch (err) {
    console.error('[AnalyzePage] generateReportText failed:', err);
    setLeadSubmitError(LEAD_REPORT_TEXT_ERROR);
    setIsSubmittingLead(false);
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LEAD_SUBMIT_TIMEOUT_MS);

  try {
    await submitAnalyzeLeadReport({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      signal: controller.signal,
      leadEmail,
      gradeLabel: getGrade(report.dataQualityScore).label,
      score: report.dataQualityScore,
      reportText,
      wantDetailedAnalysis,
      leadHospital,
      leadRegion,
      leadContact,
    });
    await tryCopyReportText(reportText);
    setEmailSent(true);
    pageViewService.trackEvent('analyze_lead_submit', { detailed: wantDetailedAnalysis }, 'analyze');
  } catch (err) {
    console.error('[AnalyzePage] send-analysis-report failed:', err);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    if (isTimeout) {
      setLeadSubmitError(LEAD_TIMEOUT_ERROR);
      trackLeadSubmitError(wantDetailedAnalysis, LEAD_TIMEOUT_ERROR);
    } else {
      const fallbackMessage = onUnknownSubmitError(err);
      trackLeadSubmitError(wantDetailedAnalysis, fallbackMessage);
    }
  } finally {
    clearTimeout(timeoutId);
    setIsSubmittingLead(false);
  }
}
