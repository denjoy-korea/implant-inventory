import { supabase } from './supabaseClient';
import { FunctionsError } from '@supabase/supabase-js';

export type InquiryStatus = 'pending' | 'in_progress' | 'resolved';

const DEFAULT_SUBMIT_ERROR_MESSAGE = '문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.';

const normalizeSubmitErrorMessage = (raw?: string | null, code?: string | null): string => {
  const errorCode = (code ?? '').trim().toLowerCase();
  if (errorCode === 'invalid_json') return '요청 형식이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.';
  if (errorCode === 'invalid_input') return '입력한 필수 항목을 다시 확인해 주세요.';
  if (errorCode === 'invalid_email') return '이메일 형식을 다시 확인해 주세요.';
  if (errorCode === 'server_misconfigured') return '서버 설정 오류로 접수가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
  if (errorCode === 'permission_denied') return '권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  if (errorCode === 'duplicate_request') return '동일한 문의가 이미 접수되었습니다. 잠시 후 확인해 주세요.';
  if (errorCode === 'db_error' || errorCode === 'internal_error') return DEFAULT_SUBMIT_ERROR_MESSAGE;

  const message = (raw ?? '').trim();
  if (!message) return DEFAULT_SUBMIT_ERROR_MESSAGE;

  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to send a request') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('network')
  ) {
    return '네트워크 연결이 불안정합니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('gateway')
  ) {
    return '요청 처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (
    normalized.includes('too many requests') ||
    normalized.includes('rate limit') ||
    normalized.includes('429')
  ) {
    return '요청이 일시적으로 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (
    normalized.includes('null value in column') ||
    normalized.includes('violates not-null constraint') ||
    normalized.includes('invalid input') ||
    normalized.includes('required')
  ) {
    return '입력한 필수 항목을 다시 확인해 주세요.';
  }

  if (
    normalized.includes('permission denied') ||
    normalized.includes('not authorized') ||
    normalized.includes('forbidden') ||
    normalized.includes('401') ||
    normalized.includes('403')
  ) {
    return '권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  return DEFAULT_SUBMIT_ERROR_MESSAGE;
};

interface SubmitErrorInfo {
  code: string | null;
  message: string | null;
}

const extractFunctionErrorInfo = async (error: unknown): Promise<SubmitErrorInfo> => {
  if (error instanceof FunctionsError) {
    try {
      const body = await error.context?.json?.();
      const code =
        body && typeof body.error_code === 'string' && body.error_code.trim()
          ? body.error_code.trim()
          : null;
      if (body && typeof body.error === 'string' && body.error.trim()) {
        return { code, message: body.error.trim() };
      }
      if (body && typeof body.message === 'string' && body.message.trim()) {
        return { code, message: body.message.trim() };
      }
      if (code) {
        return { code, message: null };
      }
    } catch {
      // Ignore context parse failures and fall back to generic message extraction.
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return { code: null, message: error.message.trim() };
  }

  return { code: null, message: null };
};

interface SubmitContactResponse {
  success?: boolean;
  error_code?: string;
  error?: string;
  message?: string;
  request_id?: string;
}

export interface ContactInquiry {
  id: string;
  hospital_name: string;
  contact_name: string;
  email: string;
  role: string | null;
  phone: string;
  weekly_surgeries: string;
  inquiry_type: string;
  content: string;
  status: InquiryStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitInquiryParams {
  hospital_name: string;
  contact_name: string;
  email: string;
  role?: string;
  phone: string;
  weekly_surgeries: string;
  inquiry_type: string;
  content: string;
}

export interface SubmitInquiryResult {
  requestId: string | null;
}

export const contactService = {
  /** 문의 제출 (비로그인 가능) - Edge Function으로 처리 (DB insert + Slack) */
  async submit(params: SubmitInquiryParams): Promise<SubmitInquiryResult> {
    const { data, error } = await supabase.functions.invoke('submit-contact', {
      body: {
        hospital_name: params.hospital_name.trim(),
        contact_name: params.contact_name.trim(),
        email: params.email.trim(),
        role: params.role?.trim() || null,
        phone: params.phone.trim(),
        weekly_surgeries: params.weekly_surgeries,
        inquiry_type: params.inquiry_type,
        content: params.content.trim(),
      },
    });

    if (error) {
      const parsed = await extractFunctionErrorInfo(error);
      // SEC-10: 개발 환경에서만 상세 에러 로깅 (프로덕션에서는 에러 코드만)
      if (import.meta.env.DEV) {
        console.error('[contactService] submit invoke failed:', error, parsed);
      } else {
        console.error('[contactService] submit failed:', parsed.code);
      }
      throw new Error(normalizeSubmitErrorMessage(parsed.message, parsed.code));
    }

    const response = (data ?? {}) as SubmitContactResponse;
    if (response.success === false) {
      const rawCode =
        typeof response.error_code === 'string' && response.error_code.trim()
          ? response.error_code.trim()
          : null;
      const rawMessage =
        (typeof response.error === 'string' && response.error.trim()) ||
        (typeof response.message === 'string' && response.message.trim()) ||
        '';
      // SEC-10: requestId 등 내부 식별자는 개발 환경에서만 로깅
      if (import.meta.env.DEV) {
        console.error('[contactService] submit rejected:', { code: rawCode, message: rawMessage, requestId: response.request_id });
      } else {
        console.error('[contactService] submit rejected:', rawCode);
      }
      throw new Error(normalizeSubmitErrorMessage(rawMessage, rawCode));
    }
    return { requestId: response.request_id ?? null };
  },

  /** 관리자용 전체 문의 조회 */
  async getAll(): Promise<ContactInquiry[]> {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ContactInquiry[];
  },

  /** 플랜 변경 신청 목록 조회 (plan_change_* 만) */
  async getPlanChangeRequests(): Promise<ContactInquiry[]> {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .like('inquiry_type', 'plan_change_%')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ContactInquiry[];
  },

  /** 대기자 신청 목록 조회 (plan_waitlist_* 만) */
  async getWaitlist(filter?: { plan?: string }): Promise<ContactInquiry[]> {
    let query = supabase
      .from('contact_inquiries')
      .select('*')
      .like('inquiry_type', 'plan_waitlist_%')
      .order('created_at', { ascending: false });

    if (filter?.plan) {
      query = query.eq('inquiry_type', `plan_waitlist_${filter.plan}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ContactInquiry[];
  },

  /** 상태 변경 */
  async updateStatus(id: string, status: InquiryStatus, adminNote?: string): Promise<void> {
    const { error } = await supabase
      .from('contact_inquiries')
      .update({
        status,
        ...(adminNote !== undefined ? { admin_note: adminNote } : {}),
      })
      .eq('id', id);
    if (error) throw error;
  },

  /** 앱 내 이메일 답변 발송 (Edge Function 호출) */
  async replyInquiry(params: {
    inquiryId: string;
    to: string;
    contactName: string;
    hospitalName: string;
    inquiryType: string;
    originalContent: string;
    replyMessage: string;
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('reply-inquiry', { body: params });
    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || '답변 발송에 실패했습니다.');
  },

  /**
   * 플랜 변경 신청 완료 처리: hospital_id 조회 후 실제 플랜 변경
   * content에 hospital_id가 있으면 사용, 없으면 email로 RPC 조회
   */
  async applyPlanChange(item: ContactInquiry): Promise<{ success: boolean; hospitalId: string | null }> {
    // inquiry_type에서 대상 플랜 파싱 (plan_change_business → business)
    const planMatch = item.inquiry_type.match(/^plan_change_(.+)$/);
    const targetPlan = planMatch?.[1];
    if (!targetPlan) return { success: false, hospitalId: null };

    // content에서 hospital_id 파싱
    const hospitalIdMatch = item.content.match(/hospital_id:\s*([a-f0-9-]{36})/);
    let hospitalId = hospitalIdMatch?.[1] ?? null;

    // content에 없으면 email로 admin RPC 조회
    if (!hospitalId) {
      const { data } = await supabase.rpc('admin_get_hospital_id_by_email', { p_email: item.email });
      hospitalId = (data as string | null) ?? null;
    }

    if (!hospitalId) return { success: false, hospitalId: null };

    // content에서 청구 주기 파싱 (신청 플랜: Business (월간) → monthly)
    const cycleMatch = item.content.match(/신청 플랜:.+?\(([^)]+)\)/);
    const cycleRaw = cycleMatch?.[1]?.trim();
    const billingCycle = cycleRaw === '연간' ? 'yearly' : 'monthly';

    // change_hospital_plan RPC 호출 (admin은 _can_manage_hospital 통과)
    const { data: changed, error } = await supabase.rpc('change_hospital_plan', {
      p_hospital_id: hospitalId,
      p_plan: targetPlan,
      p_billing_cycle: targetPlan === 'free' || targetPlan === 'ultimate' ? null : billingCycle,
    });

    if (error) throw error;
    return { success: Boolean(changed), hospitalId };
  },

  /** 삭제 */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contact_inquiries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '접수',
  in_progress: '처리중',
  resolved: '완료',
};

export const STATUS_COLORS: Record<InquiryStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

export const WAITLIST_PLAN_LABELS: Record<string, string> = {
  plan_waitlist_basic:    'Basic',
  plan_waitlist_plus:     'Plus',
  plan_waitlist_business: 'Business',
  plan_waitlist_ultimate: 'Ultimate',
};

export const PLAN_CHANGE_LABELS: Record<string, string> = {
  plan_change_basic:    '플랜 변경 → Basic',
  plan_change_plus:     '플랜 변경 → Plus',
  plan_change_business: '플랜 변경 → Business',
  plan_change_ultimate: '플랜 변경 → Ultimate',
};
