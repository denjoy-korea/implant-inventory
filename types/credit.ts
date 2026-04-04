export type UserCreditSource =
  | 'lecture_purchase_bonus'
  | 'referral_reward'
  | 'admin_grant'
  | 'welcome_bonus'
  | 'lecture_payment'
  | 'service_payment';

export type UserCreditType = 'earn' | 'spend';

export interface DbUserCreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  type: UserCreditType;
  source: UserCreditSource;
  reference_id: string | null;
  memo: string | null;
  created_at: string;
}

export interface UserCreditTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: UserCreditType;
  source: UserCreditSource;
  referenceId: string | null;
  memo: string | null;
  createdAt: string;
  label: string;
}

export interface UserCreditInfo {
  userCreditBalance: number;
  hospitalCreditBalance: number;
}
