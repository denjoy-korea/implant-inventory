import { supabase } from './supabaseClient';

export type ConsultationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface ConsultationRequest {
  id: string;
  name: string;
  email: string;
  hospital_name: string;
  region?: string | null;
  contact?: string | null;
  preferred_date?: string | null;
  preferred_time_slot?: TimeSlot | null;
  notes?: string | null;
  status: ConsultationStatus;
  admin_notes?: string | null;
  scheduled_at?: string | null;
  created_at: string;
}

export interface CreateConsultationData {
  name: string;
  email: string;
  hospital_name: string;
  region?: string;
  contact?: string;
  preferred_date?: string;
  preferred_time_slot?: TimeSlot;
  notes?: string;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: '오전 (9시–12시)',
  afternoon: '오후 (13시–17시)',
  evening: '저녁 (17시–19시)',
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  pending: '접수됨',
  confirmed: '확정됨',
  completed: '완료됨',
  cancelled: '취소됨',
};

export const consultationService = {
  async create(data: CreateConsultationData): Promise<void> {
    const { error } = await supabase
      .from('consultation_requests')
      .insert(data);
    if (error) throw error;

    // 노션 DB 연동 (fire-and-forget — 실패해도 신청 흐름에 영향 없음)
    supabase.functions.invoke('notify-consultation', { body: data }).catch((err) => {
      console.warn('[consultationService] notify-consultation invoke failed:', err);
    });
  },

  async getAll(): Promise<ConsultationRequest[]> {
    const { data, error } = await supabase
      .from('consultation_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateStatus(
    id: string,
    status: ConsultationStatus,
    adminNotes?: string,
    scheduledAt?: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('consultation_requests')
      .update({
        status,
        ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
        ...(scheduledAt !== undefined ? { scheduled_at: scheduledAt } : {}),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('consultation_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
