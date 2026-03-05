import React from 'react';

interface AnalyzeUploadActionSectionProps {
  isAnalyzeDisabled: boolean;
  analyzeDisabledReasons: string[];
  handleAnalyze: () => void;
}

const AnalyzeUploadActionSection: React.FC<AnalyzeUploadActionSectionProps> = ({
  isAnalyzeDisabled,
  analyzeDisabledReasons,
  handleAnalyze,
}) => {
  return (
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
  );
};

export default AnalyzeUploadActionSection;
