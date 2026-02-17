import { supabase } from './supabaseClient';
import {
  PlanType,
  BillingCycle,
  PlanFeature,
  HospitalPlanState,
  DbBillingHistory,
  PLAN_LIMITS,
  PLAN_ORDER,
  PLAN_PRICING,
  TRIAL_DAYS,
} from '../types';

export const planService = {
  /** 병원의 플랜 상태 조회 */
  async getHospitalPlan(hospitalId: string): Promise<HospitalPlanState> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used')
      .eq('id', hospitalId)
      .single();

    if (error || !data) {
      return {
        plan: 'free',
        expiresAt: null,
        billingCycle: null,
        trialStartedAt: null,
        trialUsed: false,
        isTrialActive: false,
        trialDaysRemaining: 0,
        daysUntilExpiry: 9999,
      };
    }

    return this._buildPlanState(data);
  },

  /** 기능 접근 가능 여부 확인 */
  canAccess(plan: PlanType, feature: PlanFeature): boolean {
    return PLAN_LIMITS[plan].features.includes(feature);
  },

  /** 재고 품목 수 제한 확인 */
  canAddItem(plan: PlanType, currentItemCount: number): boolean {
    return currentItemCount < PLAN_LIMITS[plan].maxItems;
  },

  /** 사용자 수 제한 확인 */
  canAddUser(plan: PlanType, currentUserCount: number): boolean {
    return currentUserCount < PLAN_LIMITS[plan].maxUsers;
  },

  /** 수술기록 업로드 가능 여부 확인 (플랜별 빈도 제한) */
  canUploadSurgery(plan: PlanType, lastUploadDate: Date | null): { allowed: boolean; nextAvailableDate: Date | null } {
    // Plus 이상: 무제한
    if (PLAN_ORDER[plan] >= PLAN_ORDER['plus']) {
      return { allowed: true, nextAvailableDate: null };
    }

    // 업로드 이력 없으면 허용
    if (!lastUploadDate) {
      return { allowed: true, nextAvailableDate: null };
    }

    const now = new Date();

    if (plan === 'free') {
      // Free: 1개월에 1회 (캘린더 기준, 2/15 → 3/15)
      const nextDate = new Date(lastUploadDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (now >= nextDate) {
        return { allowed: true, nextAvailableDate: null };
      }
      return { allowed: false, nextAvailableDate: nextDate };
    }

    if (plan === 'basic') {
      // Basic: 주 1회 (7일)
      const nextDate = new Date(lastUploadDate);
      nextDate.setDate(nextDate.getDate() + 7);
      if (now >= nextDate) {
        return { allowed: true, nextAvailableDate: null };
      }
      return { allowed: false, nextAvailableDate: nextDate };
    }

    // 그 외(business, ultimate): 무제한
    return { allowed: true, nextAvailableDate: null };
  },

  /** 기초재고 수정 횟수 서버 조회 */
  async getBaseStockEditCount(hospitalId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_base_stock_edit_count', {
      p_hospital_id: hospitalId,
    });
    if (error || data === null || data === undefined) return 0;
    return data as number;
  },

  /** 기초재고 수정 횟수 서버 증가 (저장 시 호출) */
  async incrementBaseStockEditCount(hospitalId: string): Promise<number> {
    const { data, error } = await supabase.rpc('increment_base_stock_edit_count', {
      p_hospital_id: hospitalId,
    });
    if (error || data === null || data === undefined) {
      console.error('[planService] incrementBaseStockEditCount failed:', error);
      return 0;
    }
    return data as number;
  },

  /** 특정 기능에 필요한 최소 플랜 반환 */
  getRequiredPlan(feature: PlanFeature): PlanType {
    const plans: PlanType[] = ['free', 'basic', 'plus', 'business'];
    for (const plan of plans) {
      if (PLAN_LIMITS[plan].features.includes(feature)) {
        return plan;
      }
    }
    return 'business';
  },

  /** 품목 수 제한에 필요한 최소 플랜 반환 */
  getRequiredPlanForItems(itemCount: number): PlanType {
    const plans: PlanType[] = ['free', 'basic', 'plus', 'business'];
    for (const plan of plans) {
      if (itemCount <= PLAN_LIMITS[plan].maxItems) {
        return plan;
      }
    }
    return 'business';
  },

  /** 플랜 업그레이드 여부 확인 */
  isUpgrade(from: PlanType, to: PlanType): boolean {
    return PLAN_ORDER[to] > PLAN_ORDER[from];
  },

  /** 무료 체험 시작 (1회만 가능) */
  async startTrial(hospitalId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('start_hospital_trial', {
      p_hospital_id: hospitalId,
    });

    if (!error) {
      return Boolean(data);
    }

    // 이전 스키마 호환: RPC가 없으면 기존 업데이트 방식으로 폴백
    if (error.code !== 'PGRST202') {
      console.error('[planService] Start trial failed:', error);
      return false;
    }

    const { error: fallbackError } = await supabase
      .from('hospitals')
      .update({
        plan: 'plus',
        trial_started_at: new Date().toISOString(),
        trial_used: false,
      })
      .eq('id', hospitalId)
      .is('trial_started_at', null)
      .eq('trial_used', false);

    if (fallbackError) {
      console.error('[planService] Start trial fallback failed:', fallbackError);
      return false;
    }
    return true;
  },

  /** 체험 기간 만료 확인 및 자동 다운그레이드 */
  async checkAndExpireTrial(hospitalId: string): Promise<HospitalPlanState> {
    const { data, error } = await supabase.rpc('expire_trial_if_needed', {
      p_hospital_id: hospitalId,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return this._buildPlanState(row);
    }

    // 이전 스키마 호환: RPC가 없으면 기존 클라이언트 계산 방식 사용
    if (error && error.code !== 'PGRST202') {
      console.error('[planService] expire_trial_if_needed failed:', error);
    }

    const planState = await this.getHospitalPlan(hospitalId);
    if (!planState.trialStartedAt || planState.trialUsed) return planState;

    const trialEnd = new Date(
      new Date(planState.trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
    );
    if (new Date() < trialEnd) return planState;

    const { error: fallbackError } = await supabase
      .from('hospitals')
      .update({
        plan: 'free',
        plan_expires_at: null,
        billing_cycle: null,
        trial_used: true,
      })
      .eq('id', hospitalId);

    if (fallbackError) {
      console.error('[planService] Trial expire fallback failed:', fallbackError);
      return planState;
    }

    return {
      ...planState,
      plan: 'free',
      expiresAt: null,
      billingCycle: null,
      trialUsed: true,
      isTrialActive: false,
      trialDaysRemaining: 0,
    };
  },

  /** 플랜 만료 확인 (트라이얼 + 유료 플랜 만료 통합) */
  async checkPlanExpiry(hospitalId: string): Promise<HospitalPlanState> {
    const { data, error } = await supabase.rpc('check_plan_expiry', {
      p_hospital_id: hospitalId,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return this._buildPlanState(row);
    }

    // RPC 없으면 기존 checkAndExpireTrial 폴백
    if (error && error.code !== 'PGRST202') {
      console.error('[planService] check_plan_expiry failed:', error);
    }
    return this.checkAndExpireTrial(hospitalId);
  },

  /** 결제 이력 조회 */
  async getBillingHistory(hospitalId: string): Promise<DbBillingHistory[]> {
    const { data, error } = await supabase.rpc('get_billing_history', {
      p_hospital_id: hospitalId,
    });

    if (error) {
      console.error('[planService] getBillingHistory failed:', error);
      return [];
    }
    return (data || []) as DbBillingHistory[];
  },

  /** 결제 요청 레코드 생성 (Make 웹훅 호출 전 pending 상태) */
  async createBillingRecord(
    hospitalId: string,
    plan: PlanType,
    billingCycle: BillingCycle,
    createdBy?: string
  ): Promise<string | null> {
    const price = billingCycle === 'yearly'
      ? PLAN_PRICING[plan].yearlyPrice * 12
      : PLAN_PRICING[plan].monthlyPrice;

    const { data, error } = await supabase
      .from('billing_history')
      .insert({
        hospital_id: hospitalId,
        plan,
        billing_cycle: billingCycle,
        amount: price,
        payment_status: 'pending',
        payment_method: 'payment_teacher',
        created_by: createdBy || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[planService] createBillingRecord failed:', error);
      return null;
    }
    return data?.id || null;
  },

  /** 구독 해지 (즉시 Free 다운그레이드) */
  async cancelSubscription(hospitalId: string): Promise<boolean> {
    const result = await this.changePlan(hospitalId, 'free', 'monthly');
    if (result) {
      await supabase.from('billing_history').insert({
        hospital_id: hospitalId,
        plan: 'free',
        amount: 0,
        payment_status: 'completed',
        payment_method: 'self_cancel',
        description: '사용자 구독 해지',
      });
    }
    return result;
  },

  /** 결제 대기 중인 건 확인 */
  async getPendingPayment(hospitalId: string): Promise<DbBillingHistory | null> {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbBillingHistory;
  },

  /** 읽기 전용 상태 확인 (Free 플랜 + 한도 초과) */
  isReadOnly(plan: PlanType, currentItemCount: number): boolean {
    return plan === 'free' && currentItemCount > PLAN_LIMITS.free.maxItems;
  },

  /** 플랜 변경 (Phase 1: 결제 없이 DB만 변경) */
  async changePlan(
    hospitalId: string,
    newPlan: PlanType,
    billingCycle: BillingCycle
  ): Promise<boolean> {
    // 현재 플랜 조회 (다운그레이드 감지용)
    const currentState = await this.getHospitalPlan(hospitalId);
    const isDowngrade = PLAN_ORDER[newPlan] < PLAN_ORDER[currentState.plan];
    const isUpgradeChange = PLAN_ORDER[newPlan] > PLAN_ORDER[currentState.plan];

    const { data, error } = await supabase.rpc('change_hospital_plan', {
      p_hospital_id: hospitalId,
      p_plan: newPlan,
      p_billing_cycle: newPlan === 'free' ? null : billingCycle,
    });

    let success = false;

    if (!error) {
      success = Boolean(data);
    } else if (error.code === 'PGRST202') {
      // 이전 스키마 호환: RPC가 없으면 기존 업데이트 방식으로 폴백
      const now = new Date();
      let expiresAt: string | null = null;
      if (newPlan !== 'free') {
        const expires = new Date(now);
        if (billingCycle === 'yearly') {
          expires.setFullYear(expires.getFullYear() + 1);
        } else {
          expires.setMonth(expires.getMonth() + 1);
        }
        expiresAt = expires.toISOString();
      }

      const { error: fallbackError } = await supabase
        .from('hospitals')
        .update({
          plan: newPlan,
          plan_expires_at: expiresAt,
          billing_cycle: newPlan === 'free' ? null : billingCycle,
          trial_used: true,
        })
        .eq('id', hospitalId);

      if (fallbackError) {
        console.error('[planService] Change plan fallback failed:', fallbackError);
        return false;
      }
      success = true;
    } else {
      console.error('[planService] Change plan failed:', error);
      return false;
    }

    if (success) {
      // 다운그레이드 시 초과 멤버를 readonly로 전환
      if (isDowngrade) {
        const excess = await this.handleDowngradeMembers(hospitalId, newPlan);
        if (excess > 0) {
          console.log(`[planService] ${excess}명의 초과 멤버가 readonly로 전환되었습니다.`);
        }
      }
      // 업그레이드 시 readonly 멤버를 active로 복구
      if (isUpgradeChange) {
        const reactivated = await this.reactivateReadonlyMembers(hospitalId);
        if (reactivated > 0) {
          console.log(`[planService] ${reactivated}명의 readonly 멤버가 active로 복구되었습니다.`);
        }
      }
    }

    return success;
  },

  /** 다운그레이드 시 초과 멤버를 readonly로 전환 */
  async handleDowngradeMembers(hospitalId: string, newPlan: PlanType): Promise<number> {
    const maxUsers = PLAN_LIMITS[newPlan].maxUsers;
    if (maxUsers === Infinity) return 0;

    const { data, error } = await supabase.rpc('handle_downgrade_members', {
      p_hospital_id: hospitalId,
      p_max_users: maxUsers,
    });

    if (error) {
      console.error('[planService] handleDowngradeMembers failed:', error);
      // RPC 없으면 클라이언트에서 직접 처리
      if (error.code === 'PGRST202') {
        return this._handleDowngradeMembersFallback(hospitalId, maxUsers);
      }
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  },

  /** 업그레이드 시 readonly 멤버를 active로 복구 */
  async reactivateReadonlyMembers(hospitalId: string): Promise<number> {
    const { data, error } = await supabase.rpc('reactivate_readonly_members', {
      p_hospital_id: hospitalId,
    });

    if (error) {
      console.error('[planService] reactivateReadonlyMembers failed:', error);
      if (error.code === 'PGRST202') {
        return this._reactivateReadonlyMembersFallback(hospitalId);
      }
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  },

  /** 폴백: 클라이언트에서 초과 멤버 readonly 전환 */
  async _handleDowngradeMembersFallback(hospitalId: string, maxUsers: number): Promise<number> {
    const { data: activeMembers } = await supabase
      .from('profiles')
      .select('id, role, created_at')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (!activeMembers || activeMembers.length <= maxUsers) return 0;

    // master를 제외한 멤버를 최근 가입순으로 정렬하여 초과분 선택
    const nonMaster = activeMembers.filter(m => m.role !== 'master');
    const masterCount = activeMembers.length - nonMaster.length;
    const keepCount = Math.max(0, maxUsers - masterCount);
    const excessIds = nonMaster.slice(keepCount).map(m => m.id);

    if (excessIds.length === 0) return 0;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'readonly' })
      .in('id', excessIds);

    if (error) {
      console.error('[planService] Fallback downgrade members failed:', error);
      return 0;
    }
    return excessIds.length;
  },

  /** 폴백: 클라이언트에서 readonly 멤버 active 복구 */
  async _reactivateReadonlyMembersFallback(hospitalId: string): Promise<number> {
    const { data: readonlyMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('status', 'readonly');

    if (!readonlyMembers || readonlyMembers.length === 0) return 0;

    const ids = readonlyMembers.map(m => m.id);
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .in('id', ids);

    if (error) {
      console.error('[planService] Fallback reactivate members failed:', error);
      return 0;
    }
    return ids.length;
  },

  /** 내부: DB 데이터에서 PlanState 계산 */
  _buildPlanState(data: {
    plan: string;
    plan_expires_at: string | null;
    billing_cycle: string | null;
    trial_started_at: string | null;
    trial_used: boolean;
  }): HospitalPlanState {
    const now = new Date();
    const trialStarted = data.trial_started_at ? new Date(data.trial_started_at) : null;
    const trialEnd = trialStarted
      ? new Date(trialStarted.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const isTrialActive = trialStarted !== null
      && !data.trial_used
      && trialEnd !== null
      && now < trialEnd;
    const trialDaysRemaining = isTrialActive && trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const expiresAt = data.plan_expires_at ? new Date(data.plan_expires_at) : null;
    const daysUntilExpiry = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 9999;

    return {
      plan: data.plan as PlanType,
      expiresAt: data.plan_expires_at,
      billingCycle: data.billing_cycle as BillingCycle | null,
      trialStartedAt: data.trial_started_at,
      trialUsed: data.trial_used,
      isTrialActive,
      trialDaysRemaining,
      daysUntilExpiry,
    };
  },
};
