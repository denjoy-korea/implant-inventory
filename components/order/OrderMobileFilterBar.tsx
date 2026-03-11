type FilterType = 'all' | 'replenishment' | 'fail_exchange' | 'return' | 'fail_and_return';

interface Props {
  filterType: FilterType;
  setFilterType: (t: FilterType) => void;
  filterManufacturer: string;
  setFilterManufacturer: (m: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (d: string) => void;
  filterDateTo: string;
  setFilterDateTo: (d: string) => void;
  manufacturerOptions: string[];
  totalCount: number;
}

const TYPE_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'replenishment', label: '발주' },
  { key: 'fail_exchange', label: '교환' },
  { key: 'return', label: '반품' },
];

export function OrderMobileFilterBar({
  filterType,
  setFilterType,
  filterManufacturer,
  setFilterManufacturer,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  manufacturerOptions,
  totalCount,
}: Props) {
  const hasDateFilter = filterDateFrom || filterDateTo;

  return (
    <div className="md:hidden px-3 pt-3 space-y-2">
      {/* 타입 필터 칩 */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black transition-all border ${
              filterType === tab.key
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="flex-shrink-0 ml-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {totalCount}건
        </span>
      </div>

      {/* 날짜 범위 필터 */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        />
        <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">~</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        />
        {hasDateFilter && (
          <button
            onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 제조사 필터 */}
      {manufacturerOptions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setFilterManufacturer('')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
              filterManufacturer === ''
                ? 'bg-slate-700 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            전체 제조사
          </button>
          {manufacturerOptions.map(mfr => (
            <button
              key={mfr}
              onClick={() => setFilterManufacturer(filterManufacturer === mfr ? '' : mfr)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border truncate max-w-[120px] ${
                filterManufacturer === mfr
                  ? 'bg-slate-700 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
              }`}
            >
              {mfr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
