import React, { useState, useEffect, useMemo } from 'react';
import ModalShell from '../shared/ModalShell';
import PricingHistoryPanel from './PricingHistoryPanel';
import { pricingService } from '../../services/pricingService';
import { inventoryService } from '../../services/inventoryService';
import type { ItemPricing, CostRatioItem, ItemPricingHistory } from '../../types/pricing';

interface PricingManagementModalProps {
  hospitalId: string;
  onClose: () => void;
}

function computeCostRatio(p: ItemPricing): number {
  if (p.treatmentFee <= 0) return 0;
  return p.purchasePrice / p.treatmentFee;
}

function formatPrice(v: number): string {
  if (v === 0) return '—';
  return v.toLocaleString('ko-KR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

interface EditRow {
  id: string;
  manufacturer: string;
  brand: string;
  size: string;
  purchasePrice: string;
  treatmentFee: string;
}

const PricingManagementModal: React.FC<PricingManagementModalProps> = ({ hospitalId, onClose }) => {
  const [pricingList, setPricingList] = useState<ItemPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editRow, setEditRow] = useState<EditRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 미등록 품목 추가 상태
  const [unregisteredItems, setUnregisteredItems] = useState<Array<{ manufacturer: string; brand: string; size: string }>>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addingNew, setAddingNew] = useState<EditRow | null>(null);

  // 이력 패널
  const [historyTarget, setHistoryTarget] = useState<ItemPricing | null>(null);
  const [history, setHistory] = useState<ItemPricingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    pricingService.getPricingList(hospitalId).then(list => {
      setPricingList(list);
    }).finally(() => setIsLoading(false));
  }, [hospitalId]);

  // 인벤토리에서 단가 미등록 품목 로드
  useEffect(() => {
    if (!showAddPanel) return;
    Promise.all([
      pricingService.getPricingList(hospitalId),
      inventoryService.getInventory(),
    ]).then(([list, invItems]) => {
      const registered = new Set(list.map(p => `${p.manufacturer}|${p.brand}|${p.size}`));
      const seen = new Set<string>();
      const unique = invItems
        .filter(item => {
          if (!item.manufacturer || !item.brand || !item.size) return false;
          const k = `${item.manufacturer}|${item.brand}|${item.size}`;
          if (registered.has(k) || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map(item => ({ manufacturer: item.manufacturer!, brand: item.brand!, size: item.size! }));
      setUnregisteredItems(unique);
    });
  }, [hospitalId, showAddPanel]);

  const manufacturers = useMemo(() => {
    const set = new Set(pricingList.map(p => p.manufacturer));
    return [...set].sort();
  }, [pricingList]);

  const filteredList: CostRatioItem[] = useMemo(() => {
    return pricingList
      .filter(p => {
        if (manufacturerFilter && p.manufacturer !== manufacturerFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return p.brand.toLowerCase().includes(s) || p.size.toLowerCase().includes(s) || p.manufacturer.toLowerCase().includes(s);
        }
        return true;
      })
      .map(p => ({ ...p, costRatio: computeCostRatio(p) }));
  }, [pricingList, manufacturerFilter, search]);

  // 요약 통계
  const summary = useMemo(() => {
    const withFee = pricingList.filter(p => p.treatmentFee > 0);
    const avgRatio = withFee.length > 0 ? withFee.reduce((sum, p) => sum + computeCostRatio(p), 0) / withFee.length : 0;
    const highCostCount = withFee.filter(p => computeCostRatio(p) > 0.5).length;
    return { total: pricingList.length, avgRatio, highCostCount };
  }, [pricingList]);

  const startEdit = (p: ItemPricing) => {
    setEditRow({
      id: p.id,
      manufacturer: p.manufacturer,
      brand: p.brand,
      size: p.size,
      purchasePrice: p.purchasePrice > 0 ? String(p.purchasePrice) : '',
      treatmentFee: p.treatmentFee > 0 ? String(p.treatmentFee) : '',
    });
  };

  const handleSave = async () => {
    if (!editRow) return;
    setIsSaving(true);
    const result = await pricingService.upsertPricing(hospitalId, {
      manufacturer: editRow.manufacturer,
      brand: editRow.brand,
      size: editRow.size,
      purchasePrice: parseInt(editRow.purchasePrice || '0', 10) || 0,
      treatmentFee: parseInt(editRow.treatmentFee || '0', 10) || 0,
    });
    if (result) {
      setPricingList(prev => {
        const idx = prev.findIndex(p => p.id === result.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result;
          return next;
        }
        return [...prev, result];
      });
      setEditRow(null);
    }
    setIsSaving(false);
  };

  const handleSaveNew = async () => {
    if (!addingNew) return;
    setIsSaving(true);
    const result = await pricingService.upsertPricing(hospitalId, {
      manufacturer: addingNew.manufacturer,
      brand: addingNew.brand,
      size: addingNew.size,
      purchasePrice: parseInt(addingNew.purchasePrice || '0', 10) || 0,
      treatmentFee: parseInt(addingNew.treatmentFee || '0', 10) || 0,
    });
    if (result) {
      setPricingList(prev => [...prev, result]);
      setAddingNew(null);
      setShowAddPanel(false);
    }
    setIsSaving(false);
  };

  const handleDelete = async (p: ItemPricing) => {
    setDeletingId(p.id);
    const ok = await pricingService.deletePricing(p.id);
    if (ok) {
      setPricingList(prev => prev.filter(item => item.id !== p.id));
    }
    setDeletingId(null);
  };

  const openHistory = async (p: ItemPricing) => {
    setHistoryTarget(p);
    setHistoryLoading(true);
    const h = await pricingService.getPricingHistory(hospitalId, p.manufacturer, p.brand, p.size);
    setHistory(h);
    setHistoryLoading(false);
  };

  const costRatioBadge = (ratio: number) => {
    if (ratio === 0) return <span className="text-[10px] text-slate-300">—</span>;
    const pct = Math.round(ratio * 100);
    const cls = ratio < 0.3 ? 'bg-emerald-100 text-emerald-700' : ratio <= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
    return <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cls}`}>{pct}%</span>;
  };

  return (
    <>
      <ModalShell
        isOpen={true}
        onClose={onClose}
        title="단가 관리"
        titleId="pricing-management-title"
        maxWidth="max-w-4xl"
        className="flex flex-col max-h-[90vh]"
        backdropClassName="flex items-center justify-center p-4 backdrop-blur-sm"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="pricing-management-title" className="text-base font-bold text-slate-900">단가 관리</h3>
            <p className="text-xs text-slate-500">품목별 매입단가·진료수가 등록 및 원가율 분석</p>
          </div>
          <button
            onClick={onClose}
            aria-label="단가 관리 모달 닫기"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 요약 통계 */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-indigo-50 px-4 py-3">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">등록 품목</p>
              <p className="text-xl font-black text-indigo-700 mt-0.5">{summary.total}<span className="text-xs font-semibold ml-0.5">개</span></p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">평균 원가율</p>
              <p className="text-xl font-black text-slate-700 mt-0.5">
                {summary.avgRatio > 0 ? `${Math.round(summary.avgRatio * 100)}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">고원가율 품목</p>
              <p className="text-xl font-black text-rose-700 mt-0.5">{summary.highCostCount}<span className="text-xs font-semibold ml-0.5">개</span></p>
            </div>
          </div>
        </div>

        {/* 필터 + 버튼 */}
        <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100">
          <select
            value={manufacturerFilter}
            onChange={e => setManufacturerFilter(e.target.value)}
            className="h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
          >
            <option value="">전체 제조사</option>
            {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            placeholder="브랜드·규격 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={() => { setShowAddPanel(true); setAddingNew(null); }}
            className="h-8 px-3 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            품목 추가
          </button>
        </div>

        {/* 미등록 품목 추가 패널 */}
        {showAddPanel && (
          <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-indigo-700">단가 미등록 품목에서 선택하거나 직접 입력하세요</p>
              <button onClick={() => { setShowAddPanel(false); setAddingNew(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 직접 입력 폼 */}
            {addingNew ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">제조사</label>
                    <input value={addingNew.manufacturer} onChange={e => setAddingNew(prev => prev ? { ...prev, manufacturer: e.target.value } : null)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">브랜드</label>
                    <input value={addingNew.brand} onChange={e => setAddingNew(prev => prev ? { ...prev, brand: e.target.value } : null)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">규격</label>
                    <input value={addingNew.size} onChange={e => setAddingNew(prev => prev ? { ...prev, size: e.target.value } : null)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">매입단가 (원)</label>
                    <input type="number" min="0" value={addingNew.purchasePrice}
                      onChange={e => setAddingNew(prev => prev ? { ...prev, purchasePrice: e.target.value } : null)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">진료수가 (원)</label>
                    <input type="number" min="0" value={addingNew.treatmentFee}
                      onChange={e => setAddingNew(prev => prev ? { ...prev, treatmentFee: e.target.value } : null)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAddingNew(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
                  <button onClick={handleSaveNew} disabled={isSaving || !addingNew.manufacturer || !addingNew.brand || !addingNew.size}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                <button
                  onClick={() => setAddingNew({ id: '', manufacturer: '', brand: '', size: '', purchasePrice: '', treatmentFee: '' })}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white border border-dashed border-indigo-300 text-xs text-indigo-600 font-bold hover:bg-indigo-50 transition-colors"
                >
                  + 직접 입력
                </button>
                {unregisteredItems.slice(0, 20).map((item, i) => (
                  <button key={i} onClick={() => setAddingNew({ id: '', manufacturer: item.manufacturer, brand: item.brand, size: item.size, purchasePrice: '', treatmentFee: '' })}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white border border-slate-100 text-xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{item.manufacturer}</span>
                    <span className="text-slate-500">{item.brand}</span>
                    <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.size}</span>
                  </button>
                ))}
                {unregisteredItems.length === 0 && (
                  <p className="text-xs text-slate-400 px-3 py-2">모든 품목에 단가가 등록되어 있습니다.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              등록된 단가 정보가 없습니다.<br />
              <span className="text-xs">위 '품목 추가' 버튼으로 등록하세요.</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500">제조사</th>
                  <th className="text-left px-2 py-2.5 font-bold text-slate-500">브랜드</th>
                  <th className="text-left px-2 py-2.5 font-bold text-slate-500">규격</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500">매입단가</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500">진료수가</th>
                  <th className="text-center px-2 py-2.5 font-bold text-slate-500">원가율</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500">수정일</th>
                  <th className="text-center px-4 py-2.5 font-bold text-slate-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredList.map(p => {
                  const isEditing = editRow?.id === p.id;
                  return (
                    <tr key={p.id} className={`group hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/40' : ''}`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{p.manufacturer}</td>
                      <td className="px-2 py-2.5 font-bold text-slate-800">{p.brand}</td>
                      <td className="px-2 py-2.5 text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p.size}</span>
                      </td>

                      {isEditing ? (
                        <>
                          <td className="px-2 py-2">
                            <input
                              type="number" min="0"
                              value={editRow.purchasePrice}
                              onChange={e => setEditRow(prev => prev ? { ...prev, purchasePrice: e.target.value } : null)}
                              placeholder="0"
                              className="w-24 px-2 py-1 text-right border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number" min="0"
                              value={editRow.treatmentFee}
                              onChange={e => setEditRow(prev => prev ? { ...prev, treatmentFee: e.target.value } : null)}
                              placeholder="0"
                              className="w-24 px-2 py-1 text-right border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">—</td>
                          <td className="px-2 py-2.5 text-right text-slate-400 text-[10px]">수정 중</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5 justify-center">
                              <button onClick={handleSave} disabled={isSaving}
                                className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                {isSaving ? '...' : '저장'}
                              </button>
                              <button onClick={() => setEditRow(null)}
                                className="px-3 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                취소
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2.5 text-right font-mono text-slate-700">{formatPrice(p.purchasePrice)}</td>
                          <td className="px-2 py-2.5 text-right font-mono text-slate-700">{formatPrice(p.treatmentFee)}</td>
                          <td className="px-2 py-2.5 text-center">{costRatioBadge(p.costRatio)}</td>
                          <td className="px-2 py-2.5 text-right text-slate-400 text-[10px]">{formatDate(p.updatedAt)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(p)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                                수정
                              </button>
                              <button onClick={() => openHistory(p)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="이력">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(p)} disabled={deletingId === p.id}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40" title="삭제">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 원가율 범례 */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-4 flex-shrink-0 bg-slate-50/50">
          <span className="text-[10px] font-bold text-slate-400">원가율</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> &lt;30%</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 30~50%</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> &gt;50%</span>
        </div>
      </ModalShell>

      {/* 이력 패널 */}
      {historyTarget && (
        <PricingHistoryPanel
          manufacturer={historyTarget.manufacturer}
          brand={historyTarget.brand}
          size={historyTarget.size}
          history={history}
          isLoading={historyLoading}
          onClose={() => { setHistoryTarget(null); setHistory([]); }}
        />
      )}
    </>
  );
};

export default PricingManagementModal;
