import { create } from 'zustand';
import type { FailCandidate } from '../types';

interface FailStoreState {
  pendingFailCandidates: FailCandidate[];
  setPendingFailCandidates: (v: FailCandidate[]) => void;
}

export const useFailStore = create<FailStoreState>((set) => ({
  pendingFailCandidates: [],
  setPendingFailCandidates: (v) => set({ pendingFailCandidates: v }),
}));
