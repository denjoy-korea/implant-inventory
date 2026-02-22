import React from 'react';
import { Toast } from '../../hooks/useToast';
import ConfirmModal from '../ConfirmModal';
import InventoryCompareModal, { CompareItem } from '../InventoryCompareModal';

interface PlanLimitModalState {
  currentCount: number;
  newCount: number;
  maxItems: number;
}

interface ConfirmModalState {
  title: string;
  message: string;
  tip?: string;
  confirmLabel?: string;
  confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
  icon?: React.ReactNode;
  onConfirm: () => void;
}

interface InventoryCompareState {
  duplicates: CompareItem[];
  newItems: CompareItem[];
}

interface AppGlobalOverlaysProps {
  planLimitModal: PlanLimitModalState | null;
  confirmModal: ConfirmModalState | null;
  inventoryCompare: InventoryCompareState | null;
  alertToast: Toast | null;
  showMobileDashboardNav: boolean;
  onClosePlanLimitModal: () => void;
  onUpgradePlan: () => void;
  onCloseConfirmModal: () => void;
  onConfirmInventoryCompare: () => void;
  onCancelInventoryCompare: () => void;
}

const AppGlobalOverlays: React.FC<AppGlobalOverlaysProps> = ({
  planLimitModal,
  confirmModal,
  inventoryCompare,
  alertToast,
  showMobileDashboardNav,
  onClosePlanLimitModal,
  onUpgradePlan,
  onCloseConfirmModal,
  onConfirmInventoryCompare,
  onCancelInventoryCompare,
}) => {
  return (
    <>
      {planLimitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">품목 수 제한 초과</h3>
              <p className="text-sm text-slate-500 mb-6">현재 플랜의 최대 품목 수를 초과하여<br />재고 마스터에 반영할 수 없습니다.</p>

              <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">현재 등록</span>
                  <span className="text-sm font-black text-slate-700">{planLimitModal.currentCount}개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">추가 대상</span>
                  <span className="text-sm font-black text-indigo-600">+{planLimitModal.newCount}개</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">플랜 최대</span>
                  <span className="text-sm font-black text-rose-500">{planLimitModal.maxItems}개</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">플랜을 업그레이드하거나, 기존 품목을 정리한 후 다시 시도해주세요.</p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={onClosePlanLimitModal}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                닫기
              </button>
              <button
                onClick={onUpgradePlan}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                플랜 업그레이드
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          tip={confirmModal.tip}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={onCloseConfirmModal}
        />
      )}

      {inventoryCompare && (
        <InventoryCompareModal
          duplicates={inventoryCompare.duplicates}
          newItems={inventoryCompare.newItems}
          onConfirm={onConfirmInventoryCompare}
          onCancel={onCancelInventoryCompare}
        />
      )}

      {alertToast && (
        <div
          style={showMobileDashboardNav ? { bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' } : undefined}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 ${alertToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
        >
          {alertToast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {alertToast.message}
        </div>
      )}
    </>
  );
};

export default AppGlobalOverlays;
