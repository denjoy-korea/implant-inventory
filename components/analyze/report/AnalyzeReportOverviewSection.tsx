import React from 'react';
import type { AnalysisReport } from '../../../types';
import { ScoreGauge } from '../AnalyzeCharts';
import { getGrade, gradeColorMap } from '../analyzeHelpers';

interface AnalyzeReportOverviewSectionProps {
  report: AnalysisReport;
}

const AnalyzeReportOverviewSection: React.FC<AnalyzeReportOverviewSectionProps> = ({ report }) => {
  const grade = getGrade(report.dataQualityScore);
  const colors = gradeColorMap[grade.color];

  return (
    <>
      {/* Section 1: Overall Score */}
      <section className="bg-slate-900 text-white pt-16 pb-20 relative overflow-hidden">
        {/* 장식용 글로우 배경 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700/50 mb-8 shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-300">분석 데이터는 서버에 저장되지 않고 보호됩니다</span>
          </div>
          <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 uppercase tracking-[0.2em] mb-6">데이터 품질 진단 결과</h2>
          <div className="relative inline-block drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            <ScoreGauge score={report.dataQualityScore} color={grade.color} />
          </div>
          <div className="mt-6 inline-flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-base font-black ${colors.bg} text-white`}>
              {grade.label}등급
            </span>
            <span className="text-lg text-slate-200 font-medium">{grade.text}</span>
          </div>
          {/* Summary stats */}
          <div className="mt-12 grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: '전체 품목', value: report.summary.totalFixtureItems },
              { label: '사용 품목', value: report.summary.activeItems },
              { label: '매칭 품목', value: report.summary.usedItems },
              { label: 'Dead Stock', value: report.summary.deadStockItems },
              { label: '미등록 품목', value: report.summary.surgeryOnlyItems },
              { label: '표기 변형', value: report.summary.nameVariants },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl py-4 px-2 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-colors shadow-lg">
                <div className="text-3xl font-black text-white tabular-nums drop-shadow-md">{s.value}</div>
                <div className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">{s.label}</div>
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
              { name: '교환 항목 분리 관리', pts: 15, desc: '재고 목록에 교환 픽스처 별도 분류 여부' },
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
    </>
  );
};

export default AnalyzeReportOverviewSection;
