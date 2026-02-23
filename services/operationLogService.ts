import { supabase } from './supabaseClient';

export interface AnalysisLead {
  id: string;
  email: string;
  type: 'report_only' | 'detailed_analysis';
  hospital_name: string | null;
  region: string | null;
  contact: string | null;
  score: number | null;
  grade: string | null;
  report_summary: string | null;
  created_at: string;
}

export interface GetAnalysisLeadsOptions {
  type?: 'report_only' | 'detailed_analysis';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export type OperationAction =
  | 'raw_data_upload'
  | 'data_processing'
  | 'base_stock_edit'
  | 'manual_item_add'
  | 'inventory_audit'
  | 'order_create'
  | 'order_status_update'
  | 'order_delete'
  | 'item_delete'
  | 'member_approve'
  | 'member_reject'
  | 'member_invite'
  | 'member_kick'
  | 'member_permission_update'
  | 'surgery_upload';

export interface OperationLog {
  id: string;
  hospitalId: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: OperationAction;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface GetLogsOptions {
  action?: OperationAction;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AccessLog {
  id: string;
  ip: string;
  country: string | null;
  city: string | null;
  region: string | null;
  path: string | null;
  user_agent: string | null;
  blocked: boolean;
  created_at: string;
}

export interface GetAccessLogsOptions {
  blocked?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const operationLogService = {
  /**
   * Fire-and-forget: 작업 로그 기록
   * 실패해도 메인 작업에 영향 없음
   */
  logOperation(
    action: OperationAction,
    description: string,
    metadata?: Record<string, any>
  ): void {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('name, hospital_id')
          .eq('id', user.id)
          .single();

        if (!profile?.hospital_id) return;

        const { decryptPatientInfo } = await import('./cryptoUtils');
        const userName = await decryptPatientInfo(profile.name || '');

        await supabase.from('operation_logs').insert({
          hospital_id: profile.hospital_id,
          user_id: user.id,
          user_email: user.email || '',
          user_name: userName || '',
          action,
          description,
          metadata: metadata || {},
        });
      } catch (err) {
        console.error('[operationLogService] logOperation failed:', err);
      }
    })();
  },

  /**
   * 감사 로그 조회 (필터 + 페이지네이션)
   */
  async getOperationLogs(
    hospitalId: string,
    options: GetLogsOptions = {}
  ): Promise<{ data: OperationLog[]; total: number }> {
    const { action, startDate, endDate, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('operation_logs')
      .select('*', { count: 'exact' })
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[operationLogService] getOperationLogs failed:', error);
      return { data: [], total: 0 };
    }

    const logs: OperationLog[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      hospitalId: row.hospital_id as string,
      userId: row.user_id as string,
      userEmail: row.user_email as string,
      userName: row.user_name as string,
      action: row.action as OperationAction,
      description: row.description as string,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at as string,
    }));

    return { data: logs, total: count ?? 0 };
  },

  /** 접속 IP 로그 조회 */
  async getAccessLogs(
    options: GetAccessLogsOptions = {}
  ): Promise<{ data: AccessLog[]; total: number }> {
    const { blocked, startDate, endDate, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('access_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (blocked !== undefined) query = query.eq('blocked', blocked);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error, count } = await query;

    if (error) {
      console.error('[operationLogService] getAccessLogs failed:', error);
      return { data: [], total: 0 };
    }

    return {
      data: (data || []) as AccessLog[],
      total: count ?? 0,
    };
  },

  /** 분석 리드 저장 (fire-and-forget, anon 가능) */
  saveAnalysisLead(lead: {
    email: string;
    type: 'report_only' | 'detailed_analysis';
    hospital_name?: string;
    region?: string;
    contact?: string;
    score: number;
    grade: string;
    report_summary?: string;
  }): void {
    (async () => {
      try {
        await supabase.from('analysis_leads').insert({
          email: lead.email,
          type: lead.type,
          hospital_name: lead.hospital_name || null,
          region: lead.region || null,
          contact: lead.contact || null,
          score: lead.score,
          grade: lead.grade,
          report_summary: lead.report_summary || null,
        });
      } catch (err) {
        console.error('[operationLogService] saveAnalysisLead failed:', err);
      }
    })();
  },

  /** 분석 리드 목록 조회 (운영자 전용) */
  async getAnalysisLeads(
    options: GetAnalysisLeadsOptions = {}
  ): Promise<{ data: AnalysisLead[]; total: number }> {
    const { type, startDate, endDate, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('analysis_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error, count } = await query;

    if (error) {
      console.error('[operationLogService] getAnalysisLeads failed:', error);
      return { data: [], total: 0 };
    }

    return {
      data: (data || []) as AnalysisLead[],
      total: count ?? 0,
    };
  },

  async deleteAnalysisLead(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('analysis_leads').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
