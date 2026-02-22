export interface DbHospitalRow {
  id: string;
  name: string;
  master_admin_id: string | null;
  phone: string | null;
  biz_file_url: string | null;
  plan: string;
  plan_expires_at: string | null;
  plan_changed_at: string | null;
  billing_cycle: string | null;
  created_at: string;
  base_stock_edit_count: number;
  trial_started_at: string | null;
  trial_used: boolean;
}

const TRIAL_DAYS = 14;

export function getTrialInfo(h: DbHospitalRow): { status: 'unused' | 'active' | 'expired'; daysLeft?: number } {
  if (!h.trial_started_at && !h.trial_used) return { status: 'unused' };
  if (h.trial_used) return { status: 'expired' };
  if (h.trial_started_at) {
    const trialEnd = new Date(new Date(h.trial_started_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() < trialEnd) {
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return { status: 'active', daysLeft };
    }
    return { status: 'expired' };
  }
  return { status: 'unused' };
}

export const ROLE_MAP: Record<string, string> = {
  admin: '운영자',
  master: '원장',
  dental_staff: '치위생사',
  staff: '스태프',
};
