import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { runAnalysis } from '../services/analysisService';
import { BarChart, DonutChart, ScoreGauge } from './analyze/AnalyzeCharts';
import {
  buildQuickInsights,
  classifyAnalyzeError,
  classifyLeadSubmitError,
  generateReportText,
  getGrade,
  gradeColorMap,
  PROCESSING_MESSAGES,
  splitExcelFiles,
  statusColorMap,
} from './analyze/analyzeHelpers';
import { useAnalyzeStateMachine } from './analyze/useAnalyzeStateMachine';
import { DEFAULT_TRIAL_OFFER_TEXT, getBetaTrialOfferText } from '../utils/trialPolicy';
import { pageViewService } from '../services/pageViewService';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface AnalyzePageProps {
  onSignup: () => void;
  onContact: () => void;
}

const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  const [fixtureFile, setFixtureFile] = useState<File | null>(null);
  const [surgeryFiles, setSurgeryFiles] = useState<File[]>([]);
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
  const betaTrialOfferText = getBetaTrialOfferText();
  const analyzeTrialFootnoteText = betaTrialOfferText
    ? `카드 정보 불필요 · 1분 가입 · ${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText}`
    : `카드 정보 불필요 · 1분 가입 · ${DEFAULT_TRIAL_OFFER_TEXT}`;

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
      const result = await runAnalysis(fixtureFile, surgeryFiles);
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
    const reportText = generateReportText(report);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-analysis-report`, {
        method: 'POST',
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
      setLeadSubmitError(classifyLeadSubmitError(err));
      pageViewService.trackEvent(
        'analyze_lead_submit_error',
        { detailed: wantDetailedAnalysis, message: classifyLeadSubmitError(err) },
        'analyze',
      );
    } finally {
      setIsSubmittingLead(false);
    }
  }, [leadEmail, leadHospital, leadRegion, leadContact, wantDetailedAnalysis, report, isSubmittingLead]);

  const hasAnyUploadedFile = Boolean(fixtureFile) || surgeryFiles.length > 0;
  const uploadRequirements: { label: string; status: 'done' | 'pending' | 'warning' }[] = [
    { label: '재고 목록 파일 업로드', status: fixtureFile ? 'done' : 'pending' },
    { label: '수술기록 파일 1개 이상 업로드', status: surgeryFiles.length > 0 ? 'done' : 'pending' },
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

  // ═══════════════ UPLOAD STEP ═══════════════
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-20">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-emerald-700">무료 데이터 품질 진단</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
              우리 병원 임플란트 데이터,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                얼마나 잘 관리되고 있을까요?
              </span>
            </h1>
            <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
              픽스쳐 재고 파일과 수술기록지를 업로드하면,<br />
              데이터 품질을 6가지 항목으로 진단해드립니다.
            </p>
          </div>

          {/* Demo Video -> Image Replacement */}
          <div className="mb-12">
            <p className="text-sm text-slate-400 mb-2 text-center tracking-wide">▶ DenJOY 재고관리 시스템 실제 운영 사례</p>
            <div className={`rounded-2xl overflow-hidden border border-slate-200 shadow-lg min-h-[400px] ${!demoVideoUrl && !isVideoLoading ? 'bg-slate-100 flex items-center justify-center p-2 sm:p-4' : 'bg-slate-50 relative'}`}>
              {isVideoLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : demoVideoUrl ? (
                <video
                  src={demoVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="/system-operation.png"
                  alt="DenJOY 재고관리 시스템 실제 운영 사례"
                  className="w-full h-auto rounded-xl shadow-sm border border-slate-200 object-contain max-h-[600px]"
                />
              )}
            </div>
          </div>

          {/* Upload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Fixture Upload */}
            <div
              ref={fixtureDrop}
              onDrop={(e) => handleDrop(e, 'fixture')}
              onDragOver={handleDragOver}
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${fixtureFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">재고 목록 (픽스쳐)</h3>
              <p className="text-sm text-slate-400 mb-4">덴트웹에서 다운로드한 픽스쳐 엑셀 파일</p>
              {fixtureFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-700 font-semibold">{fixtureFile.name}</span>
                  <button onClick={() => setFixtureFile(null)} className="text-slate-400 hover:text-rose-500 ml-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  파일 선택
                  <input type="file" accept=".xlsx,.xls" onChange={handleFixtureChange} className="hidden" />
                </label>
              )}
              <p className="text-xs text-slate-300 mt-3">.xlsx / .xls</p>
            </div>

            {/* Surgery Upload */}
            <div
              ref={surgeryDrop}
              onDrop={(e) => handleDrop(e, 'surgery')}
              onDragOver={handleDragOver}
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${surgeryFiles.length > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">수술기록지</h3>
              <p className="text-sm text-slate-400 mb-4">월별 수술기록 엑셀 (최대 6개)</p>
              {surgeryFiles.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {surgeryFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 text-sm">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-indigo-700 font-medium text-xs">{f.name}</span>
                      <button onClick={() => removeSurgeryFile(i)} className="text-slate-400 hover:text-rose-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {surgeryFiles.length < 6 && (
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  파일 추가
                  <input type="file" accept=".xlsx,.xls" multiple onChange={handleSurgeryChange} className="hidden" />
                </label>
              )}
              <p className="text-xs text-slate-300 mt-3">.xlsx / .xls &middot; {surgeryFiles.length}/6 파일</p>
            </div>
          </div>

          {/* Upload Requirement Checklist */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">분석 시작 전 체크</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {uploadRequirements.map((item) => {
                const isDone = item.status === 'done';
                const isWarning = item.status === 'warning';
                return (
                  <div
                    key={item.label}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold border ${isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isWarning
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isWarning ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      )}
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust Anchor */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: '전송 구간 암호화', detail: '업로드/전송은 HTTPS 암호화 채널로 처리됩니다.' },
              { title: '원본 파일 비저장', detail: '분석 파일은 브라우저 내에서 처리 후 저장되지 않습니다.' },
              { title: '처리 방식 투명성', detail: '진단 기준과 점수 계산 항목을 결과 화면에 함께 제공합니다.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-800 mb-1">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          {/* Upload format warning */}
          {uploadFormatWarning && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center font-medium">
              {uploadFormatWarning}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 text-center font-medium">
              {error}
            </div>
          )}

          {/* Analyze Button */}
          <div className="text-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzeDisabled}
              className="px-10 py-4 bg-slate-900 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-1 transition-all duration-300 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              분석 시작
            </button>
            {isAnalyzeDisabled ? (
              <p className="mt-3 text-sm text-amber-700 font-semibold">
                분석 시작을 위해 {analyzeDisabledReasons.join(' / ')}
              </p>
            ) : (
              <p className="mt-3 text-sm text-emerald-700 font-semibold">업로드 준비 완료. 분석을 시작할 수 있습니다.</p>
            )}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-slate-500">모든 분석은 브라우저에서 처리되며, 업로드된 데이터는 서버에 저장되지 않습니다.</span>
            </div>
          </div>
        </div>

        {/* Footer - 기업정보 */}
        <footer className="border-t border-slate-200 bg-slate-50 py-8 px-6">
          <div className="max-w-4xl mx-auto text-xs text-slate-400 leading-relaxed">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-500 mb-1">디앤조이(DenJOY)</p>
                <p>대표: 맹준호 | 사업자등록번호: 528-22-01076</p>
                <p>이메일: admin@denjoy.info</p>
              </div>
              <p className="md:text-right text-slate-300">&copy; {new Date().getFullYear()} DenJOY. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════════ PROCESSING STEP ═══════════════
  if (step === 'processing') {
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="relative w-40 h-40 mx-auto mb-8">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle cx="70" cy="70" r="60" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="70" cy="70" r="60" fill="none"
                stroke="url(#progressGradient)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{Math.round(progress)}%</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">데이터를 분석하고 있습니다</h2>
          <p className="text-slate-500 text-sm animate-pulse">{processingMsg}</p>
        </div>
      </div>
    );
  }

  // ═══════════════ REPORT STEP ═══════════════
  if (!report) return null;
  const grade = getGrade(report.dataQualityScore);
  const colors = gradeColorMap[grade.color];
  const quickInsights = buildQuickInsights(report);
  const missingDetailedFields = [
    !leadHospital ? '병원명' : '',
    !leadRegion ? '지역' : '',
    !leadContact ? '연락처' : '',
  ].filter(Boolean);
  const leadSubmitDisabled = isSubmittingLead || !leadEmail || (wantDetailedAnalysis && missingDetailedFields.length > 0);
  const leadSubmitBlockReason = !leadEmail
    ? '이메일을 입력하면 결과를 저장할 수 있습니다.'
    : wantDetailedAnalysis && missingDetailedFields.length > 0
      ? `${missingDetailedFields.join(', ')}을(를) 입력하면 요청할 수 있어요`
      : '';
  const leadSuccessCta = wantDetailedAnalysis
    ? {
      title: '요청 접수 완료',
      eta: '담당자가 영업일 기준 1일 이내에 연락드립니다.',
      detail: '요청 내역이 정상 접수되었고 분석 리포트 텍스트는 클립보드에 복사되었습니다.',
      ctaLabel: '상담 일정 잡기',
      onClick: onContact,
    }
    : {
      title: '리포트 저장 완료',
      eta: '정식 서비스 전환 시점에 동일 이메일로 안내를 드립니다.',
      detail: '결과 요약이 클립보드에 복사되었습니다. 다음 단계로 자동 분석을 바로 시작할 수 있습니다.',
      ctaLabel: '무료로 시작하기',
      onClick: onSignup,
    };

  return (
    <div ref={reportRef} className="min-h-screen bg-slate-50">

      {/* Section 1: Overall Score */}
      <section className="bg-slate-900 text-white pt-12 pb-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 mb-6">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs text-slate-400">분석 데이터는 서버에 저장되지 않습니다</span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">데이터 품질 진단 결과</p>
          <ScoreGauge score={report.dataQualityScore} color={grade.color} />
          <div className="mt-6 inline-flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-base font-black ${colors.bg} text-white`}>
              {grade.label}등급
            </span>
            <span className="text-lg text-slate-200 font-medium">{grade.text}</span>
          </div>
          {/* Summary stats */}
          <div className="mt-10 grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: '전체 품목', value: report.summary.totalFixtureItems },
              { label: '사용 품목', value: report.summary.activeItems },
              { label: '매칭 품목', value: report.summary.usedItems },
              { label: 'Dead Stock', value: report.summary.deadStockItems },
              { label: '미등록 품목', value: report.summary.surgeryOnlyItems },
              { label: '표기 변형', value: report.summary.nameVariants },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800 rounded-xl py-3 px-2">
                <div className="text-2xl font-black text-white tabular-nums">{s.value}</div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1.5: Analysis Criteria */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">분석 기준</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            {[
              { name: 'FAIL 항목 분리 관리', pts: 15, desc: '재고 목록에 FAIL 픽스쳐 별도 분류 여부' },
              { name: '보험청구 2단계 구분', pts: 15, desc: '픽스쳐 목록 + 수술기록 양쪽 보험임플란트 구분' },
              { name: '수술기록→재고 매칭률', pts: 25, desc: '수술에 사용된 품목이 재고 목록에 등록되어 있는지' },
              { name: '재고→수술기록 활용률', pts: 20, desc: '등록된 재고가 실제 수술에 사용되고 있는지' },
              { name: '데이터 표기 일관성', pts: 15, desc: '같은 제조사/브랜드의 명칭 통일 여부' },
              { name: '사이즈 포맷 일관성', pts: 10, desc: '같은 브랜드 내 사이즈 표기법 통일 여부' },
            ].map((c, i) => (
              <div key={i} className="flex items-baseline gap-2 py-1.5">
                <span className="text-xs font-bold text-indigo-500 tabular-nums w-8 flex-shrink-0">{c.pts}점</span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-700">{c.name}</span>
                  <p className="text-[11px] text-slate-400 leading-tight">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Diagnostic Results */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">진단 결과</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.diagnostics.map((d, i) => {
              const sc = statusColorMap[d.status];
              return (
                <div key={i} className={`rounded-2xl border ${sc.border} ${sc.bg} p-6`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${sc.iconBg} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {sc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">{d.category}</span>
                        <span className={`text-xs font-bold ${sc.text}`}>{d.score}/{d.maxScore}점</span>
                      </div>
                      <h3 className={`text-sm font-bold ${sc.text} mb-1`}>{d.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{d.detail}</p>
                    </div>
                  </div>
                  {d.items && d.items.length > 0 && (
                    <div className="mt-2 pl-11">
                      {d.items.map((item, j) => (
                        <p key={j} className="text-xs text-slate-400">- {item}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Matching Analysis */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">매칭 분석</h2>
          <p className="text-sm text-slate-500 mb-8">수술기록과 재고 목록 간 불일치 현황 (제조사별)</p>

          {report.unmatchedItems.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-emerald-700 font-bold">모든 품목이 매칭됩니다</p>
            </div>
          ) : (() => {
            type MfrStat = { fixtureOnly: number; surgeryOnly: number };
            const stats: Record<string, MfrStat> = {};
            for (const item of report.unmatchedItems) {
              const mfr = item.manufacturer || '기타';
              if (!stats[mfr]) stats[mfr] = { fixtureOnly: 0, surgeryOnly: 0 };
              if (item.source === 'fixture_only') stats[mfr].fixtureOnly++;
              else stats[mfr].surgeryOnly++;
            }
            const entries: [string, MfrStat][] = Object.entries(stats).sort((a, b) => (b[1].fixtureOnly + b[1].surgeryOnly) - (a[1].fixtureOnly + a[1].surgeryOnly));
            const maxCount = Math.max(...entries.map(([, v]) => v.fixtureOnly + v.surgeryOnly));
            const totalFixtureOnly = report.unmatchedItems.filter(i => i.source === 'fixture_only').length;
            const totalSurgeryOnly = report.unmatchedItems.filter(i => i.source === 'surgery_only').length;

            return (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
                    <div className="text-3xl font-black text-slate-800">{report.unmatchedItems.length}</div>
                    <div className="text-xs text-slate-500 mt-1">총 불일치</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-blue-200 p-5 text-center">
                    <div className="text-3xl font-black text-blue-600">{totalFixtureOnly}</div>
                    <div className="text-xs text-blue-500 mt-1">재고목록만</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-amber-200 p-5 text-center">
                    <div className="text-3xl font-black text-amber-600">{totalSurgeryOnly}</div>
                    <div className="text-xs text-amber-500 mt-1">수술기록만</div>
                  </div>
                </div>

                {/* Manufacturer bar chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-600 mb-5 uppercase tracking-wider">제조사별 불일치 현황</h3>
                  <div className="space-y-4">
                    {entries.map(([mfr, counts]) => {
                      const total = counts.fixtureOnly + counts.surgeryOnly;
                      const fixturePercent = (counts.fixtureOnly / maxCount) * 100;
                      const surgeryPercent = (counts.surgeryOnly / maxCount) * 100;
                      return (
                        <div key={mfr}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-slate-700">{mfr}</span>
                            <span className="text-xs font-bold text-slate-400">{total}건</span>
                          </div>
                          <div className="flex gap-1 h-7">
                            {counts.fixtureOnly > 0 && (
                              <div
                                className="bg-blue-400 rounded-md flex items-center justify-center transition-all duration-700"
                                style={{ width: `${Math.max(fixturePercent, 4)}%` }}
                              >
                                <span className="text-[10px] font-bold text-white">{counts.fixtureOnly}</span>
                              </div>
                            )}
                            {counts.surgeryOnly > 0 && (
                              <div
                                className="bg-amber-400 rounded-md flex items-center justify-center transition-all duration-700"
                                style={{ width: `${Math.max(surgeryPercent, 4)}%` }}
                              >
                                <span className="text-[10px] font-bold text-white">{counts.surgeryOnly}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm bg-blue-400"></span>
                      <span className="text-slate-500">재고목록만 (Dead Stock 후보)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
                      <span className="text-slate-500">수술기록만 (미등록 품목)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Section 4: Usage Patterns */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">사용 패턴 분석</h2>
          <p className="text-sm text-slate-500 mb-6">
            분석기간 : {report.usagePatterns.periodMonths}개월
          </p>

          {/* Surgery & Implant Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* 수술 건수 */}
            <div className="bg-slate-50 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">수술 건수</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-black text-slate-900">{report.usagePatterns.totalSurgeries}</span>
                <span className="text-base font-bold text-slate-400">건</span>
                <span className="text-sm text-slate-400">(월평균 {report.usagePatterns.monthlyAvgSurgeries}건)</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                    <span className="text-sm text-slate-600">1차 수술 (식립)</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{report.usagePatterns.primarySurgeries}건</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
                    <span className="text-sm text-slate-600">2차 수술 (보험청구)</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{report.usagePatterns.secondarySurgeries}건</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                    <span className="text-sm text-slate-600">수술중 FAIL</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{report.usagePatterns.failSurgeries}건</span>
                </div>
              </div>
            </div>
            {/* 임플란트 사용 개수 */}
            {(() => {
              const totalUsage = report.usagePatterns.fixtureUsageCount + report.usagePatterns.insuranceClaimCount + report.usagePatterns.failUsageCount;
              const monthlyAvgUsage = report.usagePatterns.periodMonths > 0 ? (totalUsage / report.usagePatterns.periodMonths).toFixed(1) : '0';
              return (
                <div className="bg-slate-50 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">임플란트 사용 개수</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-slate-900">{totalUsage}</span>
                    <span className="text-base font-bold text-slate-400">개</span>
                    <span className="text-sm text-slate-400">(월평균 {monthlyAvgUsage}개)</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                        <span className="text-sm text-slate-600">픽스쳐 사용</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{report.usagePatterns.fixtureUsageCount}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
                        <span className="text-sm text-slate-600">보험임플란트 청구</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{report.usagePatterns.insuranceClaimCount}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                        <span className="text-sm text-slate-600">수술중 FAIL</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{report.usagePatterns.failUsageCount}개</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Used Items */}
            <div className="bg-slate-50 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-5 uppercase tracking-wider">TOP 사용 품목</h3>
              {report.usagePatterns.topUsedItems.length > 0 ? (
                <BarChart
                  items={report.usagePatterns.topUsedItems.slice(0, 5).map(t => ({
                    label: `${t.manufacturer} ${t.brand} ${t.size}`.trim(),
                    value: t.count
                  }))}
                  maxValue={Math.max(...report.usagePatterns.topUsedItems.map(t => t.count))}
                />
              ) : (
                <p className="text-sm text-slate-400">수술기록 데이터가 부족합니다.</p>
              )}
            </div>
            {/* Manufacturer Distribution */}
            <div className="bg-slate-50 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-5 uppercase tracking-wider">제조사별 분포</h3>
              <DonutChart data={report.usagePatterns.manufacturerDistribution} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Recommendations */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">개선 권장사항</h2>
          <div className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-4 bg-white rounded-xl p-5 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5.5: Email Lead Collection */}
      <section className="py-12 bg-white">
        <div className="max-w-2xl mx-auto px-6 space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2">먼저 확인할 핵심 인사이트</p>
            <ul className="space-y-1.5">
              {quickInsights.map((insight, index) => (
                <li key={index} className="text-sm text-indigo-900 font-semibold">
                  {index + 1}. {insight}
                </li>
              ))}
            </ul>
          </div>

          {emailSent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-emerald-900 mb-2">접수 완료: {leadSuccessCta.title}</h3>
              <p className="text-sm text-emerald-700 font-semibold mb-1">처리 예상시간: {leadSuccessCta.eta}</p>
              <p className="text-sm text-emerald-700 mb-6">{leadSuccessCta.detail}</p>
              <button
                onClick={leadSuccessCta.onClick}
                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors"
              >
                다음 단계: {leadSuccessCta.ctaLabel}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">분석 결과를 저장하고 다음 단계를 받아보세요</h3>
                <p className="text-sm text-slate-500">최소 입력(이메일)만으로 결과 저장이 가능합니다.</p>
              </div>
              <div className="space-y-3 max-w-sm mx-auto">
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => updateLeadEmail(e.target.value)}
                  placeholder="이메일 주소 *"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500">입력하신 이메일은 결과 전달 및 후속 안내 목적으로만 사용합니다.</p>

                {/* 상세 분석 체크박스 */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={wantDetailedAnalysis}
                    onChange={(e) => updateWantDetailedAnalysis(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-800">상세 분석 및 입력환경 최적화 요청</span>
                    <p className="text-xs text-slate-400 mt-0.5">현장 방문을 통한 정밀 재고 분석과 맞춤 입력환경을 제안해드립니다.</p>
                  </div>
                </label>

                {/* 상세 분석 추가 필드 */}
                {wantDetailedAnalysis && (
                  <div className="space-y-3 pt-1">
                    {/* 진행 체크리스트 */}
                    <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg">
                      {[
                        { label: '병원명', filled: !!leadHospital },
                        { label: '지역', filled: !!leadRegion },
                        { label: '연락처', filled: !!leadContact },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-1 text-xs font-bold ${item.filled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {item.filled ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                          )}
                          {item.label}
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={leadHospital}
                      onChange={(e) => updateLeadHospital(e.target.value)}
                      placeholder="병원명 *"
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadHospital ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                    />
                    <input
                      type="text"
                      value={leadRegion}
                      onChange={(e) => updateLeadRegion(e.target.value)}
                      placeholder="지역 (예: 서울 강남구) *"
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadRegion ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                    />
                    <input
                      type="tel"
                      value={leadContact}
                      onChange={(e) => updateLeadContact(e.target.value)}
                      placeholder="연락처 *"
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadContact ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                    />
                    <p className="text-xs text-slate-500">연락처는 분석 결과 브리핑 일정 조율 용도로만 사용합니다.</p>
                    {/* 버튼 비활성 이유 */}
                    {(!leadHospital || !leadRegion || !leadContact) && (
                      <p className="text-xs text-amber-600 text-center">
                        {[!leadHospital && '병원명', !leadRegion && '지역', !leadContact && '연락처'].filter(Boolean).join(', ')}을(를) 입력하면 요청할 수 있어요
                      </p>
                    )}
                  </div>
                )}

                {leadSubmitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 space-y-2">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span>{leadSubmitError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLeadSubmit}
                      disabled={leadSubmitDisabled}
                      className="w-full py-2 text-xs font-bold rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      다시 전송
                    </button>
                  </div>
                )}
                <button
                  onClick={handleLeadSubmit}
                  disabled={leadSubmitDisabled}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingLead ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      전송 중...
                    </>
                  ) : (
                    wantDetailedAnalysis ? '상세 분석 요청하기' : '분석결과 받기'
                  )}
                </button>
                {leadSubmitBlockReason && !isSubmittingLead && (
                  <p className="text-xs text-amber-600 text-center">{leadSubmitBlockReason}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 6: Next Action */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-3">이 진단을 매일 자동으로 받아보세요</h2>
          <p className="text-slate-400 mb-8">DenJOY가 수술기록을 업로드할 때마다 재고를 자동 관리하고, 데이터 품질을 유지합니다.</p>
          <button
            onClick={onSignup}
            className="px-10 py-4 bg-white text-slate-900 text-lg font-black rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
          >
            무료로 시작하기
          </button>
          <p className="text-xs text-slate-500 mt-3">{analyzeTrialFootnoteText}</p>
          <button
            onClick={onContact}
            className="mt-4 text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            정밀 분석 문의하기
          </button>
        </div>
      </section>
    </div>
  );
};

export default AnalyzePage;
