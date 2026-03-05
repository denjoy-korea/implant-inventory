import React from 'react';
import type { AnalysisReport } from '../../../types';

interface AnalyzeReportMatchingSectionProps {
  unmatchedItems: AnalysisReport['unmatchedItems'];
}

const AnalyzeReportMatchingSection: React.FC<AnalyzeReportMatchingSectionProps> = ({ unmatchedItems }) => {
  if (unmatchedItems.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mb-4 shadow-sm border border-indigo-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">수술기록 ↔ 재고목록 매칭 분석</h2>
            <p className="text-slate-500 font-medium">실제 사용된 임플란트가 시스템에 얼마나 잘 등록되어 있는지 확인합니다.</p>
          </div>

          <div className="text-center py-16 bg-gradient-to-b from-emerald-50 to-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-900/5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-xl text-emerald-800 font-black mb-2 tracking-tight">완벽합니다! 모든 데이터가 일치합니다.</p>
            <p className="text-sm text-emerald-600/80 font-medium">재고 누수 없이 매우 우수하게 관리되고 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  type MfrStat = { fixtureOnly: number; surgeryOnly: number };
  const stats: Record<string, MfrStat> = {};
  for (const item of unmatchedItems) {
    const mfr = item.manufacturer || '기타';
    if (!stats[mfr]) stats[mfr] = { fixtureOnly: 0, surgeryOnly: 0 };
    if (item.source === 'fixture_only') stats[mfr].fixtureOnly++;
    else stats[mfr].surgeryOnly++;
  }
  const entries: [string, MfrStat][] = Object.entries(stats).sort((a, b) => (b[1].fixtureOnly + b[1].surgeryOnly) - (a[1].fixtureOnly + a[1].surgeryOnly));
  const maxCount = Math.max(...entries.map(([, v]) => v.fixtureOnly + v.surgeryOnly));
  const totalFixtureOnly = unmatchedItems.filter(i => i.source === 'fixture_only').length;
  const totalSurgeryOnly = unmatchedItems.filter(i => i.source === 'surgery_only').length;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mb-4 shadow-sm border border-indigo-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">수술기록 ↔ 재고목록 매칭 분석</h2>
          <p className="text-slate-500 font-medium">실제 사용된 임플란트가 시스템에 얼마나 잘 등록되어 있는지 확인합니다.</p>
        </div>

        <div className="space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-50 rounded-3xl p-6 text-center shadow-inner border border-slate-100">
              <div className="text-4xl font-black text-slate-800 mb-1">{unmatchedItems.length}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">총 불일치 건수</div>
            </div>
            <div className="bg-blue-50/50 rounded-3xl p-6 text-center border border-blue-100 hover:shadow-lg hover:shadow-blue-900/5 transition-all">
              <div className="text-4xl font-black text-blue-600 mb-1">{totalFixtureOnly}</div>
              <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">수술기록 누락 (Dead Stock 후보)</div>
            </div>
            <div className="bg-amber-50/50 rounded-3xl p-6 text-center border border-amber-100 hover:shadow-lg hover:shadow-amber-900/5 transition-all">
              <div className="text-4xl font-black text-amber-600 mb-1">{totalSurgeryOnly}</div>
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">재고등록 누락 (미등록 사용)</div>
            </div>
          </div>

          {/* Manufacturer bar chart */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">제조사별 불일치 비중 (Top)</h3>
            </div>
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
      </div>
    </section>
  );
};

export default AnalyzeReportMatchingSection;
