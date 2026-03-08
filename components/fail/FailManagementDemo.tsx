const DEMO_RECORDS = [
  { brand: 'Osstem', item: 'TSIII SA Ø4.0×10', date: '2026-02-15', status: '교환완료', pending: false },
  { brand: '덴티움', item: 'SuperLine Ø4.5×10', date: '2026-02-22', status: '교환완료', pending: false },
  { brand: 'Straumann', item: 'BLT SLA Ø4.1×12', date: '2026-03-01', status: '반품대기', pending: true },
  { brand: 'Osstem', item: 'TSIII SA Ø3.5×10', date: '2026-03-03', status: '미처리', pending: true },
  { brand: 'Neobiotech', item: 'ISM Ø4.0×8.5', date: '2026-03-04', status: '미처리', pending: true },
];

const DEMO_MANUFACTURERS = ['전체', 'Osstem', '덴티움', 'Straumann', 'Neobiotech'];

interface Props {
  onUpgrade: () => void;
  onClose: () => void;
}

export default function FailManagementDemo({ onUpgrade, onClose }: Props) {
  return (
    <div className="relative w-full space-y-3 p-4">
      {/* DEMO 워터마크 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="text-slate-200 font-black text-[80px] rotate-[-20deg] select-none opacity-25 tracking-widest">DEMO</span>
      </div>

      {/* 헤더 Strip */}
      <div className="bg-white rounded-2xl border border-slate-100 px-5 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-500">데이터 기간</h4>
            <p className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">2025-12 ~ 2026-03</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div>
            <h4 className="text-xs font-semibold text-slate-500">총 교환 레코드</h4>
            <p className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">8 <span className="text-xs font-semibold text-slate-400">건</span></p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div>
            <h4 className="text-xs font-semibold text-slate-500">총 식립 대비</h4>
            <p className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">96 <span className="text-xs font-semibold text-slate-400">건</span></p>
          </div>
        </div>
      </div>

      {/* KPI Strip (5열 — 실제 FailKpiStrip 동일 레이아웃) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-5 divide-x divide-slate-100">
          <div className="p-3.5">
            <h4 className="text-xs font-semibold text-slate-500">총 교환 발생</h4>
            <p className="text-xl font-bold text-slate-800 tabular-nums tracking-tight mt-1.5">8<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
          </div>
          <div className="p-3.5">
            <h4 className="text-xs font-semibold text-slate-500">반품 완료</h4>
            <p className="text-xl font-bold text-emerald-600 tabular-nums tracking-tight mt-1.5">5<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
          </div>
          <div className="p-3.5">
            <h4 className="text-xs font-semibold text-slate-500">미처리 잔여</h4>
            <p className="text-xl font-bold text-rose-500 tabular-nums tracking-tight mt-1.5">3<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
            <p className="text-[10px] font-bold text-rose-400 mt-0.5">⚠ 반품 필요</p>
          </div>
          <div className="p-3.5">
            <h4 className="text-xs font-semibold text-slate-500">교환율</h4>
            <p className="text-xl font-bold text-amber-500 tabular-nums tracking-tight mt-1.5">8.3<span className="text-xs font-semibold text-slate-400 ml-0.5">%</span></p>
          </div>
          <div className="p-3.5">
            <h4 className="text-xs font-semibold text-slate-500">월 평균</h4>
            <p className="text-xl font-bold text-slate-800 tabular-nums tracking-tight mt-1.5">2.0<span className="text-xs font-semibold text-slate-400 ml-1">건/월</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">4개월 기준</p>
          </div>
        </div>
      </div>

      {/* 제조사 필터 Pill */}
      <div className="bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm">
        <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {DEMO_MANUFACTURERS.map((m, i) => (
            <button
              key={m}
              disabled
              className={`flex items-center px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                i === 0
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400'
              }`}
            >
              {m}
              {i === 0 && (
                <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white">3</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 교환 기록 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 px-4 py-2 border-b border-slate-100 bg-slate-50/70">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">제조사</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">규격</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">날짜</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">상태</span>
        </div>
        {DEMO_RECORDS.map((r, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 items-center px-4 py-2.5 ${
              i < DEMO_RECORDS.length - 1 ? 'border-b border-slate-50' : ''
            } ${r.pending ? 'bg-rose-50/30' : ''}`}
          >
            <p className="text-xs font-bold text-slate-700 truncate">{r.brand}</p>
            <p className="text-xs text-slate-500 truncate">{r.item}</p>
            <p className="text-[10px] text-slate-400 whitespace-nowrap">{r.date}</p>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
              r.status === '교환완료'
                ? 'bg-emerald-100 text-emerald-700'
                : r.status === '반품대기'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
            }`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>

      {/* 업그레이드 CTA */}
      <div className="bg-indigo-600 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-white">실제 데이터로 교환 관리를 시작하세요</p>
          <p className="text-[10px] text-indigo-200 mt-0.5">Plus 플랜부터 이용 가능</p>
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
