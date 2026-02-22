import React from 'react';
import { ContactInquiry } from '../../services/contactService';
import { PLAN_LIMITS, PLAN_SHORT_NAMES, BillingCycle, DbProfile, PlanType } from '../../types';
import { DbHospitalRow, getTrialInfo } from './systemAdminDomain';

export interface AdminConfirmModalPayload {
  title: string;
  message: string;
  confirmColor?: 'rose' | 'amber' | 'indigo';
  confirmLabel?: string;
  onConfirm: () => void;
}

interface PlanAssignModalProps {
  modal: { hospitalId: string; hospitalName: string } | null;
  hospitals: DbHospitalRow[];
  planForm: { plan: PlanType; cycle: BillingCycle };
  planSaving: boolean;
  trialSaving: string | null;
  onClose: () => void;
  onChangePlan: (plan: PlanType) => void;
  onChangeCycle: (cycle: BillingCycle) => void;
  onAssignPlan: () => void;
  onRequestStartTrial: (hospital: DbHospitalRow) => void;
  onRequestResetTrial: (hospital: DbHospitalRow) => void;
}

export const PlanAssignModal: React.FC<PlanAssignModalProps> = ({
  modal,
  hospitals,
  planForm,
  planSaving,
  trialSaving,
  onClose,
  onChangePlan,
  onChangeCycle,
  onAssignPlan,
  onRequestStartTrial,
  onRequestResetTrial,
}) => {
  if (!modal) return null;

  const targetHospital = hospitals.find(hospital => hospital.id === modal.hospitalId) ?? null;
  const trial = targetHospital ? getTrialInfo(targetHospital) : null;
  const isTrialBusy = !!targetHospital && trialSaving === targetHospital.id;

  return (
    <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4" onClick={() => !planSaving && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-slate-800 mb-1">플랜 변경</h2>
        <p className="text-xs text-slate-500 mb-5">{modal.hospitalName}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">플랜</label>
            <select
              value={planForm.plan}
              onChange={e => onChangePlan(e.target.value as PlanType)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="free">{PLAN_SHORT_NAMES.free}</option>
              <option value="basic">{PLAN_SHORT_NAMES.basic}</option>
              <option value="plus">{PLAN_SHORT_NAMES.plus}</option>
              <option value="business">{PLAN_SHORT_NAMES.business}</option>
              <option value="ultimate">{PLAN_SHORT_NAMES.ultimate}</option>
            </select>
          </div>
          {planForm.plan !== 'free' && planForm.plan !== 'ultimate' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">결제 주기</label>
              <select
                value={planForm.cycle}
                onChange={e => onChangeCycle(e.target.value as BillingCycle)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="monthly">월간</option>
                <option value="yearly">연간</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={planSaving}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onAssignPlan}
            disabled={planSaving}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {planSaving ? '적용 중...' : '적용'}
          </button>
        </div>

        {targetHospital && trial && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">무료 체험 관리</p>
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <div>
                {trial.status === 'unused' && (
                  <>
                    <p className="text-xs font-bold text-slate-600">미사용</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">14일 체험 시작 가능</p>
                  </>
                )}
                {trial.status === 'active' && (
                  <>
                    <p className="text-xs font-bold text-emerald-600">체험 중</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(targetHospital.trial_started_at!).toLocaleDateString('ko-KR')} 시작 ·{' '}
                      <span className={`font-bold ${(trial.daysLeft ?? 0) <= 3 ? 'text-rose-500' : 'text-slate-600'}`}>D-{trial.daysLeft}</span>
                    </p>
                  </>
                )}
                {trial.status === 'expired' && (
                  <>
                    <p className="text-xs font-bold text-rose-500">체험 종료</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">사용 완료됨</p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {trial.status === 'unused' && (
                  <button
                    onClick={() => onRequestStartTrial(targetHospital)}
                    disabled={isTrialBusy}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isTrialBusy ? '...' : '체험 시작'}
                  </button>
                )}
                {(trial.status === 'active' || trial.status === 'expired') && (
                  <button
                    onClick={() => onRequestResetTrial(targetHospital)}
                    disabled={isTrialBusy}
                    className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    {isTrialBusy ? '...' : '체험 리셋'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PlanHospitalsModalProps {
  modal: { plan: string; label: string } | null;
  hospitals: DbHospitalRow[];
  onClose: () => void;
  getHospitalMemberCount: (hospitalId: string) => number;
  getMasterName: (masterAdminId: string | null) => string;
}

export const PlanHospitalsModal: React.FC<PlanHospitalsModalProps> = ({
  modal,
  hospitals,
  onClose,
  getHospitalMemberCount,
  getMasterName,
}) => {
  if (!modal) return null;
  const planHospitals = hospitals.filter(hospital => hospital.plan === modal.plan);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">{modal.label} 플랜 병원</h3>
            <p className="text-xs text-slate-400 mt-0.5">총 {planHospitals.length}개 병원</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {planHospitals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">해당 플랜을 이용 중인 병원이 없습니다.</p>
          ) : planHospitals.map(hospital => {
            const memberCount = getHospitalMemberCount(hospital.id);
            const masterName = getMasterName(hospital.master_admin_id);
            const trial = getTrialInfo(hospital);
            return (
              <div key={hospital.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{hospital.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {masterName !== '-' ? `원장: ${masterName}` : '원장 미지정'}
                    {hospital.plan_expires_at && (
                      <span className="ml-2">만료: {new Date(hospital.plan_expires_at).toLocaleDateString('ko-KR')}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {trial.status === 'active' && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      체험 D-{trial.daysLeft}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{memberCount}명</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface HospitalDetailModalProps {
  hospital: DbHospitalRow | null;
  onClose: () => void;
  getHospitalMemberCount: (hospitalId: string) => number;
  getMasterName: (masterAdminId: string | null) => string;
}

export const HospitalDetailModal: React.FC<HospitalDetailModalProps> = ({
  hospital,
  onClose,
  getHospitalMemberCount,
  getMasterName,
}) => {
  if (!hospital) return null;

  const trial = getTrialInfo(hospital);
  const current = getHospitalMemberCount(hospital.id);
  const max = PLAN_LIMITS[hospital.plan as PlanType]?.maxUsers ?? 1;
  const maxLabel = max === Infinity ? '∞' : String(max);
  const used = hospital.base_stock_edit_count ?? 0;
  const maxEdits = PLAN_LIMITS[hospital.plan as PlanType]?.maxBaseStockEdits ?? 0;
  const maxEditsLabel = maxEdits === Infinity ? '∞' : String(maxEdits);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">병원 상세</p>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">{hospital.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">원장 (관리자)</p>
              <p className="text-xs font-bold text-slate-700">{getMasterName(hospital.master_admin_id) || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">구성원</p>
              <p className="text-xs font-bold text-slate-700">{current}<span className="text-slate-400 font-normal">/{maxLabel}</span></p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">플랜</p>
              <p className="text-xs font-bold text-slate-700">
                {PLAN_SHORT_NAMES[hospital.plan as PlanType] || hospital.plan}
                {hospital.billing_cycle && <span className="ml-1 text-slate-400 font-normal text-[10px]">{hospital.billing_cycle === 'yearly' ? '연간' : '월간'}</span>}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">무료체험</p>
              <p className="text-xs font-bold text-slate-700">
                {trial.status === 'unused' ? '미사용' : trial.status === 'active' ? `진행 중 (D-${trial.daysLeft})` : '종료'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">변경일</p>
              <p className="text-xs font-bold text-slate-700">{hospital.plan_changed_at ? new Date(hospital.plan_changed_at).toLocaleDateString('ko-KR') : '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">만료일</p>
              <p className="text-xs font-bold text-slate-700">{hospital.plan_expires_at ? new Date(hospital.plan_expires_at).toLocaleDateString('ko-KR') : '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">세금계산서</p>
              <p className="text-xs font-bold text-slate-700">{hospital.biz_file_url ? '있음' : '없음'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">기초재고 편집</p>
              <p className="text-xs font-bold text-slate-700">{used}<span className="text-slate-400 font-normal">/{maxEditsLabel}</span></p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

interface UserDetailModalProps {
  userDetail: DbProfile | null;
  currentUserId: string | null;
  deletingUserId: string | null;
  onClose: () => void;
  getHospitalName: (hospitalId: string | null) => string;
  getHospitalPlan: (hospitalId: string | null) => DbHospitalRow | null;
  onDeleteUser: (profile: DbProfile) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userDetail,
  currentUserId,
  deletingUserId,
  onClose,
  getHospitalName,
  getHospitalPlan,
  onDeleteUser,
}) => {
  if (!userDetail) return null;

  const hospitalPlan = getHospitalPlan(userDetail.hospital_id);
  const hospitalName = getHospitalName(userDetail.hospital_id);
  const planName = userDetail.role === 'admin'
    ? '-'
    : hospitalPlan
      ? (PLAN_SHORT_NAMES[hospitalPlan.plan as PlanType] || hospitalPlan.plan)
      : 'Free';
  const roleLabel = userDetail.role === 'admin'
    ? '운영자'
    : userDetail.role === 'master'
      ? '원장'
      : userDetail.hospital_id
        ? '스태프'
        : '개인';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${userDetail.role === 'admin' ? 'bg-rose-100 text-rose-600' : userDetail.role === 'master' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
              {userDetail.name.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">회원 상세</p>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">{userDetail.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">이메일</p>
            <p className="text-xs font-bold text-slate-700 break-all">{userDetail.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">연락처</p>
              <p className="text-xs font-bold text-slate-700">{userDetail.phone || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">역할</p>
              <p className="text-xs font-bold text-slate-700">{roleLabel}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">소속 병원</p>
              <p className="text-xs font-bold text-slate-700">{hospitalName === '-' || hospitalName.includes('워크스페이스') ? '-' : hospitalName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">플랜</p>
              <p className="text-xs font-bold text-slate-700">{planName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">상태</p>
              <p className="text-xs font-bold text-slate-700">{userDetail.status === 'active' ? '활성' : '대기'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">가입일</p>
              <p className="text-xs font-bold text-slate-700">{new Date(userDetail.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">마지막 접속</p>
              <p className="text-xs font-bold text-slate-700">{userDetail.last_sign_in_at ? new Date(userDetail.last_sign_in_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 flex gap-2">
          {userDetail.role !== 'admin' && userDetail.id !== currentUserId && (
            <button
              onClick={() => onDeleteUser(userDetail)}
              disabled={deletingUserId === userDetail.id}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

interface InquiryReplyModalProps {
  inquiry: ContactInquiry | null;
  replyMessage: string;
  replySending: boolean;
  onClose: () => void;
  onChangeReplyMessage: (value: string) => void;
  onSend: () => void;
}

export const InquiryReplyModal: React.FC<InquiryReplyModalProps> = ({
  inquiry,
  replyMessage,
  replySending,
  onClose,
  onChangeReplyMessage,
  onSend,
}) => {
  if (!inquiry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">이메일 답장</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">수신자 이메일</p>
              <p className="text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{inquiry.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">담당자</p>
              <p className="text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{inquiry.contact_name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">병원명</p>
              <p className="text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{inquiry.hospital_name}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">원본 문의 내용</p>
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {inquiry.content}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">답변 메시지 <span className="text-rose-400">*</span></p>
            <textarea
              value={replyMessage}
              onChange={e => onChangeReplyMessage(e.target.value)}
              placeholder="답변 내용을 입력하세요..."
              rows={6}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={replySending}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onSend}
            disabled={replySending || !replyMessage.trim()}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {replySending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  );
};
