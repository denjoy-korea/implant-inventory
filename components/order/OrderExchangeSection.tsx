interface ExchangeEntry {
  manufacturer: string;
  count: number;
  returnPending: number;
  actualCount: number;
}

interface ExchangeCandidates {
  list: ExchangeEntry[];
  total: number;
  totalActual: number;
}

interface Props {
  exchangeCandidates: ExchangeCandidates;
  isReadOnly?: boolean;
  handleExchangeCandidateClick: (manufacturer: string, actualCount: number) => void;
}

export function OrderExchangeSection({
  exchangeCandidates,
  isReadOnly,
  handleExchangeCandidateClick,
}: Props) {
  if (exchangeCandidates.total === 0) return null;

  const activeList = exchangeCandidates.list.filter(e => e.actualCount > 0);
  const pendingList = exchangeCandidates.list.filter(e => e.returnPending > 0 && e.actualCount === 0);

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">반품 권장 품목</h3>
          <span className="text-xs font-black text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg">{exchangeCandidates.totalActual}건 미처리</span>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">수술 중 교환이 발생한 품목입니다. 제조사에 반품 처리를 진행하세요.</p>
      </div>
      <div className="px-5 sm:px-7 pb-5 sm:pb-6">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {activeList.map(({ manufacturer, actualCount, returnPending }) => (
            <button
              key={manufacturer}
              onClick={() => handleExchangeCandidateClick(manufacturer, actualCount)}
              disabled={isReadOnly}
              className="flex flex-col gap-0.5 bg-violet-50 border border-violet-100 rounded-2xl px-3 py-2.5 text-left sm:p-4 sm:border-2 sm:border-violet-200 sm:bg-gradient-to-br sm:from-violet-50/80 sm:to-purple-50/40 sm:hover:shadow-md sm:hover:border-violet-400 active:scale-[0.97] sm:active:scale-[0.98] transition-all disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="text-[11px] font-black text-slate-700 truncate w-full sm:text-xs">{manufacturer}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-violet-600 tabular-nums leading-none sm:text-2xl">{actualCount}</span>
                <span className="text-[10px] font-bold text-slate-400 sm:text-xs">건</span>
              </div>
              {returnPending > 0
                ? <span className="text-[10px] font-bold text-amber-500">+대기중 {returnPending}건</span>
                : <span className="text-[10px] font-bold text-violet-400">반품 가능</span>
              }
            </button>
          ))}
          {pendingList.map(({ manufacturer, returnPending }) => (
            <div
              key={`pending-${manufacturer}`}
              className="flex flex-col gap-0.5 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5 text-left opacity-80 sm:p-4 sm:border-2 sm:border-amber-200 sm:bg-gradient-to-br sm:from-amber-50/80 sm:to-orange-50/40"
            >
              <span className="text-[11px] font-black text-slate-600 truncate w-full sm:text-xs">{manufacturer}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-amber-600 tabular-nums leading-none sm:text-2xl">{returnPending}</span>
                <span className="text-[10px] font-bold text-slate-400 sm:text-xs">건</span>
              </div>
              <span className="text-[10px] font-bold text-amber-500">반품 진행중</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
