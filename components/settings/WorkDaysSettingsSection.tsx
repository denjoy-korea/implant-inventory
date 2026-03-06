import React from 'react';
import { WorkDaySelector } from '../WorkDaySelector';

interface WorkDaysSettingsSectionProps {
  canAccessWorkDays: boolean;
  hospitalId?: string;
  localWorkDays: number[];
  onChangeLocalWorkDays: (days: number[]) => void;
  isSavingWorkDays: boolean;
  workDaysSaved: boolean;
  workDaysChanged: boolean;
  onSaveWorkDays: () => void;
}

const WorkDaysSettingsSection: React.FC<WorkDaysSettingsSectionProps> = ({
  canAccessWorkDays,
  hospitalId,
  localWorkDays,
  onChangeLocalWorkDays,
  isSavingWorkDays,
  workDaysSaved,
  workDaysChanged,
  onSaveWorkDays,
}) => {
  if (!canAccessWorkDays || !hospitalId) return null;

  return (
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
          onChange={onChangeLocalWorkDays}
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
            onClick={onSaveWorkDays}
            disabled={isSavingWorkDays || !workDaysChanged}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
          >
            {isSavingWorkDays ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
};

export default WorkDaysSettingsSection;
