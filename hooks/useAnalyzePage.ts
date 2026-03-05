import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { runAnalysis } from '../services/analysisService';
import {
  classifyAnalyzeError,
  classifyLeadSubmitError,
  generateReportText,
  getGrade,
  PROCESSING_MESSAGES,
  splitExcelFiles,
} from '../components/analyze/analyzeHelpers';
import { useAnalyzeStateMachine } from '../components/analyze/useAnalyzeStateMachine';
import { getTrialCopy } from '../utils/trialPolicy';
import { pageViewService } from '../services/pageViewService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface ConsultationPrefill {
  email: string;
  hospitalName?: string;
  region?: string;
  contact?: string;
}

interface UseAnalyzePageOptions {
  onContact: (data: ConsultationPrefill) => void;
}

export function useAnalyzePage({ onContact }: UseAnalyzePageOptions) {
  const [fixtureFile, setFixtureFile] = useState<File | null>(null);
  const [surgeryFiles, setSurgeryFiles] = useState<File[]>([]);
  const [sizeFormatDetailItems, setSizeFormatDetailItems] = useState<string[] | null>(null);
  const [demoVideoUrl, setDemoVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  useEffect(() => {
    supabase.storage.from('public-assets').list('site', { search: 'analysis-demo.mp4' })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const fileInfo = data.find(f => f.name === 'analysis-demo.mp4');
          if (fileInfo) {
            const publicUrl = supabase.storage.from('public-assets').getPublicUrl('site/analysis-demo.mp4').data.publicUrl;
            const updatedTime = new Date(fileInfo.updated_at).getTime();
            setDemoVideoUrl(`${publicUrl}?t=${updatedTime}`);
          }
        }
      })
      .catch((err) => console.error("Error fetching demo video:", err))
      .finally(() => setIsVideoLoading(false));
  }, []);

  const [uploadFormatWarning, setUploadFormatWarning] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  const {
    step,
    report,
    progress,
    processingMsg,
    error,
    emailSent,
    leadEmail,
    wantDetailedAnalysis,
    leadHospital,
    leadRegion,
    leadContact,
    isSubmittingLead,
    leadSubmitError,
    setProgress,
    setProcessingMsg,
    setIsSubmittingLead,
    setLeadSubmitError,
    setEmailSent,
    clearAnalyzeError,
    setAnalyzeError,
    startAnalyzeProcessing,
    completeAnalyzeProcessing,
    failAnalyzeProcessing,
    updateLeadEmail,
    updateWantDetailedAnalysis,
    updateLeadHospital,
    updateLeadRegion,
    updateLeadContact,
  } = useAnalyzeStateMachine({ reportRef });
  const trialCopy = getTrialCopy();
  const analyzeTrialFootnoteText = `${trialCopy.footnoteWithDot} · ${trialCopy.trialPolicyShort}`;

  const fixtureDrop = useRef<HTMLDivElement>(null);
  const surgeryDrop = useRef<HTMLDivElement>(null);

  const handleFixtureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { valid, invalid } = splitExcelFiles([file]);
    if (invalid.length > 0) {
      setUploadFormatWarning(`형식 오류: ${invalid[0].name} 파일은 제외되었습니다. .xlsx/.xls만 지원합니다.`);
      return;
    }

    setFixtureFile(valid[0]);
    clearAnalyzeError();
    setUploadFormatWarning('');
  }, [clearAnalyzeError]);

  const handleSurgeryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const { valid, invalid } = splitExcelFiles(files);

    if (valid.length > 0) {
      setSurgeryFiles(prev => [...prev, ...valid].slice(0, 6));
      clearAnalyzeError();
    }

    if (invalid.length > 0) {
      setUploadFormatWarning(`형식 오류: ${invalid.map((file) => file.name).join(', ')} 파일은 제외되었습니다. .xlsx/.xls만 지원합니다.`);
      return;
    }

    if (valid.length > 0) {
      setUploadFormatWarning('');
    }
  }, [clearAnalyzeError]);

  const removeSurgeryFile = useCallback((idx: number) => {
    setSurgeryFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'fixture' | 'surgery') => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files as FileList);
    const { valid, invalid } = splitExcelFiles(files);

    if (type === 'fixture' && valid[0]) {
      setFixtureFile(valid[0]);
      clearAnalyzeError();
    } else if (type === 'surgery' && valid.length > 0) {
      setSurgeryFiles(prev => [...prev, ...valid].slice(0, 6));
      clearAnalyzeError();
    }

    if (invalid.length > 0) {
      setUploadFormatWarning(`형식 오류: ${invalid.map((file) => file.name).join(', ')} 파일은 제외되었습니다. .xlsx/.xls만 지원합니다.`);
      return;
    }

    if (valid.length > 0) {
      setUploadFormatWarning('');
    }
  }, [clearAnalyzeError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!fixtureFile || surgeryFiles.length === 0) {
      setAnalyzeError('재고 목록 파일과 수술기록지를 모두 업로드해주세요.');
      return;
    }
    pageViewService.trackEvent(
      'analyze_start',
      {
        fixture_uploaded: Boolean(fixtureFile),
        surgery_file_count: surgeryFiles.length,
      },
      'analyze',
    );
    startAnalyzeProcessing(PROCESSING_MESSAGES[0]);

    // Fake progress animation
    let msgIdx = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + Math.random() * 8 + 2, 90);
        const newMsgIdx = Math.min(Math.floor((next / 100) * PROCESSING_MESSAGES.length), PROCESSING_MESSAGES.length - 1);
        if (newMsgIdx !== msgIdx) {
          msgIdx = newMsgIdx;
          setProcessingMsg(PROCESSING_MESSAGES[msgIdx]);
        }
        return next;
      });
    }, 400);

    try {
      // 분석이 너무 빨리 끝나면 오히려 신뢰도가 떨어질 수 있으므로,
      // 체감상 꼼꼼히 검토하는 느낌을 주기 위해 최소 2.5초의 인위적 지연을 추가합니다.
      const [result] = await Promise.all([
        runAnalysis(fixtureFile, surgeryFiles),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
      clearInterval(progressInterval);
      pageViewService.trackEvent(
        'analyze_complete',
        {
          score: result.dataQualityScore,
          matched_count: result.matchedCount,
          unmatched_count: result.unmatchedItems.length,
        },
        'analyze',
      );
      completeAnalyzeProcessing(result);
    } catch (err) {
      console.error('[AnalyzePage] runAnalysis failed:', err);
      clearInterval(progressInterval);
      pageViewService.trackEvent('analyze_error', { message: classifyAnalyzeError(err) }, 'analyze');
      failAnalyzeProcessing(classifyAnalyzeError(err));
    }
  }, [completeAnalyzeProcessing, failAnalyzeProcessing, fixtureFile, setAnalyzeError, startAnalyzeProcessing, surgeryFiles]);

  const handleLeadSubmit = useCallback(async () => {
    if (!leadEmail || !report) return;
    if (wantDetailedAnalysis && (!leadHospital || !leadRegion || !leadContact)) return;
    if (isSubmittingLead) return;

    setIsSubmittingLead(true);
    setLeadSubmitError('');
    pageViewService.trackEvent('analyze_lead_submit_start', { detailed: wantDetailedAnalysis }, 'analyze');

    let reportText: string;
    try {
      reportText = generateReportText(report);
    } catch (err) {
      console.error('[AnalyzePage] generateReportText failed:', err);
      setLeadSubmitError('리포트 텍스트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setIsSubmittingLead(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-analysis-report`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: leadEmail,
          grade: getGrade(report.dataQualityScore).label,
          score: report.dataQualityScore,
          reportText,
          isDetailed: wantDetailedAnalysis,
          hospitalName: leadHospital || undefined,
          region: leadRegion || undefined,
          contact: leadContact || undefined,
        }),
      });

      if (!res.ok) {
        let detail = '';
        try {
          const payload = await res.json();
          if (payload && typeof payload === 'object') {
            if ('error' in payload && typeof payload.error === 'string') detail = payload.error;
            else if ('message' in payload && typeof payload.message === 'string') detail = payload.message;
          }
        } catch {
          // ignore body parse errors
        }

        const httpError = new Error(detail || `HTTP_${res.status}`) as Error & { status?: number };
        httpError.status = res.status;
        throw httpError;
      }

      try { await navigator.clipboard.writeText(reportText); } catch { /* silent */ }
      setEmailSent(true);
      pageViewService.trackEvent('analyze_lead_submit', { detailed: wantDetailedAnalysis }, 'analyze');
    } catch (err) {
      console.error('[AnalyzePage] send-analysis-report failed:', err);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      if (isTimeout) {
        setLeadSubmitError('요청 시간(30초)이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.');
      } else {
        setLeadSubmitError(classifyLeadSubmitError(err));
      }
      pageViewService.trackEvent(
        'analyze_lead_submit_error',
        { detailed: wantDetailedAnalysis, message: isTimeout ? '요청 시간(30초)이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.' : classifyLeadSubmitError(err) },
        'analyze',
      );
    } finally {
      clearTimeout(timeoutId);
      setIsSubmittingLead(false);
    }
  }, [leadEmail, leadHospital, leadRegion, leadContact, wantDetailedAnalysis, report, isSubmittingLead]);

  const handleGoToConsultation = useCallback(() => {
    onContact({ email: leadEmail, hospitalName: leadHospital, region: leadRegion, contact: leadContact });
  }, [onContact, leadEmail, leadHospital, leadRegion, leadContact]);

  const hasAnyUploadedFile = Boolean(fixtureFile) || surgeryFiles.length > 0;
  const uploadRequirements: { label: string; detail?: string; status: 'done' | 'pending' | 'warning' }[] = [
    { label: '재고 목록 파일 업로드', status: fixtureFile ? 'done' : 'pending' },
    {
      label: '수술기록 파일 1개 이상 업로드',
      detail: '* 6개월 이상 데이터 권장 (분석 정확도 향상)',
      status: surgeryFiles.length > 0 ? 'done' : 'pending',
    },
    {
      label: '엑셀 형식(.xlsx/.xls) 확인',
      status: uploadFormatWarning ? 'warning' : hasAnyUploadedFile ? 'done' : 'pending',
    },
  ];
  const analyzeDisabledReasons = [
    !fixtureFile ? '재고 목록 파일을 업로드해주세요.' : '',
    surgeryFiles.length === 0 ? '수술기록 파일을 1개 이상 업로드해주세요.' : '',
  ].filter(Boolean);
  const isAnalyzeDisabled = analyzeDisabledReasons.length > 0;

  return {
    // state
    fixtureFile, setFixtureFile,
    surgeryFiles,
    sizeFormatDetailItems, setSizeFormatDetailItems,
    demoVideoUrl, isVideoLoading,
    uploadFormatWarning,
    // refs
    reportRef, fixtureDrop, surgeryDrop,
    // from state machine
    step, report, progress, processingMsg, error,
    emailSent, leadEmail, wantDetailedAnalysis,
    leadHospital, leadRegion, leadContact,
    isSubmittingLead, leadSubmitError,
    setEmailSent,
    updateLeadEmail, updateWantDetailedAnalysis,
    updateLeadHospital, updateLeadRegion, updateLeadContact,
    // handlers
    handleFixtureChange, handleSurgeryChange, removeSurgeryFile,
    handleDrop, handleDragOver,
    handleAnalyze, handleLeadSubmit, handleGoToConsultation,
    // computed
    hasAnyUploadedFile, uploadRequirements,
    analyzeDisabledReasons, isAnalyzeDisabled,
    trialCopy, analyzeTrialFootnoteText,
  };
}
