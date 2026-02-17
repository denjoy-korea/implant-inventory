import { supabase } from './supabaseClient';
import { planService } from './planService';
import { PlanType, BillingCycle, PLAN_PRICING, PLAN_NAMES, DbBillingHistory } from '../types';

// Make 웹훅 URL: .env.local에서 설정
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL || '';

export interface PaymentRequest {
  hospitalId: string;
  hospitalName: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  contactPhone: string;
  contactName: string;
  paymentMethod: 'card' | 'transfer';
  receiptType?: 'cash_receipt' | 'tax_invoice';
}

export interface PaymentResult {
  success: boolean;
  billingId: string | null;
  error?: string;
}

export const makePaymentService = {
  /** 결제 요청: billing_history 생성 + Make 웹훅 호출 */
  async requestPayment(request: PaymentRequest): Promise<PaymentResult> {
    const { hospitalId, plan, billingCycle } = request;

    // 1. billing_history에 pending 레코드 생성
    const billingId = await planService.createBillingRecord(hospitalId, plan, billingCycle);
    if (!billingId) {
      return { success: false, billingId: null, error: '결제 이력 생성 실패' };
    }

    // 2. Make 웹훅 URL이 없으면 pending 상태로만 생성 (운영자가 수동 처리)
    if (!MAKE_WEBHOOK_URL) {
      console.warn('[makePaymentService] MAKE_WEBHOOK_URL not configured. Payment pending for manual processing.');
      return { success: true, billingId };
    }

    // 3. Make 웹훅으로 결제 요청 전송
    const price = billingCycle === 'yearly'
      ? PLAN_PRICING[plan].yearlyPrice * 12
      : PLAN_PRICING[plan].monthlyPrice;

    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_id: billingId,
          hospital_id: hospitalId,
          hospital_name: request.hospitalName,
          plan_name: PLAN_NAMES[plan],
          plan: plan,
          billing_cycle: billingCycle,
          amount: price,
          contact_phone: request.contactPhone,
          contact_name: request.contactName,
          payment_method: request.paymentMethod,
          receipt_type: request.receiptType || null,
          callback_url: `${window.location.origin}`,
        }),
      });

      if (!response.ok) {
        console.error('[makePaymentService] Webhook call failed:', response.status);
        return { success: true, billingId, error: '결제 요청 전송 실패. 운영자에게 문의하세요.' };
      }

      return { success: true, billingId };
    } catch (err) {
      console.error('[makePaymentService] Webhook error:', err);
      return { success: true, billingId, error: '결제 요청 전송 중 오류. 운영자에게 문의하세요.' };
    }
  },

  /** 결제 상태 확인 (polling) */
  async checkPaymentStatus(billingId: string): Promise<DbBillingHistory | null> {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('id', billingId)
      .single();

    if (error || !data) return null;
    return data as DbBillingHistory;
  },

  /** 결제 대기 중인 건 취소 */
  async cancelPendingPayment(billingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('billing_history')
      .update({ payment_status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', billingId)
      .eq('payment_status', 'pending');

    if (error) {
      console.error('[makePaymentService] Cancel failed:', error);
      return false;
    }
    return true;
  },
};
