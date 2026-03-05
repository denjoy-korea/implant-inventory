import React, { useState } from 'react';

export interface ManualFixCheckResult {
  checked: number;
  found: number;
  applicable: number;
  alreadyFixed: number;
  updated: number;
  failed: number;
  notFound: number;
  appliedManufacturer: string;
  appliedBrand: string;
  appliedSize: string;
}

interface ManualFixDraft {
  manufacturer: string;
  brand: string;
  size: string;
}

interface ManualFixTarget {
  rowKey: string;
  manufacturer: string;
  brand: string;
  size: string;
  canonicalManufacturer: string;
  canonicalBrand: string;
  preferredManualFixSize: string;
  recordIds?: string[];
  samples?: Array<{
    recordId?: string;
    date?: string;
    patientMasked?: string;
    chartNumber?: string;
  }>;
}

interface ManualFixModalProps {
  target: ManualFixTarget;
  onResolveManualInput?: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }) => Promise<ManualFixCheckResult>;
  onClose: () => void;
  onResolved: (rowKey: string) => void;
}

const ManualFixModal: React.FC<ManualFixModalProps> = ({ target, onResolveManualInput, onClose, onResolved }) => {
  const [manualFixCheckResult, setManualFixCheckResult] = useState<ManualFixCheckResult | null>(null);
  const [manualFixError, setManualFixError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ManualFixDraft>({
    manufacturer: target.canonicalManufacturer,
    brand: target.canonicalBrand,
    size: target.preferredManualFixSize,
  });

  const isDraftValid =
    String(draft.manufacturer || '').trim().length > 0 &&
    String(draft.brand || '').trim().length > 0 &&
    String(draft.size || '').trim().length > 0;

  const getRecordIds = (): string[] => {
    const fromItem = (target.recordIds || []).filter(Boolean);
    const fromSamples = (target.samples || [])
      .map(sample => String(sample.recordId || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromItem, ...fromSamples]));
  };

  const handleDraftChange = (field: keyof ManualFixDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setManualFixCheckResult(null);
    setManualFixError(null);
  };

  const handleVerify = async () => {
    if (!onResolveManualInput) return;
    const recordIds = getRecordIds();
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 확인할 수 없습니다.');
      return;
    }
    setManualFixError(null);
    setIsVerifying(true);
    try {
      const draftManufacturer = String(draft.manufacturer || '').trim();
      const draftBrand = String(draft.brand || '').trim();
      const draftSize = String(draft.size || '').trim();
      if (!draftManufacturer || !draftBrand || !draftSize) {
        setManualFixError('제조사, 브랜드, 규격은 모두 입력해야 합니다.');
        return;
      }
      const result = await onResolveManualInput({
        recordIds,
        targetManufacturer: draftManufacturer,
        targetBrand: draftBrand,
        targetSize: draftSize,
        verifyOnly: true,
      });
      setManualFixCheckResult(result);
      if (result.applicable === 0) {
        onResolved(target.rowKey);
      }
    } catch (error) {
      console.error('[ManualFixModal] 수기 입력 확인 실패:', error);
      setManualFixError('수정 완료 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApply = async () => {
    if (!onResolveManualInput) return;
    const recordIds = getRecordIds();
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 적용할 수 없습니다.');
      return;
    }
    setManualFixError(null);
    setIsApplying(true);
    try {
      const draftManufacturer = String(draft.manufacturer || '').trim();
      const draftBrand = String(draft.brand || '').trim();
      const draftSize = String(draft.size || '').trim();
      if (!draftManufacturer || !draftBrand || !draftSize) {
        setManualFixError('제조사, 브랜드, 규격은 모두 입력해야 합니다.');
        return;
      }
      const result = await onResolveManualInput({
        recordIds,
        targetManufacturer: draftManufacturer,
        targetBrand: draftBrand,
        targetSize: draftSize,
      });
      setManualFixCheckResult(result);
      if (result.failed === 0) {
        onResolved(target.rowKey);
      }
    } catch (error) {
      console.error('[ManualFixModal] 수기 입력 DB 적용 실패:', error);
      setManualFixError('수정 적용 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying || isVerifying) return;
    onClose();
  };

  const recordIds = getRecordIds();

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClose}>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[86vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 bg-rose-600 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-lg font-black">수기 입력 데이터 수정 적용</h3>
            <p className="text-rose-100 text-xs font-medium mt-1">
              덴트웹 편집 완료 여부를 먼저 확인한 뒤, 필요 시 수술기록 DB에 표준 형식을 적용합니다.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isApplying || isVerifying}
            aria-label="닫기"
            className={`p-2 rounded-full transition-colors ${
              isApplying || isVerifying
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/15'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 overflow-auto">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 mb-1">수정 전 입력 형식</p>
            <p className="text-base font-black text-rose-600 break-keep">
              {target.manufacturer} - {target.brand} - {target.size}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-emerald-700">수정 후 적용 형식 (구조 고정)</p>
              <button
                onClick={() => setIsEditing(prev => !prev)}
                disabled={isVerifying || isApplying}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black transition-colors ${
                  isVerifying || isApplying
                    ? 'bg-emerald-100 text-emerald-300 cursor-not-allowed'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="표준값 편집"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18.75l.787-3.75L16.862 4.487z" />
                </svg>
                {isEditing ? '편집 완료' : '편집'}
              </button>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-700/90">
                  기본 틀은 고정되며, 각 값만 수정할 수 있습니다. (제조사 - 브랜드 - 규격)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={draft.manufacturer}
                    onChange={(event) => handleDraftChange('manufacturer', event.target.value)}
                    placeholder="제조사"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <input
                    type="text"
                    value={draft.brand}
                    onChange={(event) => handleDraftChange('brand', event.target.value)}
                    placeholder="브랜드"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <input
                    type="text"
                    value={draft.size}
                    onChange={(event) => handleDraftChange('size', event.target.value)}
                    placeholder="규격"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <p className="text-sm font-black text-emerald-700 break-keep">
                  {String(draft.manufacturer || '').trim() || '제조사'} - {String(draft.brand || '').trim() || '브랜드'} - {String(draft.size || '').trim() || '규격'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-base font-black text-emerald-700 break-keep">
                {String(draft.manufacturer || '').trim() || target.canonicalManufacturer} - {String(draft.brand || '').trim() || target.canonicalBrand} - {String(draft.size || '').trim() || target.preferredManualFixSize}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-500">
                대상 레코드 {recordIds.length}건
              </p>
              <button
                onClick={handleVerify}
                disabled={isVerifying || isApplying || !onResolveManualInput || !isDraftValid}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  !isVerifying && !isApplying && onResolveManualInput && isDraftValid
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isVerifying ? '확인 중...' : '덴트웹 편집 후 확인'}
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {(target.samples || []).slice(0, 3).map((sample, idx) => (
                <p key={`${target.rowKey}-manualfix-sample-${idx}`} className="text-[12px] font-semibold text-slate-600 break-keep">
                  {sample.date} · {sample.patientMasked} ({sample.chartNumber})
                </p>
              ))}
              {(target.samples || []).length > 3 && (
                <p className="text-[11px] font-semibold text-slate-400">
                  +{(target.samples || []).length - 3}건 더 있음
                </p>
              )}
            </div>
          </div>

          {manualFixCheckResult && (
            <div className={`rounded-xl border p-3 ${
              manualFixCheckResult.applicable === 0
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <p className={`text-xs font-black ${
                manualFixCheckResult.applicable === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {manualFixCheckResult.applicable === 0
                  ? '이미 목록 선택 형식으로 수정된 상태입니다.'
                  : `${manualFixCheckResult.applicable}건이 아직 수기 입력 형태입니다. 아래 확인 후 적용을 누르면 DB에 표준 형식으로 반영됩니다.`}
              </p>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                확인 {manualFixCheckResult.checked}건 · 찾음 {manualFixCheckResult.found}건 · 이미 수정됨 {manualFixCheckResult.alreadyFixed}건 · 미발견 {manualFixCheckResult.notFound}건
                {manualFixCheckResult.updated > 0 ? ` · 적용 ${manualFixCheckResult.updated}건` : ''}
                {manualFixCheckResult.failed > 0 ? ` · 실패 ${manualFixCheckResult.failed}건` : ''}
              </p>
            </div>
          )}

          {manualFixError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-xs font-bold text-rose-600">{manualFixError}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleClose}
            disabled={isApplying || isVerifying}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              isApplying || isVerifying
                ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            닫기
          </button>
          <button
            onClick={handleApply}
            disabled={
              isApplying ||
              isVerifying ||
              !onResolveManualInput ||
              !isDraftValid ||
              recordIds.length === 0 ||
              (manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
            }
            className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
              !isApplying &&
              !isVerifying &&
              !!onResolveManualInput &&
              isDraftValid &&
              recordIds.length > 0 &&
              !(manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isApplying ? '적용 중...' : '확인 후 적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualFixModal;
