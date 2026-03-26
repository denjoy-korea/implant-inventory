import { create } from 'zustand';
import type { PlanType, BillingCycle } from '../types';

export interface DirectPaymentConfig {
  plan: PlanType;
  billing: BillingCycle;
  isRenewal?: boolean;
}

interface PaymentStoreState {
  directPayment: DirectPaymentConfig | null;
  billingProgramSaving: boolean;
  billingProgramError: string;

  setDirectPayment: (v: DirectPaymentConfig | null) => void;
  setBillingProgramSaving: (v: boolean) => void;
  setBillingProgramError: (v: string) => void;
}

export const usePaymentStore = create<PaymentStoreState>((set) => ({
  directPayment: null,
  billingProgramSaving: false,
  billingProgramError: '',

  setDirectPayment: (v) => set({ directPayment: v }),
  setBillingProgramSaving: (v) => set({ billingProgramSaving: v }),
  setBillingProgramError: (v) => set({ billingProgramError: v }),
}));
