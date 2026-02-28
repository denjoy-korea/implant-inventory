import React, { useState, useMemo } from 'react';
import {
  ReturnRequest,
  ReturnStatus,
  ReturnReason,
  ReturnMutationResult,
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  InventoryItem,
} from '../types';
import ReturnRequestModal from './order/ReturnRequestModal';

interface ReturnManagerProps {
  returnRequests: ReturnRequest[];
  inventory: InventoryItem[];
  hospitalId: string | undefined;
  currentUserName: string;
  isReadOnly: boolean;
  onCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
  onUpdateReturnStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => Promise<ReturnMutationResult>;
  onCompleteReturn: (returnId: string) => Promise<ReturnMutationResult>;
  onDeleteReturn: (returnId: string) => Promise<void>;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type StatusFilter = 'all' | ReturnStatus;

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: '전체',
  requested: '반품 요청',
  picked_up: '수거 완료',
  completed: '반품 완료',
  rejected: '반품 거절',
};

const STATUS_BADGE: Record<ReturnStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-700',
  picked_up: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected:  'bg-gray-100 text-gray-500',
};

const REASON_BADGE: Record<ReturnReason, string> = {
  excess_stock: 'bg-orange-50 text-orange-600',
  defective:    'bg-red-50 text-red-600',
  exchange:     'bg-purple-50 text-purple-600',
};

const ReturnManager: React.FC<ReturnManagerProps> = ({
  returnRequests,
  inventory,
  hospitalId,
  currentUserName,
  isReadOnly,
  onCreateReturn,
  onUpdateReturnStatus,
  onCompleteReturn,
  onDeleteReturn,
  showAlertToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const manufacturers = useMemo(
    () => Array.from(new Set(returnRequests.map(r => r.manufacturer))).sort(),
    [returnRequests]
  );

  const filtered = useMemo(() => {
    return returnRequests.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (filterManufacturer && r.manufacturer !== filterManufacturer) return false;
      if (filterDateFrom && r.requestedDate < filterDateFrom) return false;
      if (filterDateTo && r.requestedDate > filterDateTo) return false;
      return true;
    });
  }, [returnRequests, statusFilter, filterManufacturer, filterDateFrom, filterDateTo]);

  const handleCreate = async (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => {
    setIsCreating(true);
    try {
      await onCreateReturn(params);
      setShowModal(false);
      showAlertToast('반품 신청이 등록되었습니다.', 'success');
    } catch {
      showAlertToast('반품 신청에 실패했습니다.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (
    returnId: string,
    newStatus: ReturnStatus,
    currentStatus: ReturnStatus
  ) => {
    setActionLoadingId(returnId);
    try {
      if (newStatus === 'completed') {
        const result = await onCompleteReturn(returnId);
        if (result.ok) {
          showAlertToast('반품이 완료 처리되었습니다. 재고가 차감되었습니다.', 'success');
        } else {
          showAlertToast(
            result.reason === 'conflict' ? '상태가 변경되어 반영할 수 없습니다.' : '처리 중 오류가 발생했습니다.',
            'error'
          );
        }
      } else {
        const result = await onUpdateReturnStatus(returnId, newStatus, currentStatus);
        if (result.ok) {
          showAlertToast(`상태가 "${RETURN_STATUS_LABELS[newStatus]}"(으)로 변경되었습니다.`, 'success');
        } else {
          showAlertToast(
            result.reason === 'conflict' ? '상태가 변경되어 반영할 수 없습니다.' : '처리 중 오류가 발생했습니다.',
            'error'
          );
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (returnId: string) => {
    if (!confirm('반품 신청을 삭제하시겠습니까?')) return;
    setActionLoadingId(returnId);
    try {
      await onDeleteReturn(returnId);
      showAlertToast('반품 신청이 삭제되었습니다.', 'success');
    } catch {
      showAlertToast('삭제에 실패했습니다.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!hospitalId) return null;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">반품 관리</h3>
        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 반품 신청
          </button>
        )}
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(STATUS_FILTER_LABELS) as [StatusFilter, string][]).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === k
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* 제조사·날짜 필터 */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterManufacturer}
            onChange={e => setFilterManufacturer(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 제조사</option>
            {manufacturers.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-xs text-gray-400 hover:text-red-500 ml-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {returnRequests.length === 0 ? '등록된 반품 신청이 없습니다.' : '필터 조건에 맞는 반품이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const isExpanded = expandedId === r.id;
            const isActing = actionLoadingId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* 카드 헤더 */}
                <div
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{r.manufacturer}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status]}`}>
                        {RETURN_STATUS_LABELS[r.status]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_BADGE[r.reason]}`}>
                        {RETURN_REASON_LABELS[r.reason]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{r.requestedDate}</span>
                      <span>담당: {r.manager}</span>
                      <span>
                        {r.items.reduce((s, i) => s + i.quantity, 0)}개 /{' '}
                        {r.items.length}품목
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {/* 품목 테이블 */}
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left pb-1 font-medium">브랜드</th>
                          <th className="text-left pb-1 font-medium">사이즈</th>
                          <th className="text-right pb-1 font-medium">수량</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {r.items.map(item => (
                          <tr key={item.id}>
                            <td className="py-1 text-gray-800">{item.brand}</td>
                            <td className="py-1 text-gray-800">{item.size}</td>
                            <td className="py-1 text-right text-gray-800">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 메모 */}
                    {r.memo && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{r.memo}</p>
                    )}

                    {/* 완료일 */}
                    {r.completedDate && (
                      <p className="text-xs text-gray-500">완료일: {r.completedDate}</p>
                    )}

                    {/* 액션 버튼 */}
                    {!isReadOnly && (
                      <div className="flex gap-2 flex-wrap">
                        {/* requested → picked_up */}
                        {r.status === 'requested' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'picked_up', 'requested')}
                              disabled={isActing}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              수거 완료 처리
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'rejected', 'requested')}
                              disabled={isActing}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              반품 거절
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={isActing}
                              className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 ml-auto"
                            >
                              삭제
                            </button>
                          </>
                        )}
                        {/* picked_up → completed */}
                        {r.status === 'picked_up' && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'completed', 'picked_up')}
                            disabled={isActing}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            반품 완료 처리 (재고 차감)
                          </button>
                        )}
                        {/* rejected → requested 되돌리기 */}
                        {r.status === 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'requested', 'rejected')}
                            disabled={isActing}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50"
                          >
                            반품 요청으로 되돌리기
                          </button>
                        )}
                        {isActing && (
                          <span className="text-xs text-gray-400 self-center">처리 중...</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 반품 신청 모달 */}
      {showModal && (
        <ReturnRequestModal
          inventory={inventory}
          currentUserName={currentUserName}
          onConfirm={handleCreate}
          onClose={() => setShowModal(false)}
          isLoading={isCreating}
        />
      )}
    </div>
  );
};

export default ReturnManager;
