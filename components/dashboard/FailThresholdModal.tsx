import React, { useState } from 'react';
import { FailThresholds } from '../../services/failThresholdService';

interface Props {
  manufacturers: string[];           // failExchangeEntries에서 추출한 제조사 목록
  currentThresholds: FailThresholds;
  onSave: (thresholds: FailThresholds) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_THRESHOLD = 10;

export default function FailThresholdModal({ manufacturers, currentThresholds, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    manufacturers.forEach((m) => {
      init[m] = String(currentThresholds[m] ?? DEFAULT_THRESHOLD);
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed: FailThresholds = {};
      for (const [m, v] of Object.entries(values)) {
        const n = parseInt(v, 10);
        if (n > 0) parsed[m] = n;
      }
      await onSave(parsed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">FAIL 교환 기준량 설정</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">제조사별 교환 발주 알림 기준을 설정합니다.</p>
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            기준량 도달 시 <span className="font-bold text-rose-600">긴급</span>,
            기준량의 80% 도달 시 <span className="font-bold text-amber-600">주의</span>로 표시됩니다.
          </p>
        </div>

        {/* 제조사별 입력 */}
        <div className="px-6 py-4 space-y-3 max-h-64 overflow-y-auto">
          {manufacturers.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">현재 FAIL 교환 대기 중인 제조사가 없습니다.</p>
          )}
          {manufacturers.map((m) => (
            <div key={m} className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700 min-w-0 truncate flex-1">{m}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={values[m] ?? DEFAULT_THRESHOLD}
                  onChange={(e) => setValues((prev) => ({ ...prev, [m]: e.target.value }))}
                  className="w-16 text-right text-sm font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                />
                <span className="text-xs text-slate-400 w-4">개</span>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-6 pt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
