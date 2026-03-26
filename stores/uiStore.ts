import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { LimitType } from '../components/PlanLimitToast';
import type { ReviewType } from '../services/reviewService';

export interface ConfirmModalConfig {
  title: string;
  message: string;
  tip?: string;
  confirmLabel?: string;
  confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
  icon?: ReactNode;
  onConfirm: () => void;
}

interface UIStoreState {
  planLimitToast: LimitType | null;
  reviewPopupType: ReviewType | null;
  profileInitialTab: 'info' | 'plan' | 'security' | 'reviews' | undefined;
  showAuditHistory: boolean;
  autoOpenBaseStockEdit: boolean;
  autoOpenFailBulkModal: boolean;
  confirmModal: ConfirmModalConfig | null;

  setPlanLimitToast: (v: LimitType | null) => void;
  setReviewPopupType: (v: ReviewType | null) => void;
  setProfileInitialTab: (v: 'info' | 'plan' | 'security' | 'reviews' | undefined) => void;
  setShowAuditHistory: (v: boolean) => void;
  setAutoOpenBaseStockEdit: (v: boolean) => void;
  setAutoOpenFailBulkModal: (v: boolean) => void;
  setConfirmModal: (v: ConfirmModalConfig | null) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  planLimitToast: null,
  reviewPopupType: null,
  profileInitialTab: undefined,
  showAuditHistory: false,
  autoOpenBaseStockEdit: false,
  autoOpenFailBulkModal: false,
  confirmModal: null,

  setPlanLimitToast: (v) => set({ planLimitToast: v }),
  setReviewPopupType: (v) => set({ reviewPopupType: v }),
  setProfileInitialTab: (v) => set({ profileInitialTab: v }),
  setShowAuditHistory: (v) => set({ showAuditHistory: v }),
  setAutoOpenBaseStockEdit: (v) => set({ autoOpenBaseStockEdit: v }),
  setAutoOpenFailBulkModal: (v) => set({ autoOpenFailBulkModal: v }),
  setConfirmModal: (v) => set({ confirmModal: v }),
}));
