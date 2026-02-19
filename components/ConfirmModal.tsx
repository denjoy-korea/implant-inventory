
import React, { useEffect } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  tip?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const COLORS = {
  indigo: {
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
  },
  rose: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  tip,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmColor = 'indigo',
  icon,
  onConfirm,
  onCancel,
}) => {
  const c = COLORS[confirmColor];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body */}
        <div className="px-6 pt-7 pb-5 text-center">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl ${c.iconBg} ${c.iconText} flex items-center justify-center mx-auto mb-4`}>
            {icon || (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{message}</p>

          {/* Tip */}
          {tip && (
            <div className="mt-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{tip}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-[0.98] ${c.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
