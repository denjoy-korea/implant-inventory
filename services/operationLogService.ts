import { supabase } from './supabaseClient';

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

        await supabase.from('operation_logs').insert({
          hospital_id: profile.hospital_id,
          user_id: user.id,
          user_email: user.email || '',
          user_name: profile.name || '',
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

    const logs: OperationLog[] = (data || []).map((row: any) => ({
      id: row.id,
      hospitalId: row.hospital_id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      action: row.action,
      description: row.description,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));

    return { data: logs, total: count ?? 0 };
  },
};
