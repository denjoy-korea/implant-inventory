import React, { useState } from 'react';
import {
  ConsultationRequest,
  ConsultationStatus,
  CONSULTATION_STATUS_LABELS,
  TIME_SLOT_LABELS,
  TimeSlot,
} from '../../../services/consultationService';

interface SystemAdminConsultationTabProps {
  consultations: ConsultationRequest[];
  loading: boolean;
  statusUpdating: string | null;
  onUpdateStatus: (item: ConsultationRequest, status: ConsultationStatus, adminNotes?: string, scheduledAt?: string | null) => Promise<void>;
  onDelete: (item: ConsultationRequest) => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<ConsultationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const SystemAdminConsultationTab: React.FC<SystemAdminConsultationTabProps> = ({
  consultations,
  loading,
  statusUpdating,
  onUpdateStatus,
  onDelete,
  onRefresh,
}) => {
  const [selected, setSelected] = useState<ConsultationRequest | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');

  const filtered = statusFilter === 'all'
    ? consultations
    : consultations.filter(c => c.status === statusFilter);

  const handleSelect = (item: ConsultationRequest) => {
    setSelected(item);
    setEditNotes(item.admin_notes || '');
    setEditScheduledAt(item.scheduled_at ? item.scheduled_at.split('T')[0] : '');
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    await onUpdateStatus(
      selected,
      selected.status,
      editNotes,
      editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
    );
    setSelected(prev => prev ? { ...prev, admin_notes: editNotes, scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : null } : null);
  };

  const pendingCount = consultations.filter(c => c.status === 'pending').length;

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* List */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">상담 신청 목록</h2>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-black rounded-full px-2 py-0.5">
                {pendingCount}건 대기
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? '전체' : CONSULTATION_STATUS_LABELS[s]}
              </button>
            ))}
            <button
              onClick={onRefresh}
              className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">상담 신청이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${
                  selected?.id === item.id
                    ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 truncate">{item.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[item.status]}`}>
                        {CONSULTATION_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{item.hospital_name}{item.region ? ` · ${item.region}` : ''}</p>
                    <p className="text-xs text-slate-400 truncate">{item.email}{item.contact ? ` · ${item.contact}` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.preferred_date && (
                      <p className="text-xs font-bold text-indigo-600">{item.preferred_date}</p>
                    )}
                    {item.preferred_time_slot && (
                      <p className="text-[10px] text-slate-400">{TIME_SLOT_LABELS[item.preferred_time_slot as TimeSlot]}</p>
                    )}
                    <p className="text-[10px] text-slate-300 mt-1">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 self-start sticky top-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">상담 상세</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            <InfoRow label="이름" value={selected.name} />
            <InfoRow label="이메일" value={selected.email} />
            <InfoRow label="병원명" value={selected.hospital_name} />
            {selected.region && <InfoRow label="지역" value={selected.region} />}
            {selected.contact && <InfoRow label="연락처" value={selected.contact} />}
            {selected.preferred_date && (
              <InfoRow label="선호 날짜" value={selected.preferred_date} />
            )}
            {selected.preferred_time_slot && (
              <InfoRow label="선호 시간" value={TIME_SLOT_LABELS[selected.preferred_time_slot as TimeSlot]} />
            )}
            {selected.notes && <InfoRow label="메모" value={selected.notes} multiline />}
            <InfoRow
              label="신청일"
              value={new Date(selected.created_at).toLocaleString('ko-KR')}
            />
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">상태 변경</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(CONSULTATION_STATUS_LABELS) as [ConsultationStatus, string][]).map(([s, label]) => (
                <button
                  key={s}
                  disabled={statusUpdating === selected.id}
                  onClick={() => onUpdateStatus(selected, s)}
                  className={`text-xs font-bold py-2 px-3 rounded-lg border transition-all ${
                    selected.status === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled At */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">확정 일정</label>
            <input
              type="date"
              value={editScheduledAt}
              onChange={e => setEditScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">운영자 메모</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={3}
              placeholder="내부 메모를 입력하세요"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
            />
            <button
              onClick={handleSaveNotes}
              disabled={statusUpdating === selected.id}
              className="mt-2 w-full py-2 text-xs font-bold text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              저장
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(selected)}
            className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 py-2 rounded-lg transition-all"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
};

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs font-bold text-slate-400 w-16 shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs text-slate-700 flex-1 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</span>
    </div>
  );
}

export default SystemAdminConsultationTab;
export type { SystemAdminConsultationTabProps };
