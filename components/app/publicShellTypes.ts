export interface PublicShellMeta {
  title: string;
  description: string;
}

export interface PublicShellDowngradeDiff {
  message: string;
  tip?: string;
}

export interface PublicShellDowngradeCreditDetail {
  creditAmount: number;
  billingCycle: 'monthly' | 'yearly';
  totalDays: number;
  actualPaidAmount: number | null;
  usedDays: number;
  remainingDays: number;
  upperRemaining: number;
  upperDailyRate: number;
  lowerDailyRate: number;
  lowerCost: number;
}
