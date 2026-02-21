import { supabase } from './supabaseClient';

export type InquiryStatus = 'pending' | 'in_progress' | 'resolved';

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

export const contactService = {
  /** 문의 제출 (비로그인 가능) - Edge Function으로 처리 (DB insert + Slack) */
  async submit(params: SubmitInquiryParams): Promise<void> {
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
    if (error) throw error;
    if (data && data.success === false) throw new Error('문의 접수에 실패했습니다.');
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
