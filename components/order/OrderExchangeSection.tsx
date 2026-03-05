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

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">교환 권장 품목</h3>
          <span className="text-xs font-black text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg">{exchangeCandidates.totalActual}건 미처리</span>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">수술 중 교환이 발생한 품목입니다. 제조사에 반품 처리를 진행하세요.</p>
      </div>
      <div className="px-5 sm:px-7 pb-5 sm:pb-6">
        {/* 모바일 레이아웃 */}
        <div className="sm:hidden space-y-3">
          <button
            onClick={() => { if (!isReadOnly) window.location.hash = '#/dashboard/fail'; }}
            disabled={isReadOnly}
            className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-[0.98] ${isReadOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white shadow-sm shadow-violet-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            일괄교환
          </button>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {exchangeCandidates.list.map(({ manufacturer, actualCount, returnPending }) => (
              <button
                key={manufacturer}
                onClick={() => handleExchangeCandidateClick(manufacturer, actualCount)}
                disabled={isReadOnly || actualCount === 0}
                className={`flex-none flex flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left ${
                  returnPending > 0 && actualCount === 0
                    ? 'bg-amber-50 border border-amber-100 opacity-70'
                    : actualCount > 0 && !isReadOnly
                      ? 'bg-violet-50 border border-violet-100 active:scale-[0.97]'
                      : 'bg-violet-50 border border-violet-100'
                }`}
              >
                <span className="text-[11px] font-black text-slate-700 whitespace-nowrap truncate max-w-[100px]">{manufacturer}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xl font-black tabular-nums leading-none ${actualCount > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{actualCount}</span>
                  <span className="text-[10px] font-bold text-slate-400">건</span>
                </div>
                {returnPending > 0
                  ? <span className="text-[10px] font-bold text-amber-500">대기중 {returnPending}건</span>
                  : <span className="text-[10px] font-bold text-violet-400">반품 가능</span>
                }
              </button>
            ))}
          </div>
        </div>
        {/* 데스크톱 레이아웃 */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => { if (isReadOnly) return; window.location.hash = '#/dashboard/fail'; }}
            disabled={isReadOnly}
            className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-violet-300 bg-white hover:bg-violet-50 hover:shadow-md hover:border-violet-400 cursor-pointer active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span className="text-xs font-black text-violet-600">일괄교환</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">교환 주문 일괄 등록</p>
          </button>
          {exchangeCandidates.list.map(({ manufacturer, actualCount, returnPending }) => (
            <button
              key={manufacturer}
              onClick={() => handleExchangeCandidateClick(manufacturer, actualCount)}
              disabled={isReadOnly || actualCount === 0}
              className={`group relative rounded-2xl border-2 p-4 transition-all text-left w-full ${
                returnPending > 0 && actualCount === 0
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/30 opacity-70 cursor-default'
                  : actualCount > 0 && !isReadOnly
                    ? 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/40 hover:shadow-md hover:border-violet-400 hover:bg-violet-100/60 active:scale-[0.98] cursor-pointer'
                    : 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/40 cursor-default'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="text-xs font-black text-slate-700 truncate">{manufacturer}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tabular-nums ${actualCount > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{actualCount}</span>
                <span className="text-xs font-bold text-slate-400">건</span>
              </div>
              {returnPending > 0
                ? <p className="text-[10px] font-bold text-amber-500 mt-1">반품 대기중 {returnPending}건</p>
                : <p className="text-[10px] font-bold text-violet-400 mt-1">반품 가능</p>
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
