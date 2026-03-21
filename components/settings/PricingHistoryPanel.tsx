import React from 'react';
import type { ItemPricingHistory } from '../../types/pricing';

interface PricingHistoryPanelProps {
  manufacturer: string;
  brand: string;
  size: string;
  history: ItemPricingHistory[];
  isLoading: boolean;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  settings: '설정',
  receipt_confirmation: '도착확인',
};

const FIELD_LABELS: Record<string, string> = {
  purchase_price: '매입단가',
  treatment_fee: '진료수가',
  both: '매입단가+수가',
  initial: '최초 등록',
};

function formatPrice(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('ko-KR') + '원';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const PricingHistoryPanel: React.FC<PricingHistoryPanelProps> = ({
  manufacturer, brand, size, history, isLoading, onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">변경 이력</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{manufacturer} · {brand} · {size}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">불러오는 중...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">변경 이력이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        h.fieldChanged === 'initial'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {FIELD_LABELS[h.fieldChanged] ?? h.fieldChanged}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {SOURCE_LABELS[h.changeSource] ?? h.changeSource}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums">{formatDate(h.changedAt)}</span>
                  </div>

                  {h.fieldChanged !== 'initial' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(h.oldPurchasePrice !== null || h.newPurchasePrice !== null) && h.oldPurchasePrice !== h.newPurchasePrice && (
                        <div>
                          <span className="text-slate-400 text-[10px]">매입단가</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-slate-500 line-through">{formatPrice(h.oldPurchasePrice)}</span>
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-bold text-indigo-700">{formatPrice(h.newPurchasePrice)}</span>
                          </div>
                        </div>
                      )}
                      {(h.oldTreatmentFee !== null || h.newTreatmentFee !== null) && h.oldTreatmentFee !== h.newTreatmentFee && (
                        <div>
                          <span className="text-slate-400 text-[10px]">진료수가</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-slate-500 line-through">{formatPrice(h.oldTreatmentFee)}</span>
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-bold text-indigo-700">{formatPrice(h.newTreatmentFee)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {h.fieldChanged === 'initial' && (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                      <div>
                        <span className="text-slate-400 text-[10px]">매입단가</span>
                        <div className="font-bold text-indigo-700">{formatPrice(h.newPurchasePrice)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">진료수가</span>
                        <div className="font-bold text-indigo-700">{formatPrice(h.newTreatmentFee)}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingHistoryPanel;
