import React from 'react';
import type { UploadRequirement } from './uploadTypes';

interface AnalyzeUploadChecklistSectionProps {
  uploadRequirements: UploadRequirement[];
}

const AnalyzeUploadChecklistSection: React.FC<AnalyzeUploadChecklistSectionProps> = ({ uploadRequirements }) => {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">분석 시작 전 체크</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {uploadRequirements.map((item) => {
          const isDone = item.status === 'done';
          const isWarning = item.status === 'warning';
          return (
            <div
              key={item.label}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold border flex flex-col justify-center ${isDone
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : isWarning
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isWarning ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
                {item.label}
              </span>
              {item.detail && (
                <span className={`block mt-1 pl-5 text-[10.5px] font-medium tracking-tight ${isDone ? 'text-emerald-600/80' : 'text-slate-400'}`}>
                  {item.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyzeUploadChecklistSection;
