import React from 'react';

const DEMO_RECORDS = [
  { brand: 'Osstem', item: 'TSIII SA Ø4.0×10', date: '2026-02-15', status: '처리완료' },
  { brand: '덴티움', item: 'SuperLine Ø4.5×10', date: '2026-02-22', status: '처리완료' },
  { brand: 'Straumann', item: 'BLT SLA Ø4.1×12', date: '2026-03-01', status: '대기중' },
  { brand: 'Osstem', item: 'TSIII SA Ø3.5×10', date: '2026-03-03', status: '대기중' },
  { brand: 'Neobiotech', item: 'ISM Ø4.0×8.5', date: '2026-03-04', status: '대기중' },
];

interface Props {
  onUpgrade: () => void;
  onClose: () => void;
}

export default function FailManagementDemo({ onUpgrade, onClose }: Props) {
  return (
    <div className="relative w-full">
      {/* DEMO 워터마크 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="text-slate-200 font-black text-[80px] rotate-[-20deg] select-none opacity-30 tracking-widest">DEMO</span>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 pt-4 pb-3">
        {[
          { label: '이번달 교환', value: '3', unit: '건', color: 'text-rose-600 bg-rose-50' },
          { label: '누적 교환', value: '8', unit: '건', color: 'text-slate-700 bg-slate-50' },
          { label: '교환율', value: '8.3', unit: '%', color: 'text-amber-600 bg-amber-50' },
          { label: '처리 완료', value: '3', unit: '건', color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className={`${color} rounded-xl p-2.5 text-center`}>
            <p className="text-[9px] font-bold text-current opacity-60 mb-0.5">{label}</p>
            <p className="text-base font-black tabular-nums">
              {value}<span className="text-[10px] font-semibold ml-0.5">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 레코드 리스트 */}
      <div className="px-4 pb-2 space-y-1.5">
        {DEMO_RECORDS.map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{r.brand} · {r.item}</p>
              <p className="text-[10px] text-slate-400">{r.date}</p>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
              r.status === '처리완료'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>

      {/* 업그레이드 CTA 바 */}
      <div className="mx-4 mb-4 mt-3 bg-indigo-600 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-white">실제 데이터로 교환 관리를 시작하세요</p>
          <p className="text-[10px] text-indigo-200 mt-0.5">Basic 플랜부터 이용 가능</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="text-[11px] font-bold text-indigo-300 hover:text-white transition-colors"
          >
            닫기
          </button>
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 bg-white text-indigo-700 text-xs font-black rounded-lg hover:bg-indigo-50 transition-colors"
          >
            업그레이드 →
          </button>
        </div>
      </div>
    </div>
  );
}
