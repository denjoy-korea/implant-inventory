import React from 'react';
import ModalShell from '../../../shared/ModalShell';

interface AnalyzeSizeFormatDetailModalProps {
  items: string[];
  onClose: () => void;
}

const AnalyzeSizeFormatDetailModal: React.FC<AnalyzeSizeFormatDetailModalProps> = ({ items, onClose }) => {
  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title="사이즈 포맷 혼용 상세"
      titleId="analyze-size-format-detail-title"
      maxWidth="max-w-2xl"
    >
      <div className="px-5 pt-1 pb-2">
        <p className="text-xs text-slate-500">브랜드별 혼용 포맷과 실제 예시 규격을 확인하세요.</p>
      </div>
      <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
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
    </ModalShell>
  );
};

export default AnalyzeSizeFormatDetailModal;
