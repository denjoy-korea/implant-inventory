import { supabase } from './supabaseClient';
import type { DbUserCreditTransaction, UserCreditTransaction } from '../types/credit';

const SOURCE_LABEL: Record<string, string> = {
  lecture_purchase_bonus: '강의 구매 보너스',
  referral_reward:        '추천 보상',
  admin_grant:            '관리자 지급',
  welcome_bonus:          '환영 크레딧',
  lecture_payment:        '강의 결제',
  service_payment:        '서비스 결제',
};

function dbToTransaction(row: DbUserCreditTransaction): UserCreditTransaction {
  return {
    id:           row.id,
    amount:       Number(row.amount),
    balanceAfter: Number(row.balance_after),
    type:         row.type,
    source:       row.source,
    referenceId:  row.reference_id,
    memo:         row.memo,
    createdAt:    row.created_at,
    label:        SOURCE_LABEL[row.source] ?? row.source,
  };
}

export const creditService = {
  async getCreditInfo(): Promise<{ userCreditBalance: number }> {
    const { data, error } = await supabase.rpc('get_my_credit_info');
    if (error) throw error;
    return {
      userCreditBalance: Number((data as Record<string, unknown>).user_credit_balance ?? 0),
    };
  },

  async getCreditHistory(limit = 50): Promise<UserCreditTransaction[]> {
    const { data, error } = await supabase
      .from('user_credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(row => dbToTransaction(row as DbUserCreditTransaction));
  },
};
