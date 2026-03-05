import React from 'react';
import type { AnalysisReport } from '../../../../types';
import { ScoreGauge } from '../../AnalyzeCharts';
import { getGrade, gradeColorMap } from '../../analyzeHelpers';
import AnalyzeOverviewSummaryStatsGrid from './AnalyzeOverviewSummaryStatsGrid';

interface AnalyzeOverviewScoreSectionProps {
  report: AnalysisReport;
}

const AnalyzeOverviewScoreSection: React.FC<AnalyzeOverviewScoreSectionProps> = ({ report }) => {
  const grade = getGrade(report.dataQualityScore);
  const colors = gradeColorMap[grade.color];

  return (
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

        <AnalyzeOverviewSummaryStatsGrid summary={report.summary} />
      </div>
    </section>
  );
};

export default AnalyzeOverviewScoreSection;
