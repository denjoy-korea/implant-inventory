import React from 'react';
import type { AnalysisReport } from '../../../../types';
import { statusColorMap } from '../../analyzeHelpers';

interface AnalyzeDiagnosticCardProps {
  diagnostic: AnalysisReport['diagnostics'][number];
  onOpenSizeFormatDetail: (items: string[]) => void;
}

const AnalyzeDiagnosticCard: React.FC<AnalyzeDiagnosticCardProps> = ({ diagnostic, onOpenSizeFormatDetail }) => {
  const sc = statusColorMap[diagnostic.status];
  const isSizeFormatDiagnostic = diagnostic.category === '사이즈 포맷 일관성';

  return (
    <div className={`group rounded-3xl border ${sc.border} ${sc.bg} p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden bg-white`}>
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${diagnostic.status === 'good' ? 'from-emerald-500 to-teal-500' : diagnostic.status === 'warning' ? 'from-amber-400 to-orange-400' : 'from-rose-500 to-red-500'} rounded-3xl blur opacity-0 group-hover:opacity-15 transition duration-500 z-0`}></div>

      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl ${sc.iconBg} flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm border border-white`}>
            {sc.icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{diagnostic.category}</span>
              <span className={`text-sm font-black ${sc.text} bg-white px-2.5 py-0.5 rounded-full shadow-sm border ${sc.border}`}>
                {diagnostic.score}/{diagnostic.maxScore}점
              </span>
            </div>
            <h3 className={`text-base font-black ${sc.text} mb-2`}>{diagnostic.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{diagnostic.detail}</p>
          </div>
        </div>

        {isSizeFormatDiagnostic && diagnostic.items && diagnostic.items.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-slate-100 pl-14">
            <button
              type="button"
              onClick={() => onOpenSizeFormatDetail(diagnostic.items || [])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              상세보기
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : diagnostic.items && diagnostic.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 pl-14">
            <ul className="space-y-1.5">
              {diagnostic.items.map((item, j) => (
                <li key={j} className="text-xs text-slate-500 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzeDiagnosticCard;
