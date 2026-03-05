import { InventoryItem } from '../../types';
import type { ReturnCategory } from './ReturnCandidateModal';

interface ReturnCandidates {
  olderThanYear: InventoryItem[];
  neverUsed: InventoryItem[];
  overstock: InventoryItem[];
  olderThanYearQty: number;
  neverUsedQty: number;
  overstockExcess: number;
  total: number;
}

interface Props {
  returnCandidates: ReturnCandidates;
  bulkReturnItems: (InventoryItem & { returnQty: number })[];
  isReadOnly?: boolean;
  setReturnCandidateCategory: (cat: ReturnCategory) => void;
  setShowReturnCandidateModal: (b: boolean) => void;
  setShowBulkReturnConfirm: (b: boolean) => void;
  setShowOptimizeModal: (b: boolean) => void;
}

export function OrderReturnSection({
  returnCandidates,
  bulkReturnItems,
  isReadOnly,
  setReturnCandidateCategory,
  setShowReturnCandidateModal,
  setShowBulkReturnConfirm,
  setShowOptimizeModal,
}: Props) {
  if (returnCandidates.total === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">반품 권장 품목</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 ml-5">장기 미사용, 미등록 사용, 과잉 재고 품목을 반품하여 재고를 최적화하세요.</p>
      </div>
      <div className="px-5 sm:px-7 pb-5 sm:pb-6">
        {/* 그룹 레이블 행 — 데스크톱 전용 */}
        <div className="hidden sm:grid grid-cols-4 gap-3 mb-2">
          <p className="text-[10px] font-bold text-indigo-600/80 tracking-widest px-0.5">과잉 재고</p>
          <p className="text-[10px] font-bold text-amber-600/80 tracking-widest col-span-3 border-l border-slate-200 pl-3">미사용 기반</p>
        </div>
        {/* 균일 4열 카드 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* 1. 권장량 초과 */}
          <button
            onClick={() => { setReturnCandidateCategory('overstock'); setShowReturnCandidateModal(true); }}
            className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.overstock.length > 0
              ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-blue-50/40'
              : 'border-slate-100 bg-slate-50/60'
              }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span className="text-xs font-black text-slate-700">권장량 초과</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-600 tabular-nums">{returnCandidates.overstock.length}</span>
              <span className="text-xs font-bold text-slate-400">품목</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">+{returnCandidates.overstockExcess}개 초과 보유</p>
          </button>

          {/* 2. 일괄반품 액션 카드 */}
          <button
            onClick={() => { if (isReadOnly || bulkReturnItems.length === 0) return; setShowBulkReturnConfirm(true); }}
            disabled={isReadOnly || bulkReturnItems.length === 0}
            className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly || bulkReturnItems.length === 0 ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-amber-300 bg-white hover:bg-amber-50 hover:shadow-md hover:border-amber-400 cursor-pointer active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              <span className="text-xs font-black text-amber-600">일괄반품</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 tabular-nums">{bulkReturnItems.length}</span>
              <span className="text-xs font-bold text-slate-400">품목</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">2개 초과분 일괄 반품</p>
          </button>

          {/* 3. 1년 이상 미사용 */}
          <button
            onClick={() => setShowOptimizeModal(true)}
            className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.olderThanYear.length > 0
              ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40'
              : 'border-slate-100 bg-slate-50/60'
              }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-xs font-black text-slate-700">1년 이상 미사용</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 tabular-nums">{returnCandidates.olderThanYear.length}</span>
              <span className="text-xs font-bold text-slate-400">품목</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{returnCandidates.olderThanYearQty}개 보유 중</p>
          </button>

          {/* 4. 한 번도 미사용 */}
          <button
            onClick={() => setShowOptimizeModal(true)}
            className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.neverUsed.length > 0
              ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-pink-50/40'
              : 'border-slate-100 bg-slate-50/60'
              }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              <span className="text-xs font-black text-slate-700">한 번도 미사용</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-rose-500 tabular-nums">{returnCandidates.neverUsed.length}</span>
              <span className="text-xs font-bold text-slate-400">품목</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{returnCandidates.neverUsedQty}개 보유 중</p>
          </button>

        </div>
      </div>
    </div>
  );
}
