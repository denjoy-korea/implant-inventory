import React, { useState, useCallback } from 'react';
import { FailCandidate } from '../../types';
import { failDetectionService } from '../../services/failDetectionService';
import { Z } from '../../utils/zIndex';
import ModalShell from '../shared/ModalShell';

interface FailDetectionModalProps {
  candidates: FailCandidate[];
  hospitalId: string;
  currentUserName: string;
  onClose: () => void;
}

const FailDetectionModal: React.FC<FailDetectionModalProps> = ({
  candidates,
  hospitalId,
  currentUserName,
  onClose,
}) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(candidates.map((_, i) => i)));
  const [saving, setSaving] = useState(false);


  const toggle = useCallback((idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      const confirmed = candidates.filter((_, i) => selected.has(i));
      const pending   = candidates.filter((_, i) => !selected.has(i));
      await Promise.all([
        failDetectionService.saveCandidates(confirmed, hospitalId, 'confirmed', currentUserName),
        failDetectionService.saveCandidates(pending,   hospitalId, 'pending'),
      ]);
    } finally {
      setSaving(false);
      onClose();
    }
  }, [candidates, selected, hospitalId, currentUserName, onClose]);

  const handleLater = useCallback(async () => {
    setSaving(true);
    try {
      await failDetectionService.saveCandidates(candidates, hospitalId, 'pending');
    } finally {
      setSaving(false);
      onClose();
    }
  }, [candidates, hospitalId, onClose]);

  return (
    <ModalShell isOpen={true} onClose={onClose} title="FAIL 자동 감지 결과" titleId="fail-detection-title" zIndex={Z.MODAL} closeable={!saving} maxWidth="max-w-lg" className="rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 id="fail-detection-title" className="text-sm font-black text-slate-800">FAIL 자동 감지 결과</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {candidates.length}건의 재식립이 감지되었습니다. 실제 FAIL 여부를 확인해주세요.
              </p>
            </div>
          </div>
        </div>

        {/* Candidate list */}
        <div className="px-6 py-4 max-h-[360px] overflow-y-auto space-y-3 custom-scrollbar">
          {candidates.map((c, i) => (
            <label
              key={`${c.originalRecord.id}|${c.reimplantRecord.id}|${c.matchedTooth}`}
              className={`block cursor-pointer rounded-xl border p-3 transition-all ${
                selected.has(i)
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-rose-500 h-4 w-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      #{c.matchedTooth} 치아
                    </span>
                    {c.patientMasked && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {c.patientMasked}
                      </span>
                    )}
                  </div>

                  {/* 원래 식립 */}
                  <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">원래 식립</p>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {c.originalRecord.date}
                      <span className="mx-1 text-slate-300">·</span>
                      {c.originalRecord.manufacturer} {c.originalRecord.brand}
                      {c.originalRecord.size && (
                        <span className="text-slate-500 ml-1">{c.originalRecord.size}</span>
                      )}
                    </p>
                  </div>

                  {/* 재식립 */}
                  <div className="bg-rose-50 rounded-lg px-3 py-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">재식립</p>
                    <p className="text-[11px] font-semibold text-rose-700">
                      {c.reimplantRecord.date}
                      <span className="mx-1 text-rose-300">·</span>
                      {c.reimplantRecord.manufacturer} {c.reimplantRecord.brand}
                      {c.reimplantRecord.size && (
                        <span className="text-rose-500 ml-1">{c.reimplantRecord.size}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 flex-1">
            선택한 항목이 실제 FAIL로 기록됩니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleLater}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              나중에
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || selected.size === 0}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && (
                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              FAIL 확인 ({selected.size}건)
            </button>
          </div>
        </div>
    </ModalShell>
  );
};

export default FailDetectionModal;
