import React from 'react';

interface WorkDaySelectorProps {
  value: number[];                        // [0-6] 배열: 0=일, 1=월, ..., 6=토
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_SHORT  = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 선택된 요일 기준 월 평균 진료일수 추정 (공휴일 미고려, 표시용) */
function estimateMonthlyDays(clinicDays: number[]): number {
  return Math.round(clinicDays.length * 4.33);
}

export const WorkDaySelector: React.FC<WorkDaySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const toggle = (dow: number) => {
    if (disabled) return;
    const next = value.includes(dow)
      ? value.filter(d => d !== dow)
      : [...value, dow].sort((a, b) => a - b);
    if (next.length === 0) return; // 최소 1개 필수
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-slate-700">진료 요일 선택</span>
        <span className="text-xs text-slate-400">
          주 {value.length}일 · 월 약 {estimateMonthlyDays(value)}일
          <span className="ml-1 opacity-60">(공휴일 제외 전)</span>
        </span>
      </div>

      <div className="flex gap-2">
        {DAY_LABELS.map((label, dow) => {
          const isSelected = value.includes(dow);
          const isWeekend = dow === 0 || dow === 6;
          return (
            <button
              key={dow}
              type="button"
              onClick={() => toggle(dow)}
              disabled={disabled}
              title={`${label}요일 ${isSelected ? '해제' : '선택'}`}
              className={[
                'w-11 h-11 rounded-xl flex flex-col items-center justify-center',
                'text-xs font-bold transition-all duration-150 select-none',
                isSelected
                  ? isWeekend
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-300 shadow-sm'
                    : 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-sm'
                  : 'bg-slate-50 text-slate-400 border-2 border-slate-200 hover:border-slate-300 hover:text-slate-500',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="text-sm leading-none">{label}</span>
              <span className="text-[9px] font-normal opacity-50 mt-0.5">{DAY_SHORT[dow]}</span>
            </button>
          );
        })}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-rose-500 mt-2">최소 1개 이상 선택해야 합니다.</p>
      )}
    </div>
  );
};

export default WorkDaySelector;
