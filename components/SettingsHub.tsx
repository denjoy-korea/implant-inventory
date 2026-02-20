import React, { useState, useEffect } from 'react';
import { DashboardTab, PlanType, PlanFeature, PLAN_NAMES, DbResetRequest, DEFAULT_WORK_DAYS } from '../types';
import { planService } from '../services/planService';
import { resetService } from '../services/resetService';
import { hospitalService } from '../services/hospitalService';
import { WorkDaySelector } from './WorkDaySelector';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';

interface SettingsHubProps {
  onNavigate: (tab: DashboardTab) => void;
  isMaster: boolean;
  isStaff?: boolean;
  plan: PlanType;
  hospitalId?: string;
  /** 현재 병원 진료 요일 설정 */
  hospitalWorkDays?: number[];
  /** 진료 요일 변경 후 상태 업데이트 콜백 */
  onWorkDaysChange?: (workDays: number[]) => void;
}

interface SettingsCard {
  id: DashboardTab;
  title: string;
  description: string;
  icon: React.ReactNode;
  requireMaster?: boolean;
  feature?: PlanFeature;
}

/** 해당 기능에 접근 가능한 최소 플랜 찾기 */
function getMinPlanForFeature(feature: PlanFeature): PlanType {
  const plans: PlanType[] = ['free', 'basic', 'plus', 'business', 'ultimate'];
  for (const p of plans) {
    if (planService.canAccess(p, feature)) return p;
  }
  return 'business';
}

const SettingsHub: React.FC<SettingsHubProps> = ({ onNavigate, isMaster, isStaff, plan, hospitalId, hospitalWorkDays, onWorkDaysChange }) => {
  const [resetRequest, setResetRequest] = useState<DbResetRequest | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetLoaded, setResetLoaded] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { toast, showToast } = useToast();

  // 진료 요일 설정 상태
  const [localWorkDays, setLocalWorkDays] = useState<number[]>(hospitalWorkDays ?? DEFAULT_WORK_DAYS);
  const [isSavingWorkDays, setIsSavingWorkDays] = useState(false);
  const [workDaysSaved, setWorkDaysSaved] = useState(false);

  // hospitalWorkDays prop 변경 시 로컬 상태 동기화
  useEffect(() => {
    if (hospitalWorkDays) setLocalWorkDays(hospitalWorkDays);
  }, [hospitalWorkDays]);

  const handleSaveWorkDays = async () => {
    if (!hospitalId) return;
    setIsSavingWorkDays(true);
    try {
      await hospitalService.updateWorkDays(hospitalId, localWorkDays);
      onWorkDaysChange?.(localWorkDays);
      setWorkDaysSaved(true);
      setTimeout(() => setWorkDaysSaved(false), 3000);
    } catch (err) {
      showToast('진료 요일 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSavingWorkDays(false);
    }
  };

  const workDaysChanged = JSON.stringify([...(hospitalWorkDays ?? DEFAULT_WORK_DAYS)].sort()) !== JSON.stringify([...localWorkDays].sort());

  // 현재 활성 초기화 요청 조회
  useEffect(() => {
    if (!hospitalId || !isStaff) return;
    resetService.getActiveRequest(hospitalId).then(req => {
      setResetRequest(req);
      setResetLoaded(true);
    });
  }, [hospitalId, isStaff]);

  const handleResetRequest = async () => {
    if (!hospitalId || !resetReason.trim()) return;
    setIsSubmitting(true);
    const req = await resetService.requestReset(hospitalId, resetReason.trim());
    if (req) {
      setResetRequest(req);
      setShowResetModal(false);
      setResetReason('');
    } else {
      showToast('초기화 요청에 실패했습니다.', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCancelReset = async () => {
    if (!resetRequest) return;
    setConfirmModal({
      message: '초기화 예약을 취소하시겠습니까?',
      onConfirm: async () => {
        setConfirmModal(null);
        const ok = await resetService.cancelRequest(resetRequest.id);
        if (ok) {
          setResetRequest(null);
        } else {
          showToast('취소에 실패했습니다.', 'error');
        }
      },
    });
  };

  const cards: SettingsCard[] = [
    {
      id: 'fixture_upload',
      title: '로우데이터 업로드',
      description: '픽스쳐 엑셀 파일을 업로드하여 재고 데이터의 기초를 구성합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      id: 'fixture_edit',
      title: '데이터 설정/가공',
      description: '업로드된 로우데이터를 가공하고 재고 마스터에 반영합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'member_management',
      title: '구성원 관리',
      description: '병원 구성원의 가입 승인, 초대, 권한을 관리합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      requireMaster: true,
      feature: 'role_management',
    },
    {
      id: 'audit_log',
      title: '감사 로그',
      description: '누가, 언제, 어떤 작업을 수행했는지 이력을 조회합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      requireMaster: true,
      feature: 'audit_log',
    },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">설정</h2>
        <p className="text-sm text-slate-500 font-medium italic mt-1">데이터 관리, 구성원, 감사 로그 등 시스템 설정을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => {
          const isPlanLocked = card.feature ? !planService.canAccess(plan, card.feature) : false;
          const isRoleLocked = card.requireMaster ? (!isMaster || !!isStaff) : false;
          const isLocked = isPlanLocked || isRoleLocked;
          const minPlan = card.feature ? getMinPlanForFeature(card.feature) : null;
          const minPlanLabel = minPlan ? PLAN_NAMES[minPlan] : '';

          return (
            <button
              key={card.id}
              onClick={() => !isLocked && onNavigate(card.id)}
              disabled={isLocked}
              className={`group relative text-left p-6 rounded-2xl border transition-all duration-200 ${
                isLocked
                  ? 'bg-slate-50/80 border-slate-200 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-0.5 active:scale-[0.99]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isLocked
                    ? 'bg-slate-100 text-slate-300'
                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                } transition-colors`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                      {card.title}
                    </h3>
                    {isLocked && (
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>
                    {card.description}
                  </p>
                  {isLocked && (
                    <div className="mt-2 space-y-1">
                      {isPlanLocked && (
                        <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                          <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">{minPlanLabel}</span> 이상 플랜에서 이용 가능
                        </p>
                      )}
                      {isRoleLocked && (
                        <p className="text-[11px] font-bold text-amber-600">
                          {isStaff ? '클리닉 워크스페이스 전용 기능입니다' : '병원 관리자 권한이 필요합니다'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform ${isLocked ? 'text-slate-200' : 'text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* 진료 요일 설정 섹션 (Master 전용) */}
      {isMaster && hospitalId && (
        <>
          <div className="flex items-center gap-4 pt-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Clinic Settings</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">진료 요일 설정</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  병원의 정기 진료 요일을 설정합니다. 공휴일 API와 함께 수술 통계의 일 평균 진료일수 산출에 사용됩니다.
                </p>
              </div>
            </div>

            <WorkDaySelector
              value={localWorkDays}
              onChange={setLocalWorkDays}
              disabled={isSavingWorkDays}
            />

            <div className="flex items-center justify-between mt-5">
              {workDaysSaved ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  저장되었습니다
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  {workDaysChanged ? '변경사항이 있습니다' : '현재 저장된 설정입니다'}
                </span>
              )}
              <button
                onClick={handleSaveWorkDays}
                disabled={isSavingWorkDays || !workDaysChanged}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
              >
                {isSavingWorkDays ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 데이터 초기화 섹션 (개인 담당자 전용) */}
      {isStaff && hospitalId && (
        <>
          <div className="flex items-center gap-4 pt-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Danger Zone</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* 활성 요청이 있는 경우: 상태 표시 */}
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
                    onClick={handleCancelReset}
                    className="px-4 py-2 text-xs font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          ) : resetLoaded && (
            /* 요청 없음: 초기화 카드 */
            <button
              onClick={() => setShowResetModal(true)}
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
                    이직 등의 사유로 워크스페이스 데이터를 초기화합니다. 관리자 승인 후 데이터가 삭제되며 계정은 일시정지 상태로 전환됩니다.
                  </p>
                </div>
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}
        </>
      )}

      {/* 초기화 요청 모달 */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowResetModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">데이터 초기화 요청</h3>
                <p className="text-xs text-slate-500">관리자 승인 후 초기화가 진행됩니다.</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4">
              <p className="text-xs text-rose-800 font-semibold mb-2">다음 데이터가 모두 삭제됩니다:</p>
              <ul className="text-xs text-rose-700 space-y-1">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />재고 마스터 (전체 품목)</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />수술 기록 데이터</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />주문 내역</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />작업 로그</li>
              </ul>
              <p className="text-[11px] text-rose-600 mt-2 font-bold">* 회원 정보 및 플랜 설정은 유지됩니다.</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">초기화 사유</label>
              <textarea
                value={resetReason}
                onChange={e => setResetReason(e.target.value)}
                placeholder="초기화를 요청하는 이유를 입력해주세요..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResetRequest}
                disabled={isSubmitting || !resetReason.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '요청 중...' : '초기화 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {confirmModal && (
      <ConfirmModal
        title="확인"
        message={confirmModal.message}
        confirmColor="rose"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {toast.message}
      </div>
    )}
    </>
  );
};

export default SettingsHub;
