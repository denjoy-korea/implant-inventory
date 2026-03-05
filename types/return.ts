// ============================================
// Return Request Types
// ============================================

export type ReturnReason = 'excess_stock' | 'defective' | 'exchange';
export type ReturnStatus = 'requested' | 'picked_up' | 'completed' | 'rejected';

export interface CreateReturnParams {
  manufacturer: string;
  reason: ReturnReason;
  manager: string;
  memo: string;
  items: { brand: string; size: string; quantity: number }[];
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  excess_stock: '초과재고',
  defective:    '제품하자',
  exchange:     '수술중교환',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: '반품 요청',
  picked_up: '수거 완료',
  completed: '반품 완료',
  rejected:  '반품 거절',
};

export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  brand: string;
  size: string;
  quantity: number;
}

export interface ReturnRequest {
  id: string;
  hospitalId: string;
  manufacturer: string;
  reason: ReturnReason;
  status: ReturnStatus;
  requestedDate: string;
  completedDate?: string | null;
  manager: string;
  confirmedBy?: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnRequestItem[];
}

/** Supabase return_requests 테이블 Row */
export interface DbReturnRequest {
  id: string;
  hospital_id: string;
  manufacturer: string;
  reason: ReturnReason;
  status: ReturnStatus;
  requested_date: string;
  completed_date: string | null;
  manager: string;
  confirmed_by: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase return_request_items 테이블 Row */
export interface DbReturnRequestItem {
  id: string;
  return_request_id: string;
  brand: string;
  size: string;
  quantity: number;
}

export type ReturnMutationResult =
  | { ok: true }
  | { ok: false; reason: 'conflict' | 'not_found' | 'error'; currentStatus?: ReturnStatus };
