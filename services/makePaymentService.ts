import { supabase } from './supabaseClient';
import { planService } from './planService';
import { PlanType, BillingCycle, PLAN_PRICING, PLAN_NAMES, DbBillingHistory } from '../types';

const PAYMENT_PROXY_FUNCTION = 'payment-request-proxy';

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

interface PaymentProxyResponse {
  forwarded?: boolean;
  manual?: boolean;
  message?: string;
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

    // 2. 서버사이드 프록시(Edge Function)로 결제 요청 전송
    const price = billingCycle === 'yearly'
      ? PLAN_PRICING[plan].yearlyPrice * 12
      : PLAN_PRICING[plan].monthlyPrice;

    try {
      const payload = {
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
      };

      const { data, error } = await supabase.functions.invoke(PAYMENT_PROXY_FUNCTION, {
        body: payload,
      });

      if (error) {
        console.error('[makePaymentService] Payment proxy call failed:', error);
        return { success: false, billingId, error: '결제 요청 전송 실패. 운영자에게 문의하세요.' };
      }

      const proxyResponse = (data || {}) as PaymentProxyResponse;
      if (proxyResponse.manual) {
        console.warn('[makePaymentService] Proxy manual mode:', proxyResponse.message || 'No webhook configured');
        // billing 레코드는 pending 상태 유지 (운영자 수동 처리)
        return { success: true, billingId };
      }
      if (!proxyResponse.forwarded) {
        return { success: false, billingId, error: '결제 요청 전송 실패. 운영자에게 문의하세요.' };
      }

      return { success: true, billingId };
    } catch (err) {
      console.error('[makePaymentService] Payment proxy error:', err);
      // billing 레코드는 pending 상태로 유지 — 운영자 수동 처리 필요
      return { success: false, billingId, error: '결제 요청 전송 중 오류. 운영자에게 문의하세요.' };
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
