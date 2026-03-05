import React from 'react';

interface AnalyzeReportRecommendationsSectionProps {
  recommendations: string[];
}

const AnalyzeReportRecommendationsSection: React.FC<AnalyzeReportRecommendationsSectionProps> = ({ recommendations }) => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">개선 권장사항 요약</h2>
          <p className="text-slate-500 font-medium">진단 결과를 바탕으로 한 시스템 도입 시 최우선 해결 과제입니다.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex gap-4 bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="relative w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base flex-shrink-0 shadow-md">
                <span className="relative z-10">{i + 1}</span>
                <div className="absolute inset-0 rounded-xl bg-indigo-400 blur-sm opacity-50 z-0"></div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium pt-1">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnalyzeReportRecommendationsSection;
