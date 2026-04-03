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
} from '../types';
import { UNLIMITED_DAYS } from '../constants';
import { getTrialDurationDays } from '../utils/trialPolicy';
import { resolveIsTestPayment, isMissingIsTestPaymentColumnError } from '../utils/paymentCompat';

export const planService = {
  /** 병원의 플랜 상태 조회 */
  async getHospitalPlan(hospitalId: string): Promise<HospitalPlanState> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used, base_stock_edit_count, credit_balance')
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
        daysUntilExpiry: UNLIMITED_DAYS,
        creditBalance: 0,
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
    const freq = PLAN_LIMITS[plan].uploadFrequency;

    if (freq === 'unlimited') return { allowed: true, nextAvailableDate: null };
    if (!lastUploadDate) return { allowed: true, nextAvailableDate: null };

    const now = new Date();

    if (freq === 'monthly') {
      // Free: 캘린더 월 기준 1회 (예: 2/15 업로드 → 3/1부터 가능)
      const nextDate = new Date(lastUploadDate.getFullYear(), lastUploadDate.getMonth() + 1, 1);
      if (now >= nextDate) return { allowed: true, nextAvailableDate: null };
      return { allowed: false, nextAvailableDate: nextDate };
    }

    if (freq === 'weekly') {
      // Basic: 7일 간격
      const nextDate = new Date(lastUploadDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (now >= nextDate) return { allowed: true, nextAvailableDate: null };
      return { allowed: false, nextAvailableDate: nextDate };
    }

    return { allowed: true, nextAvailableDate: null };
  },

  /** 플랜에 따른 수술기록 조회 가능 시작일 반환 */
  canViewDataFrom(plan: PlanType): Date {
    const months = PLAN_LIMITS[plan].viewMonths;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
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
    const plans: PlanType[] = ['free', 'basic', 'plus', 'business', 'ultimate'];
    for (const plan of plans) {
      if (PLAN_LIMITS[plan].features.includes(feature)) {
        return plan;
      }
    }
    return 'ultimate';
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
  async startTrial(hospitalId: string, trialPlan: PlanType = 'plus'): Promise<boolean> {
    // 현재 사용자의 해시를 프로필에서 조회해 핑거프린트 중복 체크에 활용
    let emailHash: string | null = null;
    let phoneHash: string | null = null;
    let nameHash: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email_hash, phone_hash, name_hash')
          .eq('id', user.id)
          .single();
        emailHash = prof?.email_hash ?? null;
        phoneHash = prof?.phone_hash ?? null;
        nameHash  = prof?.name_hash  ?? null;
      }
    } catch {
      // 해시 조회 실패 시 null 로 진행 (체크 스킵)
    }

    const { data, error } = await supabase.rpc('start_hospital_trial', {
      p_hospital_id: hospitalId,
      p_plan:        trialPlan,
      p_email_hash:  emailHash,
      p_phone_hash:  phoneHash,
      p_name_hash:   nameHash,
      p_consent_at:  new Date().toISOString(),
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
        plan: trialPlan,
        trial_started_at: new Date().toISOString(),
        trial_used: false,
      })
      .eq('id', hospitalId)
      .is('trial_started_at', null);

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

    const trialDurationDays = getTrialDurationDays(planState.trialStartedAt);
    const trialEnd = new Date(
      new Date(planState.trialStartedAt).getTime() + trialDurationDays * 24 * 60 * 60 * 1000
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
    const isTestPayment = resolveIsTestPayment();

    const primary = await supabase
      .from('billing_history')
      .insert({
        hospital_id: hospitalId,
        plan,
        billing_cycle: billingCycle,
        amount: price,
        is_test_payment: isTestPayment,
        payment_status: 'pending',
        payment_method: 'payment_teacher',
        created_by: createdBy || null,
      })
      .select('id')
      .single();

    if (!primary.error && primary.data?.id) {
      return primary.data.id as string;
    }

    if (!isMissingIsTestPaymentColumnError(primary.error)) {
      console.error('[planService] createBillingRecord failed:', primary.error);
      return null;
    }

    // Backward compatibility: migration 미적용 환경에서는 컬럼 없이 insert
    const fallback = await supabase
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

    if (fallback.error || !fallback.data?.id) {
      console.error('[planService] createBillingRecord fallback failed:', fallback.error);
      return null;
    }

    console.warn('[planService] billing_history is_test_payment column missing; fallback insert executed.');
    return fallback.data.id as string;
  },

  /** 구독 해지 (즉시 Free 다운그레이드) */
  async cancelSubscription(hospitalId: string): Promise<boolean> {
    const result = await this.changePlan(hospitalId, 'free', 'monthly');
    if (result) {
      const primary = await supabase.from('billing_history').insert({
        hospital_id: hospitalId,
        plan: 'free',
        amount: 0,
        is_test_payment: true,
        payment_status: 'completed',
        payment_method: 'self_cancel',
        description: '사용자 구독 해지',
      });

      if (primary.error && isMissingIsTestPaymentColumnError(primary.error)) {
        await supabase.from('billing_history').insert({
          hospital_id: hospitalId,
          plan: 'free',
          amount: 0,
          payment_status: 'completed',
          payment_method: 'self_cancel',
          description: '사용자 구독 해지',
        });
      }
    }
    return result;
  },

  /** 환불 가능한 최근 완료 결제 조회 (TossPayments 자동 환불용) */
  async getLatestCompletedBilling(hospitalId: string): Promise<DbBillingHistory | null> {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('payment_status', 'completed')
      .not('plan', 'eq', 'free')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbBillingHistory;
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

  /** 플랜 다운그레이드 시 특정 멤버 접근 제한 (suspend_reason = 'plan_downgrade') */
  async suspendMembersForDowngrade(hospitalId: string, memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) return;
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'paused', suspend_reason: 'plan_downgrade' })
      .in('id', memberIds)
      .eq('hospital_id', hospitalId);
    if (error) {
      console.error('[planService] suspendMembersForDowngrade failed:', error);
    }
  },

  /** 플랜 변경 (Phase 1: 결제 없이 DB만 변경) */
  async changePlan(
    hospitalId: string,
    newPlan: PlanType,
    billingCycle: BillingCycle,
    memberIdsToSuspend?: string[] // 제공 시 자동 선택 대신 명시적으로 해당 멤버만 접근 제한
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
      // 다운그레이드 처리
      if (isDowngrade) {
        if (memberIdsToSuspend !== undefined) {
          // 명시적 선택: 지정한 멤버만 접근 제한
          await this.suspendMembersForDowngrade(hospitalId, memberIdsToSuspend);
          if (memberIdsToSuspend.length > 0) {
            console.log(`[planService] ${memberIdsToSuspend.length}명의 멤버가 플랜 다운그레이드로 접근 제한되었습니다.`);
          }
        } else {
          // 자동 선택: 초과 멤버 readonly 전환 (기존 동작)
          const excess = await this.handleDowngradeMembers(hospitalId, newPlan);
          if (excess > 0) {
            console.log(`[planService] ${excess}명의 초과 멤버가 readonly로 전환되었습니다.`);
          }
        }
      }
      // 업그레이드 시 readonly + plan_downgrade paused 멤버를 active로 복구
      if (isUpgradeChange) {
        const reactivated = await this.reactivateReadonlyMembers(hospitalId);
        if (reactivated > 0) {
          console.log(`[planService] ${reactivated}명의 멤버가 active로 복구되었습니다.`);
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

  /** 폴백: 클라이언트에서 readonly + plan_downgrade paused 멤버 active 복구 */
  async _reactivateReadonlyMembersFallback(hospitalId: string): Promise<number> {
    // readonly 멤버
    const { data: readonlyMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('status', 'readonly');

    // plan_downgrade로 paused된 멤버
    const { data: suspendedMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('status', 'paused')
      .eq('suspend_reason', 'plan_downgrade');

    const ids = [
      ...(readonlyMembers ?? []).map(m => m.id),
      ...(suspendedMembers ?? []).map(m => m.id),
    ];

    if (ids.length === 0) return 0;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active', suspend_reason: null })
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
    base_stock_edit_count?: number; // G5: optional — RPC 반환값에 없을 수 있음
    credit_balance?: number; // 다운그레이드 크레딧 잔액
  }): HospitalPlanState {
    const now = new Date();
    const trialStarted = data.trial_started_at ? new Date(data.trial_started_at) : null;
    const trialDurationDays = getTrialDurationDays(data.trial_started_at);
    const trialEnd = trialStarted
      ? new Date(trialStarted.getTime() + trialDurationDays * 24 * 60 * 60 * 1000)
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
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : UNLIMITED_DAYS;

    // G4: retentionDaysLeft — 유료 만료 후 Free 전환 유저에게만 의미 있음
    // plan_expires_at === null (항상 free or 진행 중인 trial) → undefined (T1 넛지 불발)
    let retentionDaysLeft: number | undefined;
    if (data.plan === 'free' && expiresAt !== null) {
      const RETENTION_DAYS = PLAN_LIMITS.free.retentionMonths * 30;
      const retentionEnd = new Date(expiresAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
      retentionDaysLeft = Math.max(
        0,
        Math.ceil((retentionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    // G5: uploadLimitExceeded — Free 비트라이얼 유저에게만 의미 있음
    // base_stock_edit_count가 없으면 undefined (T3 넛지 불발, 허용 가능)
    let uploadLimitExceeded: boolean | undefined;
    if (data.plan === 'free' && !isTrialActive && data.base_stock_edit_count !== undefined) {
      uploadLimitExceeded = (data.base_stock_edit_count ?? 0) >= PLAN_LIMITS.free.maxBaseStockEdits;
    }

    return {
      plan: data.plan as PlanType,
      expiresAt: data.plan_expires_at,
      billingCycle: data.billing_cycle as BillingCycle | null,
      trialStartedAt: data.trial_started_at,
      trialUsed: data.trial_used,
      isTrialActive,
      trialDaysRemaining,
      daysUntilExpiry,
      retentionDaysLeft,
      uploadLimitExceeded,
      creditBalance: data.credit_balance ?? 0,
    };
  },

  /**
   * 다운그레이드 + 크레딧 적립 (원자적)
   * - 잔여 구독 금액을 credit_balance에 적립
   * - 즉시 하위 플랜으로 전환 (plan_expires_at = NULL)
   */
  async executeDowngrade(
    hospitalId: string,
    toPlan: PlanType,
    billingCycle: BillingCycle,
  ): Promise<{ creditAdded: number; newCreditBalance: number }> {
    const { data, error } = await supabase.rpc('execute_downgrade_with_credit', {
      p_hospital_id: hospitalId,
      p_to_plan: toPlan,
      p_billing_cycle: billingCycle,
    });

    if (error) {
      console.error('[planService] executeDowngrade failed:', error);
      throw new Error('다운그레이드 처리 중 오류가 발생했습니다.');
    }

    const result = data as { credit_added: number; new_credit_balance: number };
    return {
      creditAdded: result.credit_added ?? 0,
      newCreditBalance: result.new_credit_balance ?? 0,
    };
  },

  /**
   * 다운그레이드 시 적립될 크레딧 금액 미리 계산 (클라이언트 추정치)
   * SQL execute_downgrade_with_credit 로직과 동일한 알고리즘 사용
   */
  async estimateDowngradeCredit(
    hospitalId: string,
    currentPlan: PlanType,
    toPlan: PlanType,
  ): Promise<number> {
    try {
      // 최근 완료 결제 조회
      const billing = await this.getLatestCompletedBilling(hospitalId);
      // 병원 플랜 상태 조회 (plan_expires_at, billing_cycle 필요)
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('plan_expires_at, billing_cycle, plan_changed_at')
        .eq('id', hospitalId)
        .single();

      const now = Date.now();
      let upperRemaining = 0;
      let remainingDays = 0;
      let totalDays = 30;

      // M-1 수정: PLAN_PRICING에서 동적 계산 — 가격 변경 시 자동 동기화
      const MONTHLY_VAT: Record<string, number> = Object.fromEntries(
        Object.entries(PLAN_PRICING).map(([p, v]) => [p, Math.round(v.monthlyPrice * 1.1)])
      );
      const YEARLY_VAT: Record<string, number> = Object.fromEntries(
        Object.entries(PLAN_PRICING).map(([p, v]) => [p, Math.round(v.yearlyPrice * 12 * 1.1)])
      );

      if (billing && billing.amount > 0) {
        const hospitalCycle = hospital?.billing_cycle ?? 'monthly';

        if (billing.plan === currentPlan) {
          // Case A: 실제 결제 금액 기반
          const billingCycle = (billing as { billing_cycle?: string }).billing_cycle ?? hospitalCycle;
          totalDays = billingCycle === 'yearly' ? 360 : 30;
          const createdAt = new Date((billing as { created_at?: string }).created_at ?? now).getTime();
          const usedDays = Math.ceil((now - createdAt) / 86400000);
          remainingDays = Math.max(0, totalDays - usedDays);

          if (usedDays < totalDays) {
            const upperDaily = Math.ceil(billing.amount / totalDays / 10) * 10;
            const upperUsed = Math.min(upperDaily * usedDays, billing.amount);
            upperRemaining = Math.max(0, billing.amount - upperUsed);
          }
        } else if (hospital?.plan_expires_at) {
          // Case B: 이미 다운그레이드된 상태
          // plan_changed_at 기반으로 usedDays 계산 (plan_expires_at 방식은 달력 31일 문제로 totalDays 초과 가능)
          totalDays = hospitalCycle === 'yearly' ? 360 : 30;
          const planChangedAtStr = (hospital as Record<string, unknown>).plan_changed_at as string | undefined;
          if (planChangedAtStr) {
            const planChangedAt = new Date(planChangedAtStr).getTime();
            const usedDays = Math.max(0, Math.ceil((now - planChangedAt) / 86400000));
            remainingDays = Math.max(0, totalDays - usedDays);
          } else {
            // Fallback: plan_expires_at 기반, totalDays 캡
            const expiresAt = new Date(hospital.plan_expires_at).getTime();
            remainingDays = Math.min(totalDays, Math.max(0, Math.ceil((expiresAt - now) / 86400000)));
          }
          const vatTable = hospitalCycle === 'yearly' ? YEARLY_VAT : MONTHLY_VAT;
          const currentPlanVat = vatTable[currentPlan] ?? 0;
          if (currentPlanVat > 0 && remainingDays > 0) {
            const upperDaily = Math.ceil(currentPlanVat / totalDays / 10) * 10;
            upperRemaining = Math.min(upperDaily * remainingDays, currentPlanVat);
          }
        }
      }

      // 하위 플랜 일할요금
      if (upperRemaining <= 0) return 0;

      const hospitalCycle = hospital?.billing_cycle ?? 'monthly';
      const vatTable = hospitalCycle === 'yearly' ? YEARLY_VAT : MONTHLY_VAT;
      const lowerVat = vatTable[toPlan] ?? 0;

      if (lowerVat > 0 && remainingDays > 0) {
        const lowerDaily = Math.ceil(lowerVat / totalDays / 10) * 10;
        const lowerCost = lowerDaily * remainingDays;
        return Math.max(0, upperRemaining - lowerCost);
      }
      return Math.max(0, upperRemaining);
    } catch (err) {
      // [M-11] 에러 무음 실패 방지 — 디버깅용 로그 추가
      console.error('[planService] estimateDowngradeCredit failed:', err);
      return 0;
    }
  },

  /**
   * 다운그레이드 크레딧 상세 계산 내역 (미리보기 UI용)
   * estimateDowngradeCredit과 동일 알고리즘, 중간 값 모두 반환
   */
  async estimateDowngradeCreditDetail(
    hospitalId: string,
    currentPlan: PlanType,
    toPlan: PlanType,
  ): Promise<{
    creditAmount: number;
    billingCycle: BillingCycle;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    upperDailyRate: number;
    upperRemaining: number;
    lowerDailyRate: number;
    lowerCost: number;
    actualPaidAmount: number | null;
  } | null> {
    try {
      const billing = await this.getLatestCompletedBilling(hospitalId);
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('plan_expires_at, billing_cycle, plan_changed_at')
        .eq('id', hospitalId)
        .single();

      const now = Date.now();
      const hospitalCycle = (hospital?.billing_cycle ?? 'monthly') as BillingCycle;
      const MONTHLY_VAT: Record<string, number> = Object.fromEntries(
        Object.entries(PLAN_PRICING).map(([p, v]) => [p, Math.round(v.monthlyPrice * 1.1)])
      );
      const YEARLY_VAT: Record<string, number> = Object.fromEntries(
        Object.entries(PLAN_PRICING).map(([p, v]) => [p, Math.round(v.yearlyPrice * 12 * 1.1)])
      );

      let totalDays = hospitalCycle === 'yearly' ? 360 : 30;
      let usedDays = 0;
      let remainingDays = 0;
      let upperDailyRate = 0;
      let upperRemaining = 0;
      let actualPaidAmount: number | null = null;

      if (billing && billing.amount > 0) {
        const billingCycle = (billing.billing_cycle ?? hospitalCycle) as BillingCycle;
        if (billing.plan === currentPlan) {
          // Case A: 실제 결제 금액 기반
          totalDays = billingCycle === 'yearly' ? 360 : 30;
          const createdAt = new Date(billing.created_at ?? now).getTime();
          usedDays = Math.ceil((now - createdAt) / 86400000);
          remainingDays = Math.max(0, totalDays - usedDays);
          actualPaidAmount = billing.amount;
          if (usedDays < totalDays) {
            upperDailyRate = Math.ceil(billing.amount / totalDays / 10) * 10;
            const upperUsed = Math.min(upperDailyRate * usedDays, billing.amount);
            upperRemaining = Math.max(0, billing.amount - upperUsed);
          }
        } else if (hospital?.plan_expires_at) {
          // Case B: 이미 다운그레이드 상태
          totalDays = hospitalCycle === 'yearly' ? 360 : 30;
          const planChangedAtStr = (hospital as Record<string, unknown>).plan_changed_at as string | undefined;
          if (planChangedAtStr) {
            const planChangedAt = new Date(planChangedAtStr).getTime();
            usedDays = Math.max(0, Math.ceil((now - planChangedAt) / 86400000));
            remainingDays = Math.max(0, totalDays - usedDays);
          } else {
            const expiresAt = new Date(hospital.plan_expires_at).getTime();
            remainingDays = Math.min(totalDays, Math.max(0, Math.ceil((expiresAt - now) / 86400000)));
            usedDays = totalDays - remainingDays;
          }
          const vatTable = hospitalCycle === 'yearly' ? YEARLY_VAT : MONTHLY_VAT;
          const currentPlanVat = vatTable[currentPlan] ?? 0;
          if (currentPlanVat > 0 && remainingDays > 0) {
            upperDailyRate = Math.ceil(currentPlanVat / totalDays / 10) * 10;
            upperRemaining = Math.min(upperDailyRate * remainingDays, currentPlanVat);
          }
        }
      }

      if (upperRemaining <= 0) return null;

      const vatTable = hospitalCycle === 'yearly' ? YEARLY_VAT : MONTHLY_VAT;
      const lowerVat = vatTable[toPlan] ?? 0;
      let lowerDailyRate = 0;
      let lowerCost = 0;
      let creditAmount = 0;

      if (lowerVat > 0 && remainingDays > 0) {
        lowerDailyRate = Math.ceil(lowerVat / totalDays / 10) * 10;
        lowerCost = lowerDailyRate * remainingDays;
        creditAmount = Math.max(0, upperRemaining - lowerCost);
      } else {
        creditAmount = upperRemaining;
      }

      return {
        creditAmount,
        billingCycle: hospitalCycle,
        totalDays,
        usedDays,
        remainingDays,
        upperDailyRate,
        upperRemaining,
        lowerDailyRate,
        lowerCost,
        actualPaidAmount,
      };
    } catch {
      return null;
    }
  },

  /** 플랜별 가용 여부 조회 (품절 체크용, 비로그인도 호출 가능) */
  async getPlanAvailability(): Promise<Record<string, boolean>> {
    const { data, error } = await supabase.rpc('get_plan_availability_public');
    if (error || !data) return {};
    const result: Record<string, boolean> = {};
    (data as { plan: string; available: boolean }[]).forEach(r => {
      result[r.plan] = r.available;
    });
    return result;
  },

  /**
   * P1-C: 특정 서비스의 플랜 코드를 hospital_service_subscriptions에서 읽음.
   * 테이블이 없거나 레코드가 없으면 null 반환.
   */
  async getServicePlan(hospitalId: string, serviceCode: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('hospital_service_subscriptions')
      .select('service_plan_code')
      .eq('hospital_id', hospitalId)
      .eq('service_code', serviceCode)
      .maybeSingle();

    if (error) {
      // 테이블 미존재(개발 환경) → null로 조용히 폴백
      if (error.code === '42P01' || error.code === 'PGRST205') return null;
      console.error('[planService] getServicePlan failed:', error);
      return null;
    }

    return (data as { service_plan_code: string | null } | null)?.service_plan_code ?? null;
  },
};
