import React from 'react';

interface AnalyzeSizeFormatDetailModalProps {
  items: string[];
  onClose: () => void;
}

const AnalyzeSizeFormatDetailModal: React.FC<AnalyzeSizeFormatDetailModalProps> = ({ items, onClose }) => {
  return (
    <div className="fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">사이즈 포맷 혼용 상세</h3>
            <p className="text-xs text-slate-500 mt-1">브랜드별 혼용 포맷과 실제 예시 규격을 확인하세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <ul className="space-y-3">
            {items.map((item, idx) => {
              const [groupRaw = '', formatsRaw = '', examplesRaw = ''] = item.split(' | ').map(part => part.trim());
              const group = groupRaw || item;
              const formats = formatsRaw.replace(/^포맷:\s*/, '') || '-';
              const examples = examplesRaw.replace(/^예시:\s*/, '') || '-';
              return (
                <li key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">{group}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="font-bold text-slate-700">포맷</span>: {formats}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    <span className="font-bold text-slate-700">예시</span>: {examples}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeSizeFormatDetailModal;
