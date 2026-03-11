import { useReducer } from 'react';
import type { Order } from '../types';
import type { GroupedOrder, GroupedReturnRequest, ExchangeReturnTarget } from './useOrderManager';
import type { ReturnCategory } from '../components/order/ReturnCandidateModal';

// ── 모달 상태 타입 (discriminated union) ──────────────────────────
export type ModalState =
  | { kind: 'none' }
  | { kind: 'cancel';               orders: Order[] }
  | { kind: 'receipt';              group: GroupedOrder }
  | { kind: 'brand_order';          mfr: string }
  | { kind: 'bulk_order' }
  | { kind: 'history' }
  | { kind: 'return_request' }
  | { kind: 'return_candidate';     category: ReturnCategory }
  | { kind: 'bulk_return_confirm' }
  | { kind: 'return_detail';        group: GroupedReturnRequest }
  | { kind: 'return_complete';      group: GroupedReturnRequest }
  | { kind: 'exchange_return';      target: ExchangeReturnTarget }
  | { kind: 'optimize' };

export type ModalAction =
  | { type: 'OPEN_CANCEL';              orders: Order[] }
  | { type: 'OPEN_RECEIPT';             group: GroupedOrder }
  | { type: 'OPEN_BRAND_ORDER';         mfr: string }
  | { type: 'OPEN_BULK_ORDER' }
  | { type: 'TOGGLE_HISTORY' }
  | { type: 'OPEN_RETURN_REQUEST' }
  | { type: 'OPEN_RETURN_CANDIDATE';    category: ReturnCategory }
  | { type: 'OPEN_BULK_RETURN_CONFIRM' }
  | { type: 'OPEN_RETURN_DETAIL';       group: GroupedReturnRequest }
  | { type: 'OPEN_RETURN_COMPLETE';     group: GroupedReturnRequest }
  | { type: 'OPEN_EXCHANGE_RETURN';     target: ExchangeReturnTarget }
  | { type: 'OPEN_OPTIMIZE' }
  | { type: 'CLOSE' };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_CANCEL':              return { kind: 'cancel',            orders: action.orders };
    case 'OPEN_RECEIPT':             return { kind: 'receipt',           group: action.group };
    case 'OPEN_BRAND_ORDER':         return { kind: 'brand_order',       mfr: action.mfr };
    case 'OPEN_BULK_ORDER':          return { kind: 'bulk_order' };
    case 'TOGGLE_HISTORY':           return state.kind === 'history' ? { kind: 'none' } : { kind: 'history' };
    case 'OPEN_RETURN_REQUEST':      return { kind: 'return_request' };
    case 'OPEN_RETURN_CANDIDATE':    return { kind: 'return_candidate',  category: action.category };
    case 'OPEN_BULK_RETURN_CONFIRM': return { kind: 'bulk_return_confirm' };
    case 'OPEN_RETURN_DETAIL':       return { kind: 'return_detail',     group: action.group };
    case 'OPEN_RETURN_COMPLETE':     return { kind: 'return_complete',   group: action.group };
    case 'OPEN_EXCHANGE_RETURN':     return { kind: 'exchange_return',   target: action.target };
    case 'OPEN_OPTIMIZE':            return { kind: 'optimize' };
    case 'CLOSE':                    return { kind: 'none' };
    default:                         return state;
  }
}

export function useOrderManagerModals() {
  const [modal, dispatch] = useReducer(modalReducer, { kind: 'none' });
  return { modal, dispatch };
}
