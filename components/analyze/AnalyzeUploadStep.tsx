import React from 'react';
import PublicInfoFooter from '../shared/PublicInfoFooter';

interface UploadRequirement {
  label: string;
  detail?: string;
  status: 'done' | 'pending' | 'warning';
}

interface AnalyzeUploadStepProps {
  fixtureFile: File | null;
  setFixtureFile: React.Dispatch<React.SetStateAction<File | null>>;
  surgeryFiles: File[];
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
  uploadFormatWarning: string;
  error: string | null;
  fixtureDrop: React.RefObject<HTMLDivElement | null>;
  surgeryDrop: React.RefObject<HTMLDivElement | null>;
  uploadRequirements: UploadRequirement[];
  analyzeDisabledReasons: string[];
  isAnalyzeDisabled: boolean;
  handleFixtureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: React.DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleAnalyze: () => void;
}

const AnalyzeUploadStep: React.FC<AnalyzeUploadStepProps> = ({
  fixtureFile,
  setFixtureFile,
  surgeryFiles,
  demoVideoUrl,
  isVideoLoading,
  uploadFormatWarning,
  error,
  fixtureDrop,
  surgeryDrop,
  uploadRequirements,
  analyzeDisabledReasons,
  isAnalyzeDisabled,
  handleFixtureChange,
  handleSurgeryChange,
  removeSurgeryFile,
  handleDrop,
  handleDragOver,
  handleAnalyze,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-6 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-glow"></span>
            <span className="text-sm font-bold text-emerald-700">무료 데이터 품질 진단</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
            우리 병원 임플란트 데이터,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse-glow">
              얼마나 잘 관리되고 있을까요?
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
            픽스쳐 재고 파일과 수술기록지를 업로드하면,<br />
            데이터 품질을 6가지 항목으로 정밀히 진단해드립니다.
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
            className={`group relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${fixtureFile ? 'border-emerald-400 bg-emerald-50/50 shadow-emerald-100/50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-emerald-100/40'}`}
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
                <button
                  type="button"
                  onClick={() => setFixtureFile(null)}
                  aria-label="업로드한 재고 목록 파일 삭제"
                  className="text-slate-400 hover:text-rose-500 ml-1"
                >
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
            className={`group relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${surgeryFiles.length > 0 ? 'border-indigo-400 bg-indigo-50/50 shadow-indigo-100/50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-indigo-100/40'}`}
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
                    <button
                      type="button"
                      onClick={() => removeSurgeryFile(i)}
                      aria-label={`업로드한 수술기록 파일 ${f.name} 삭제`}
                      className="text-slate-400 hover:text-rose-500"
                    >
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
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold border flex flex-col justify-center ${isDone
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
                  {item.detail && (
                    <span className={`block mt-1 pl-5 text-[10.5px] font-medium tracking-tight ${isDone ? 'text-emerald-600/80' : 'text-slate-400'}`}>
                      {item.detail}
                    </span>
                  )}
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
        <div className="text-center mt-12">
          <div className="relative inline-block group">
            {!isAnalyzeDisabled && (
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse-glow z-0"></div>
            )}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzeDisabled}
              className={`relative px-12 py-4.5 text-lg font-black rounded-2xl transition-all duration-300 overflow-hidden z-10 ${isAnalyzeDisabled ? 'bg-slate-200 text-slate-400 shadow-none hover:translate-y-0 cursor-not-allowed' : 'bg-slate-900 text-white shadow-2xl hover:shadow-slate-900/40 hover:-translate-y-1 active:scale-95'}`}
            >
              {!isAnalyzeDisabled && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              )}
              분석 시작
            </button>
          </div>
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

      <PublicInfoFooter showLegalLinks />
    </div>
  );
};

export default AnalyzeUploadStep;
