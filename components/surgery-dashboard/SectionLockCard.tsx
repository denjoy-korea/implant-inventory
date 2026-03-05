
import React from 'react';

const SectionLockCard: React.FC<{
  title: string;
  desc: string;
  requiredPlan: string;
  onUpgrade?: () => void;
}> = ({ title, desc, requiredPlan, onUpgrade }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
        <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
    <div className="flex items-center gap-3 mt-4">
      <span className="text-xs text-slate-400">
        <span className="font-bold text-indigo-600">{requiredPlan}</span> 플랜부터 사용 가능
      </span>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          업그레이드
        </button>
      )}
    </div>
  </div>
);

export default SectionLockCard;
