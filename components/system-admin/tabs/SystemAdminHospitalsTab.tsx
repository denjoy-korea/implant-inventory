import React from 'react';
import { PLAN_LIMITS, PLAN_SHORT_NAMES, PlanType } from '../../../types';
import { DbHospitalRow, getTrialInfo } from '../systemAdminDomain';

interface SystemAdminHospitalsTabProps {
  hospitals: DbHospitalRow[];
  trialSaving: string | null;
  editCountResetting: string | null;
  getMasterName: (masterAdminId: string | null) => string;
  getHospitalMemberCount: (hospitalId: string) => number;
  getBizFileName: (hospital: DbHospitalRow) => string;
  onOpenHospitalDetail: (hospital: DbHospitalRow) => void;
  onOpenPlanModal: (hospital: DbHospitalRow) => void;
  onStartTrial: (hospital: DbHospitalRow) => void;
  onResetTrial: (hospital: DbHospitalRow) => void;
  onResetEditCount: (hospital: DbHospitalRow) => void;
  onPreviewBizFile: (hospital: DbHospitalRow) => void;
  onDownloadBizFile: (hospital: DbHospitalRow) => void;
}

const SystemAdminHospitalsTab: React.FC<SystemAdminHospitalsTabProps> = ({
  hospitals,
  trialSaving,
  editCountResetting,
  getMasterName,
  getHospitalMemberCount,
  getBizFileName,
  onOpenHospitalDetail,
  onOpenPlanModal,
  onStartTrial,
  onResetTrial,
  onResetEditCount,
  onPreviewBizFile,
  onDownloadBizFile,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">병원명</th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">원장 (관리자)</th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">구성원</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">플랜</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">변경일</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">만료일</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">무료체험</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">세금계산서 파일</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">기초재고 편집</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {hospitals.map(h => (
            <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{h.name}</span>
                  <button
                    onClick={() => onOpenHospitalDetail(h)}
                    className="ml-1 flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    상세
                  </button>
                </div>
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-600 font-medium">{getMasterName(h.master_admin_id)}</td>
              <td className="hidden md:table-cell px-4 py-3">
                {(() => {
                  const current = getHospitalMemberCount(h.id);
                  const max = PLAN_LIMITS[h.plan as PlanType]?.maxUsers ?? 1;
                  const maxLabel = max === Infinity ? '∞' : String(max);
                  const isFull = max !== Infinity && current >= max;
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isFull ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                      {current}<span className="font-normal opacity-60">/{maxLabel}</span>
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onOpenPlanModal(h)}
                  className={`px-2 py-0.5 rounded-full text-xs font-bold border cursor-pointer hover:opacity-75 transition-opacity ${h.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : h.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}
                >
                  {PLAN_SHORT_NAMES[h.plan as PlanType] || h.plan}
                </button>
                {h.billing_cycle && (
                  <span className="ml-1 text-[10px] text-slate-400">{h.billing_cycle === 'yearly' ? '연간' : '월간'}</span>
                )}
              </td>
              <td className="hidden xl:table-cell px-4 py-3 text-xs text-slate-400">
                {h.plan_changed_at ? new Date(h.plan_changed_at).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td className="hidden xl:table-cell px-4 py-3 text-xs text-slate-400">
                {h.plan_expires_at ? new Date(h.plan_expires_at).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td className="hidden lg:table-cell px-4 py-3">
                {(() => {
                  const trial = getTrialInfo(h);
                  const isBusy = trialSaving === h.id;
                  if (trial.status === 'unused') {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">미사용</span>
                        <button
                          onClick={() => onStartTrial(h)}
                          disabled={isBusy}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                        >
                          {isBusy ? '...' : '시작'}
                        </button>
                      </div>
                    );
                  }
                  if (trial.status === 'active') {
                    const color = (trial.daysLeft ?? 0) <= 3 ? 'text-rose-600 bg-rose-50 border-rose-200' : (trial.daysLeft ?? 0) <= 7 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                          D-{trial.daysLeft}
                        </span>
                        <button
                          onClick={() => onResetTrial(h)}
                          disabled={isBusy}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          {isBusy ? '...' : '리셋'}
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">종료</span>
                      <button
                        onClick={() => onResetTrial(h)}
                        disabled={isBusy}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      >
                        {isBusy ? '...' : '리셋'}
                      </button>
                    </div>
                  );
                })()}
              </td>
              <td className="hidden xl:table-cell px-4 py-3">
                {h.biz_file_url ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onPreviewBizFile(h)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      title="미리보기"
                      aria-label="세금계산서 파일 미리보기"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDownloadBizFile(h)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                      title={getBizFileName(h)}
                      aria-label="세금계산서 파일 다운로드"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-300">없음</span>
                )}
              </td>
              <td className="hidden xl:table-cell px-4 py-3">
                {(() => {
                  const used = h.base_stock_edit_count ?? 0;
                  const max = PLAN_LIMITS[h.plan as PlanType]?.maxBaseStockEdits ?? 0;
                  const maxLabel = max === Infinity ? '∞' : String(max);
                  const isExhausted = max !== Infinity && used >= max;
                  return (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold tabular-nums ${isExhausted ? 'text-rose-600' : 'text-slate-700'}`}>
                        {used}<span className="text-slate-400 font-normal">/{maxLabel}</span>
                      </span>
                      <button
                        onClick={() => onResetEditCount(h)}
                        disabled={editCountResetting === h.id || used === 0}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {editCountResetting === h.id ? '...' : '초기화'}
                      </button>
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
          {hospitals.length === 0 && (
            <tr><td colSpan={9} className="p-12 text-center text-slate-400">등록된 병원이 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SystemAdminHospitalsTab;
