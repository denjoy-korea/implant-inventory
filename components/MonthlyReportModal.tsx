import React, { useMemo, useState } from 'react';
import { ExcelRow } from '../types';
import ModalShell from './shared/ModalShell';

interface MonthlyReportModalProps {
  rows: ExcelRow[];
  onClose: () => void;
  hospitalId?: string;
}

function parseMonthKey(rawDate: string): string | null {
  const match = String(rawDate).trim().match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ rows, onClose }) => {
  const cleanRows = useMemo(
    () => rows.filter(row => !Object.values(row).some(v => String(v).includes('합계'))),
    [rows],
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    cleanRows.forEach(row => {
      const key = parseMonthKey(String(row['날짜'] || ''));
      if (key) set.add(key);
    });
    return Array.from(set).sort().reverse(); // newest first
  }, [cleanRows]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => availableMonths[0] ?? '');

  const report = useMemo(() => {
    if (!selectedMonth) return null;

    const monthRows = cleanRows.filter(row => parseMonthKey(String(row['날짜'] || '')) === selectedMonth);

    let sillib = 0, exchange = 0, claim = 0, total = 0;
    const mfrMap: Record<string, number> = {};

    monthRows.forEach(row => {
      const cls = String(row['구분'] || '');
      const qty = Number(row['갯수']) || 1;
      total += qty;
      if (cls === '식립') {
        sillib += qty;
        const mfr = String(row['제조사'] || '기타').trim() || '기타';
        mfrMap[mfr] = (mfrMap[mfr] || 0) + qty;
      } else if (cls === '수술중교환') {
        exchange += qty;
      } else if (cls === '청구') {
        claim += qty;
      }
    });

    const failRate = sillib > 0 ? ((exchange / sillib) * 100) : 0;

    const mfrRanking = Object.entries(mfrMap)
      .map(([name, count]) => ({ name, count, pct: sillib > 0 ? (count / sillib) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { sillib, exchange, claim, total, failRate, mfrRanking, rowCount: monthRows.length };
  }, [cleanRows, selectedMonth]);

  if (availableMonths.length === 0) {
    return (
      <ModalShell isOpen={true} onClose={onClose} title="월간 리포트" titleId="monthly-report-title" maxWidth="max-w-xs" className="p-8 text-center">
        <p className="text-sm font-bold text-slate-500">수술기록 데이터가 없어 리포트를 생성할 수 없습니다.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">닫기</button>
      </ModalShell>
    );
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title="월간 리포트" titleId="monthly-report-title" maxWidth="max-w-2xl" className="max-h-[90vh] flex flex-col print:shadow-none print:rounded-none print:max-h-none print:fixed print:inset-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 id="monthly-report-title" className="text-sm font-black text-slate-800">월간 리포트</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              인쇄
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Print header (visible only when printing) */}
        <div className="hidden print:block px-6 pt-6 pb-2">
          <h1 className="text-xl font-black text-slate-900">수술기록 월간 리포트</h1>
          <p className="text-sm text-slate-600 mt-1">{selectedMonth ? formatMonthLabel(selectedMonth) : ''}</p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 print:overflow-visible">
          {!report || report.rowCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm font-bold text-slate-400">선택한 월의 데이터가 없습니다.</p>
            </div>
          ) : (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="식립" value={report.sillib} unit="건" color="indigo" />
                <KpiCard label="수술중교환" value={report.exchange} unit="건" color={report.exchange > 0 ? 'rose' : 'slate'} />
                <KpiCard label="청구" value={report.claim} unit="건" color="slate" />
                <KpiCard
                  label="교환율"
                  value={report.failRate.toFixed(1)}
                  unit="%"
                  color={report.failRate > 15 ? 'rose' : report.failRate > 8 ? 'amber' : 'emerald'}
                />
              </div>

              {/* Manufacturer ranking */}
              {report.mfrRanking.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-xs font-black text-slate-700 mb-3">제조사별 식립</h3>
                  <div className="space-y-2">
                    {report.mfrRanking.map(({ name, count, pct }, idx) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className={`w-4 text-[10px] font-black text-right shrink-0 ${idx === 0 ? 'text-indigo-500' : 'text-slate-300'}`}>
                          {idx + 1}
                        </span>
                        <span className="w-20 text-xs font-semibold text-slate-600 truncate shrink-0">{name}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${idx === 0 ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                            style={{ width: `${Math.round(pct)}%` }}
                          />
                        </div>
                        <span className="w-12 text-xs font-bold text-slate-700 text-right shrink-0 tabular-nums">
                          {count}건
                        </span>
                        <span className="w-10 text-[10px] font-semibold text-slate-400 text-right shrink-0 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary note */}
              <p className="text-[10px] text-slate-400 text-center">
                총 {report.rowCount.toLocaleString()}개 레코드 기준 · 식립/수술중교환/청구 수량 합산
              </p>
            </>
          )}
        </div>
  </ModalShell>
  );
};

interface KpiCardProps {
  label: string;
  value: number | string;
  unit: string;
  color: 'indigo' | 'rose' | 'amber' | 'emerald' | 'slate';
}

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-400' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   sub: 'text-rose-400' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  sub: 'text-amber-400' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-700',sub: 'text-emerald-400' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  sub: 'text-slate-400' },
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, color }) => {
  const c = COLOR_MAP[color];
  return (
    <div className={`${c.bg} rounded-xl p-3`}>
      <p className={`text-[10px] font-bold ${c.sub} uppercase tracking-wide`}>{label}</p>
      <p className={`text-xl font-black tabular-nums mt-1 ${c.text}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        <span className={`text-xs font-semibold ml-0.5 ${c.sub}`}>{unit}</span>
      </p>
    </div>
  );
};

export default MonthlyReportModal;
