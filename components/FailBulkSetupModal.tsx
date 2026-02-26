import React, { useState, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================
export interface FailBulkSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 인벤토리 기반 제조사 목록 (FAIL_ 미포함) */
  availableManufacturers: string[];
  /** 현재 미처리 교환 제조사별 건수 */
  pendingByManufacturer: { manufacturer: string; count: number }[];
  onInitialize: (items: { manufacturer: string; count: number; date: string }[]) => Promise<void>;
  onReconcile: (reconciles: { manufacturer: string; targetCount: number }[], date: string) => Promise<void>;
}

type Tab = 'initialize' | 'reconcile';
type Step = 'form' | 'preview' | 'applying' | 'done';

interface InitRow {
  id: string;
  manufacturer: string;
  count: string;
}

// ============================================================
// COMPONENT
// ============================================================
const FailBulkSetupModal: React.FC<FailBulkSetupModalProps> = ({
  isOpen,
  onClose,
  availableManufacturers,
  pendingByManufacturer,
  onInitialize,
  onReconcile,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const totalSystemFailCount = pendingByManufacturer.reduce((sum, item) => sum + (item.count || 0), 0);
  const hasSystemFailRecords = totalSystemFailCount > 0;
  const [tab, setTab] = useState<Tab>(
    hasSystemFailRecords ? 'reconcile' : 'initialize'
  );
  const [step, setStep] = useState<Step>('form');
  const [resultMessage, setResultMessage] = useState('');

  // ── Tab 1: 초기화 상태
  const [initDate, setInitDate] = useState(today);
  const [initRows, setInitRows] = useState<InitRow[]>([
    { id: Date.now().toString(), manufacturer: '', count: '' },
  ]);
  const [noFailConfirmed, setNoFailConfirmed] = useState(false);

  // ── Tab 2: 정리 상태
  const [reconcileDate, setReconcileDate] = useState(today);
  const [reconcileInputs, setReconcileInputs] = useState<Record<string, string>>({});

  // ── 탭 전환 시 초기값 설정
  useEffect(() => {
    if (!isOpen) return;
    setTab(hasSystemFailRecords ? 'reconcile' : 'initialize');
    setStep('form');
    setResultMessage('');
    setInitRows([{ id: Date.now().toString(), manufacturer: '', count: '' }]);
    setReconcileInputs({});
  }, [isOpen, hasSystemFailRecords]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === 'reconcile') {
      const initial: Record<string, string> = {};
      pendingByManufacturer.forEach(({ manufacturer, count }) => {
        initial[manufacturer] = String(count);
      });
      setReconcileInputs(initial);
    }
  }, [tab, isOpen, pendingByManufacturer]);

  // ── ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleClose = () => {
    setStep('form');
    setTab(hasSystemFailRecords ? 'reconcile' : 'initialize');
    setInitRows([{ id: Date.now().toString(), manufacturer: '', count: '' }]);
    setReconcileInputs({});
    setResultMessage('');
    setNoFailConfirmed(false);
    onClose();
  };

  // ============================================================
  // Tab 1: 초기화 helpers
  // ============================================================
  const addInitRow = () =>
    setInitRows(prev => [...prev, { id: Date.now().toString(), manufacturer: '', count: '' }]);

  const removeInitRow = (id: string) =>
    setInitRows(prev => prev.filter(r => r.id !== id));

  const updateInitRow = (id: string, field: 'manufacturer' | 'count', value: string) =>
    setInitRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const validInitItems = initRows
    .filter(r => r.manufacturer.trim() && parseInt(r.count) > 0)
    .map(r => ({ manufacturer: r.manufacturer.trim(), count: parseInt(r.count), date: initDate }));

  // ============================================================
  // Tab 2: 정리 helpers
  // ============================================================
  const reconcileRows = pendingByManufacturer.map(({ manufacturer, count }) => {
    const actual = parseInt(reconcileInputs[manufacturer] ?? String(count));
    const actualSafe = isNaN(actual) ? count : actual;
    const diff = count - actualSafe;
    return { manufacturer, currentCount: count, actualCount: actualSafe, diff };
  });

  const changedReconcileRows = reconcileRows.filter(r => r.diff !== 0);

  const validReconcileItems = reconcileRows.map(r => ({
    manufacturer: r.manufacturer,
    targetCount: r.actualCount,
  }));

  // ============================================================
  // Submit handlers
  // ============================================================
  const allReconcileMatch = hasSystemFailRecords && changedReconcileRows.length === 0;

  const handlePreview = () => {
    if (tab === 'initialize' && !noFailConfirmed && validInitItems.length === 0) return;
    setStep('preview');
  };

  const handleApply = async () => {
    setStep('applying');
    try {
      if (tab === 'initialize') {
        await onInitialize(noFailConfirmed ? [] : validInitItems);
        setResultMessage(
          noFailConfirmed
            ? '교환 픽스처 없음으로 처리 완료됩니다.'
            : `${validInitItems.reduce((s, i) => s + i.count, 0)}건의 교환 재고가 등록되었습니다.`
        );
      } else {
        await onReconcile(validReconcileItems, reconcileDate);
        if (allReconcileMatch) {
          setResultMessage('시스템 기록과 실제 재고가 일치합니다. 확인 완료되었습니다.');
        } else {
          const updated = changedReconcileRows.filter(r => r.diff > 0).reduce((s, r) => s + r.diff, 0);
          const inserted = changedReconcileRows.filter(r => r.diff < 0).reduce((s, r) => s + Math.abs(r.diff), 0);
          const parts: string[] = [];
          if (updated > 0) parts.push(`${updated}건 교환완료 처리`);
          if (inserted > 0) parts.push(`${inserted}건 신규 등록`);
          setResultMessage(parts.join(', ') + '되었습니다.');
        }
      }
      setStep('done');
    } catch {
      setStep('form');
    }
  };

  if (!isOpen) return null;

  // ============================================================
  // RENDER: Overlay + Modal
  // ============================================================
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">교환 재고 일괄 관리</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">브랜드별 교환 픽스처 재고를 시스템에 반영합니다</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tab Bar (form step만) */}
        {step === 'form' && (
          <div className="flex border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setTab('initialize')}
              className={`flex-1 px-4 py-3 text-xs font-bold transition-colors ${tab === 'initialize' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/40' : 'text-slate-400 hover:text-slate-600'}`}
            >
              초기화 등록
              <span className="ml-1.5 text-[10px] font-medium opacity-70">수기 장부 → 디지털</span>
            </button>
            <button
              onClick={() => setTab('reconcile')}
              className={`flex-1 px-4 py-3 text-xs font-bold transition-colors ${tab === 'reconcile' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/40' : 'text-slate-400 hover:text-slate-600'}`}
            >
              재고 정리
              <span className="ml-1.5 text-[10px] font-medium opacity-70">기존 데이터 조정</span>
            </button>
          </div>
        )}

        {/* ── Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ============ DONE ============ */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">완료!</p>
                <p className="text-xs text-slate-500 mt-1">{resultMessage}</p>
                <p className="text-[11px] text-slate-400 mt-1">교환 관리 화면이 자동으로 업데이트됩니다.</p>
              </div>
            </div>
          )}

          {/* ============ APPLYING ============ */}
          {step === 'applying' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <svg className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm font-medium text-slate-600">처리 중...</p>
            </div>
          )}

          {/* ============ PREVIEW ============ */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-700">아래 내용으로 처리됩니다. 확인 후 적용하세요.</p>
              </div>

              {tab === 'initialize' && noFailConfirmed && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4 text-center">
                  <p className="text-sm font-bold text-emerald-700">보유 교환 픽스처 없음</p>
                  <p className="text-xs text-emerald-600 mt-1">등록 없이 초기 설정을 완료합니다.</p>
                </div>
              )}

              {tab === 'initialize' && !noFailConfirmed && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">등록 예정</p>
                  {validInitItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-bold text-slate-700">{item.manufacturer}</span>
                      <span className="text-xs font-bold text-indigo-600">{item.count}건 등록</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5 mt-2">
                    <span className="text-xs font-bold text-indigo-700">총 등록 건수</span>
                    <span className="text-sm font-bold text-indigo-700">
                      {validInitItems.reduce((s, i) => s + i.count, 0)}건
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">기준일: {initDate}</p>
                </div>
              )}

              {tab === 'reconcile' && (
                <div className="space-y-2">
                  {changedReconcileRows.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4 text-center">
                      <p className="text-sm font-bold text-emerald-700">시스템 기록과 실제 재고 일치</p>
                      <p className="text-xs text-emerald-600 mt-1">변경 없이 확인 완료 처리됩니다.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">변경 예정</p>
                      {changedReconcileRows.map(row => (
                        <div key={row.manufacturer} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                          <span className="text-xs font-bold text-slate-700">{row.manufacturer}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">{row.currentCount}건</span>
                            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-bold text-slate-700">{row.actualCount}건</span>
                            {row.diff > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                -{row.diff} 교환완료
                              </span>
                            )}
                            {row.diff < 0 && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                                +{Math.abs(row.diff)} 신규 등록
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ FORM: 초기화 탭 ============ */}
          {step === 'form' && tab === 'initialize' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed">
                수기 장부로 관리하던 교환 픽스처를 시스템에 등록합니다.<br />
                브랜드별 현재 보유 수량을 입력하면 미처리 교환 재고로 등록됩니다.
              </div>

              {/* 보유 없음 선택 */}
              <button
                type="button"
                onClick={() => setNoFailConfirmed(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  noFailConfirmed
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  noFailConfirmed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}>
                  {noFailConfirmed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-xs font-bold ${noFailConfirmed ? 'text-emerald-700' : 'text-slate-600'}`}>
                    보유 중인 교환 픽스처 없음
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    현재 교환 대기 중인 교환 픽스처가 없는 경우 선택하세요
                  </p>
                </div>
              </button>

              {/* 수량 입력 섹션 (보유 없음 선택 시 숨김) */}
              {!noFailConfirmed && (
                <>
                  {/* 기준일 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      기준일
                    </label>
                    <input
                      type="date"
                      value={initDate}
                      onChange={e => setInitDate(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* 브랜드 행 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      브랜드별 수량
                    </label>
                    <div className="space-y-2">
                      {initRows.map(row => (
                        <div key={row.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <select
                              value={row.manufacturer}
                              onChange={e => updateInitRow(row.id, 'manufacturer', e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            >
                              <option value="">제조사 선택...</option>
                              {availableManufacturers.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            placeholder="수량"
                            value={row.count}
                            onChange={e => updateInitRow(row.id, 'count', e.target.value)}
                            className="w-20 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                          />
                          <button
                            onClick={() => removeInitRow(row.id)}
                            disabled={initRows.length === 1}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addInitRow}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      브랜드 추가
                    </button>
                  </div>

                  {validInitItems.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-indigo-700 font-medium">총 등록 예정</span>
                      <span className="text-sm font-bold text-indigo-700">
                        {validInitItems.reduce((s, i) => s + i.count, 0)}건
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ============ FORM: 재고 정리 탭 ============ */}
          {step === 'form' && tab === 'reconcile' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed">
                시스템 기록과 실제 보유 재고를 맞춥니다.<br />
                실제 보유 수량을 입력하면, 차이만큼 자동으로 처리됩니다.
              </div>

              {!hasSystemFailRecords ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  미처리 교환 데이터가 없습니다.<br />
                  <span className="text-xs mt-1 block">"초기화 등록" 탭을 사용하세요.</span>
                </div>
              ) : (
                <>
                  {/* 기준일 (신규 추가 케이스용) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      신규 등록 기준일 <span className="font-normal text-slate-400">(실제 &gt; 시스템인 경우)</span>
                    </label>
                    <input
                      type="date"
                      value={reconcileDate}
                      onChange={e => setReconcileDate(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* 제조사별 입력 */}
                  <div>
                    <div className="grid grid-cols-3 gap-2 px-1 mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">제조사</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">시스템 기록</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">실제 보유</span>
                    </div>
                    <div className="space-y-2">
                      {reconcileRows.map(row => {
                        const diffLabel = row.diff > 0
                          ? `${row.diff}건 교환완료 처리`
                          : row.diff < 0
                            ? `${Math.abs(row.diff)}건 신규 등록`
                            : '변경 없음';
                        const diffColor = row.diff > 0
                          ? 'text-rose-600'
                          : row.diff < 0
                            ? 'text-indigo-600'
                            : 'text-slate-300';
                        return (
                          <div key={row.manufacturer} className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 items-center">
                              <span className="text-xs font-bold text-slate-700 truncate">{row.manufacturer}</span>
                              <div className="flex justify-center">
                                <span className="text-sm font-bold text-slate-600 tabular-nums">{row.currentCount}건</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={9999}
                                value={reconcileInputs[row.manufacturer] ?? String(row.currentCount)}
                                onChange={e =>
                                  setReconcileInputs(prev => ({ ...prev, [row.manufacturer]: e.target.value }))
                                }
                                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                              />
                            </div>
                            <p className={`text-[10px] font-medium px-1 ${diffColor}`}>
                              → {diffLabel}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          {step === 'form' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handlePreview}
                disabled={
                  (tab === 'initialize' && !noFailConfirmed && validInitItems.length === 0) ||
                  (tab === 'reconcile' && !hasSystemFailRecords)
                }
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {tab === 'initialize' && noFailConfirmed
                  ? '없음으로 확인 →'
                  : tab === 'reconcile' && allReconcileMatch
                    ? '현재 재고 확인 →'
                    : '미리보기 →'
                }
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ← 수정
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                확인 및 적용
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FailBulkSetupModal;
