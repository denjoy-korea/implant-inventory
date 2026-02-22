import React from 'react';
import { PLAN_SHORT_NAMES } from '../../../types';

interface PlanCapacity {
  plan: string;
  capacity: number;
}

interface PlanUsage {
  plan: string;
  usage_count: number;
}

interface SystemAdminPlanManagementTabProps {
  planCapacities: PlanCapacity[];
  planUsages: PlanUsage[];
  planCapacityEditing: Record<string, number>;
  planCapacitySaving: string | null;
  onSelectPlanHospital: (plan: string, label: string) => void;
  onStartEditCapacity: (plan: string, capacity: number) => void;
  onChangeEditCapacity: (plan: string, value: number) => void;
  onCancelEditCapacity: (plan: string) => void;
  onSaveCapacity: (plan: string) => void;
}

const PLAN_DISPLAY: { key: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'free', label: PLAN_SHORT_NAMES.free, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  { key: 'basic', label: PLAN_SHORT_NAMES.basic, color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  { key: 'plus', label: PLAN_SHORT_NAMES.plus, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { key: 'business', label: PLAN_SHORT_NAMES.business, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
];

const SystemAdminPlanManagementTab: React.FC<SystemAdminPlanManagementTabProps> = ({
  planCapacities,
  planUsages,
  planCapacityEditing,
  planCapacitySaving,
  onSelectPlanHospital,
  onStartEditCapacity,
  onChangeEditCapacity,
  onCancelEditCapacity,
  onSaveCapacity,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          각 플랜의 <strong>최대 수용 가능 워크스페이스 수</strong>를 설정합니다. 사용 카운트는 무료체험 중인 워크스페이스를 포함합니다.<br />
          한도가 가득 찬 플랜은 가입 화면에서 <strong>품절</strong>로 표시되며 신규 가입이 제한됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLAN_DISPLAY.map(({ key, label, color, bgColor, borderColor }) => {
          const cap = planCapacities.find((item) => item.plan === key);
          const usage = planUsages.find((item) => item.plan === key);
          const capacity = cap?.capacity ?? 0;
          const usageCount = Number(usage?.usage_count ?? 0);
          const pct = capacity > 0 ? Math.min(100, Math.round((usageCount / capacity) * 100)) : 0;
          const isFull = usageCount >= capacity && capacity > 0;
          const isEditing = key in planCapacityEditing;
          const editValue = planCapacityEditing[key] ?? capacity;

          return (
            <div
              key={key}
              className={`rounded-2xl border-2 ${borderColor} ${bgColor} p-5 flex flex-col gap-4 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => onSelectPlanHospital(key, label)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${color}`}>{label}</span>
                  {isFull && (
                    <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">품절</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {usageCount} / {capacity}개
                </span>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-slate-100">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>사용 {pct}%</span>
                  <span>{capacity - usageCount > 0 ? `잔여 ${capacity - usageCount}개` : '잔여 없음'}</span>
                </div>
              </div>

              <div
                className="flex items-center gap-2 pt-1 border-t border-slate-200/70"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="text-xs text-slate-500 flex-shrink-0">최대 한도</span>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      min={usageCount}
                      value={editValue}
                      onChange={(event) => onChangeEditCapacity(key, Number(event.target.value))}
                      className="flex-1 min-w-0 border border-indigo-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                    />
                    <button
                      onClick={() => onSaveCapacity(key)}
                      disabled={planCapacitySaving === key}
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {planCapacitySaving === key ? '저장중…' : '저장'}
                    </button>
                    <button
                      onClick={() => onCancelEditCapacity(key)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs font-bold text-slate-800">{capacity}개</span>
                    <button
                      onClick={() => onStartEditCapacity(key, capacity)}
                      className="text-xs font-medium text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      수정
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">전체 요약</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-bold">플랜</th>
                <th className="pb-2 font-bold text-center">한도</th>
                <th className="pb-2 font-bold text-center">사용</th>
                <th className="pb-2 font-bold text-center">잔여</th>
                <th className="pb-2 font-bold text-center">점유율</th>
                <th className="pb-2 font-bold text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PLAN_DISPLAY.map(({ key, label }) => {
                const cap = planCapacities.find((item) => item.plan === key);
                const usage = planUsages.find((item) => item.plan === key);
                const capacity = cap?.capacity ?? 0;
                const usageCount = Number(usage?.usage_count ?? 0);
                const pct = capacity > 0 ? Math.min(100, Math.round((usageCount / capacity) * 100)) : 0;
                const isFull = usageCount >= capacity && capacity > 0;
                return (
                  <tr key={key} className="text-slate-600">
                    <td className="py-2.5 font-bold">{label}</td>
                    <td className="py-2.5 text-center">{capacity}</td>
                    <td className="py-2.5 text-center">{usageCount}</td>
                    <td className="py-2.5 text-center">{Math.max(0, capacity - usageCount)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`font-bold ${pct >= 100 ? 'text-rose-500' : pct >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>{pct}%</span>
                    </td>
                    <td className="py-2.5 text-center">
                      {isFull
                        ? <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">품절</span>
                        : <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">가입 가능</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminPlanManagementTab;
