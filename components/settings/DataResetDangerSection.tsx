import React from 'react';
import { DbResetRequest } from '../../types';

interface DataResetDangerSectionProps {
  isStaff?: boolean;
  hospitalId?: string;
  resetRequest: DbResetRequest | null;
  resetLoaded: boolean;
  onCancelReset: () => void;
  onOpenResetModal: () => void;
  formatDate: (iso: string) => string;
}

const DataResetDangerSection: React.FC<DataResetDangerSectionProps> = ({
  isStaff,
  hospitalId,
  resetRequest,
  resetLoaded,
  onCancelReset,
  onOpenResetModal,
  formatDate,
}) => {
  if (!isStaff || !hospitalId) return null;

  return (
    <>
      <div className="flex items-center gap-4 pt-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Danger Zone</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {resetRequest ? (
        <div className={`p-6 rounded-2xl border ${
          resetRequest.status === 'pending'
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              resetRequest.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800">데이터 초기화 요청 중</h3>
              {resetRequest.status === 'pending' && (
                <p className="text-xs text-amber-700 mt-1">관리자 승인 대기 중입니다. 승인 후 초기화가 진행됩니다.</p>
              )}
              {resetRequest.status === 'scheduled' && resetRequest.scheduled_at && (
                <>
                  <p className="text-xs text-rose-700 mt-1">
                    <span className="font-bold">{formatDate(resetRequest.scheduled_at)}</span>에 자동 초기화가 예정되어 있습니다.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">예정일 전에 취소할 수 있습니다.</p>
                </>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  resetRequest.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {resetRequest.status === 'pending' ? '승인 대기' : '초기화 예약'}
                </span>
                <span className="text-[11px] text-slate-400">신청일: {formatDate(resetRequest.created_at)}</span>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 space-y-1">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  초기화 범위: <span className="font-semibold">재고 마스터, 수술 기록, 주문 내역, 작업 로그</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  유지 항목: <span className="font-semibold">회원 정보, 플랜 설정</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  완료 후에는 계정이 <span className="font-semibold">일시정지(paused)</span>로 전환되며, 로그인 시 <span className="font-semibold">사용 재개</span> 또는 <span className="font-semibold">플랜 취소</span>를 선택합니다.
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  요금 안내: 사용 재개 시 기존 요금이 유지되고, 플랜 취소 시 Free 전환되며 기존 요금 보장 혜택은 소멸됩니다.
                </p>
              </div>
            </div>
            {resetRequest.status === 'scheduled' && (
              <button
                onClick={onCancelReset}
                className="px-4 py-2 text-xs font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
              >
                취소
              </button>
            )}
          </div>
        </div>
      ) : resetLoaded && (
        <button
          onClick={onOpenResetModal}
          className="group w-full text-left p-6 rounded-2xl border border-rose-200 bg-white hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800">데이터 초기화</h3>
              <p className="text-xs mt-1 leading-relaxed text-slate-500">
                워크스페이스 데이터 초기화를 요청합니다. 관리자 승인 후 데이터가 삭제되며 계정은 일시정지 상태로 전환됩니다.
              </p>
            </div>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </>
  );
};

export default DataResetDangerSection;
