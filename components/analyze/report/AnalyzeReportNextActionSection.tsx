import React from 'react';

interface AnalyzeReportNextActionSectionProps {
  onSignup: () => void;
  handleGoToConsultation: () => void;
  analyzeTrialFootnoteText: string;
}

const AnalyzeReportNextActionSection: React.FC<AnalyzeReportNextActionSectionProps> = ({
  onSignup,
  handleGoToConsultation,
  analyzeTrialFootnoteText,
}) => {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* 장식용 글로우 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-1/2 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
          이 진단을 매일 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">자동으로</span> 받아보세요
        </h2>
        <p className="text-lg text-indigo-200 mb-10 font-medium">DenJOY가 수술기록을 업로드할 때마다 재고를 자동 관리하고, 최고의 데이터 품질을 유지합니다.</p>

        <div className="relative group inline-block mb-3">
          <div className="absolute -inset-1 bg-gradient-to-r from-white/40 via-purple-300/40 to-indigo-300/40 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000"></div>
          <button
            onClick={onSignup}
            className="relative px-12 py-4 bg-white text-indigo-900 text-lg font-black rounded-2xl shadow-2xl hover:shadow-white/40 active:scale-95 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-900/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            무료로 시작하기
          </button>
        </div>
        <p className="text-xs text-indigo-300/70">{analyzeTrialFootnoteText}</p>
        <button
          onClick={handleGoToConsultation}
          className="mt-4 text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
        >
          정밀 분석 문의하기
        </button>
      </div>
    </section>
  );
};

export default AnalyzeReportNextActionSection;
