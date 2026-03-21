import React, { useState, useEffect, useMemo } from 'react';
import ModalShell from '../shared/ModalShell';
import { pricingService } from '../../services/pricingService';
import { inventoryService } from '../../services/inventoryService';
import { isVirtualManufacturer } from '../../services/appUtils';
import type { ItemPricing, ItemPricingHistory } from '../../types/pricing';

interface PricingManagementModalProps {
  hospitalId: string;
  onClose: () => void;
}

/** 인벤토리에서 뽑은 제조사+브랜드 행 */
interface BrandRow {
  manufacturer: string;
  brand: string;
  pricing: ItemPricing | null;
  /** 편집 중인 매입단가 */
  editPurchase: string;
  /** 편집 중인 진료수가 */
  editTreatmentFee: string;
  /** 저장 중 */
  saving: boolean;
  /** 저장 완료 플래시 */
  saved: boolean;
}

function computeCostRatio(purchasePrice: number, treatmentFee: number): number {
  if (treatmentFee <= 0) return 0;
  return purchasePrice / treatmentFee;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const PricingManagementModal: React.FC<PricingManagementModalProps> = ({ hospitalId, onClose }) => {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [search, setSearch] = useState('');

  // 이력 패널
  const [historyTarget, setHistoryTarget] = useState<{ manufacturer: string; brand: string } | null>(null);
  const [history, setHistory] = useState<ItemPricingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 인벤토리 + 기존 단가 병합 로딩
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      inventoryService.getInventory(),
      pricingService.getPricingList(hospitalId),
    ]).then(([invItems, pricingList]) => {
      // 제조사+브랜드 유니크 추출 (가상 제조사 제외)
      const seen = new Set<string>();
      const brandKeys: Array<{ manufacturer: string; brand: string }> = [];
      for (const item of invItems) {
        if (!item.manufacturer || !item.brand) continue;
        if (isVirtualManufacturer(item.manufacturer) || item.manufacturer === '보험임플란트') continue;
        const k = `${item.manufacturer}|${item.brand}`;
        if (seen.has(k)) continue;
        seen.add(k);
        brandKeys.push({ manufacturer: item.manufacturer, brand: item.brand });
      }
      // 정렬: 제조사 → 브랜드
      brandKeys.sort((a, b) =>
        a.manufacturer.localeCompare(b.manufacturer, 'ko') || a.brand.localeCompare(b.brand, 'ko')
      );

      // 단가 Map 빌드
      const pricingMap = new Map<string, ItemPricing>();
      for (const p of pricingList) {
        pricingMap.set(`${p.manufacturer}|${p.brand}`, p);
      }

      // BrandRow 생성
      const built: BrandRow[] = brandKeys.map(({ manufacturer, brand }) => {
        const pricing = pricingMap.get(`${manufacturer}|${brand}`) ?? null;
        return {
          manufacturer,
          brand,
          pricing,
          editPurchase: pricing ? String(pricing.purchasePrice) : '',
          editTreatmentFee: pricing ? String(pricing.treatmentFee) : '',
          saving: false,
          saved: false,
        };
      });

      // 단가 등록은 됐는데 인벤토리에 없는 경우 (삭제된 품목)도 하단에 추가
      for (const p of pricingList) {
        const k = `${p.manufacturer}|${p.brand}`;
        if (!seen.has(k)) {
          built.push({
            manufacturer: p.manufacturer,
            brand: p.brand,
            pricing: p,
            editPurchase: String(p.purchasePrice),
            editTreatmentFee: String(p.treatmentFee),
            saving: false,
            saved: false,
          });
        }
      }

      setRows(built);
    }).finally(() => setIsLoading(false));
  }, [hospitalId]);

  const manufacturers = useMemo(() => {
    const set = new Set(rows.map(r => r.manufacturer));
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (manufacturerFilter && r.manufacturer !== manufacturerFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.brand.toLowerCase().includes(s) || r.manufacturer.toLowerCase().includes(s);
      }
      return true;
    });
  }, [rows, manufacturerFilter, search]);

  // 요약 통계
  const summary = useMemo(() => {
    const registered = rows.filter(r => r.pricing !== null);
    const withFee = registered.filter(r => (r.pricing?.treatmentFee ?? 0) > 0);
    const avgRatio = withFee.length > 0
      ? withFee.reduce((sum, r) => sum + computeCostRatio(r.pricing!.purchasePrice, r.pricing!.treatmentFee), 0) / withFee.length
      : 0;
    const highCostCount = withFee.filter(r => computeCostRatio(r.pricing!.purchasePrice, r.pricing!.treatmentFee) > 0.5).length;
    return { total: rows.length, registered: registered.length, avgRatio, highCostCount };
  }, [rows]);

  const updateRowField = (manufacturer: string, brand: string, field: 'editPurchase' | 'editTreatmentFee', value: string) => {
    setRows(prev => prev.map(r =>
      r.manufacturer === manufacturer && r.brand === brand ? { ...r, [field]: value } : r
    ));
  };

  const handleSaveRow = async (row: BrandRow) => {
    const purchasePrice = parseInt(row.editPurchase || '0', 10) || 0;
    const treatmentFee = parseInt(row.editTreatmentFee || '0', 10) || 0;

    // 변경 없으면 스킵
    if (row.pricing && row.pricing.purchasePrice === purchasePrice && row.pricing.treatmentFee === treatmentFee) return;

    setRows(prev => prev.map(r =>
      r.manufacturer === row.manufacturer && r.brand === row.brand ? { ...r, saving: true } : r
    ));

    const result = await pricingService.upsertPricing(hospitalId, {
      manufacturer: row.manufacturer,
      brand: row.brand,
      purchasePrice,
      treatmentFee,
    });

    setRows(prev => prev.map(r => {
      if (r.manufacturer !== row.manufacturer || r.brand !== row.brand) return r;
      return {
        ...r,
        pricing: result ?? r.pricing,
        saving: false,
        saved: true,
      };
    }));

    // 저장 완료 플래시 2초
    setTimeout(() => {
      setRows(prev => prev.map(r =>
        r.manufacturer === row.manufacturer && r.brand === row.brand ? { ...r, saved: false } : r
      ));
    }, 2000);
  };

  const openHistory = async (manufacturer: string, brand: string) => {
    setHistoryTarget({ manufacturer, brand });
    setHistoryLoading(true);
    const h = await pricingService.getPricingHistory(hospitalId, manufacturer, brand);
    setHistory(h);
    setHistoryLoading(false);
  };

  const costRatioBadge = (purchasePrice: number, treatmentFee: number) => {
    if (treatmentFee <= 0) return <span className="text-[10px] text-slate-300">—</span>;
    const ratio = computeCostRatio(purchasePrice, treatmentFee);
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
        maxWidth="max-w-3xl"
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
            <p className="text-xs text-slate-500">브랜드별 매입단가·진료수가 등록 및 원가율 분석</p>
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
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">등록 완료</p>
              <p className="text-xl font-black text-indigo-700 mt-0.5">
                {summary.registered}<span className="text-xs font-semibold text-indigo-400 ml-0.5">/ {summary.total}</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">평균 원가율</p>
              <p className="text-xl font-black text-slate-700 mt-0.5">
                {summary.avgRatio > 0 ? `${Math.round(summary.avgRatio * 100)}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">고원가율(&gt;50%)</p>
              <p className="text-xl font-black text-rose-700 mt-0.5">{summary.highCostCount}<span className="text-xs font-semibold ml-0.5">개</span></p>
            </div>
          </div>
        </div>

        {/* 필터 */}
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
            placeholder="브랜드 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span className="text-xs text-slate-400 flex-shrink-0">{filteredRows.length}개</span>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {rows.length === 0 ? '재고 품목이 없습니다.' : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 w-28">제조사</th>
                  <th className="text-left px-2 py-2.5 font-bold text-slate-500">브랜드</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500 w-32">매입단가 (원)</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500 w-32">진료수가 (원)</th>
                  <th className="text-center px-2 py-2.5 font-bold text-slate-500 w-16">원가율</th>
                  <th className="text-right px-2 py-2.5 font-bold text-slate-500 w-20">수정일</th>
                  <th className="text-center px-4 py-2.5 font-bold text-slate-500 w-20">저장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map(row => {
                  const pp = parseInt(row.editPurchase || '0', 10) || 0;
                  const tf = parseInt(row.editTreatmentFee || '0', 10) || 0;
                  const hasData = row.pricing !== null;
                  const isChanged = hasData
                    ? pp !== row.pricing!.purchasePrice || tf !== row.pricing!.treatmentFee
                    : (pp > 0 || tf > 0);

                  const rowKey = `${row.manufacturer}|${row.brand}`;
                  const isHistoryOpen = historyTarget?.manufacturer === row.manufacturer && historyTarget?.brand === row.brand;

                  return (
                    <React.Fragment key={rowKey}>
                    <tr className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600 font-medium truncate max-w-[7rem]">{row.manufacturer}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{row.brand}</span>
                          {!hasData && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">미등록</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text" inputMode="numeric"
                          value={row.editPurchase ? Number(row.editPurchase).toLocaleString('ko-KR') : ''}
                          onChange={e => updateRowField(row.manufacturer, row.brand, 'editPurchase', e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-right text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text" inputMode="numeric"
                          value={row.editTreatmentFee ? Number(row.editTreatmentFee).toLocaleString('ko-KR') : ''}
                          onChange={e => updateRowField(row.manufacturer, row.brand, 'editTreatmentFee', e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-right text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {costRatioBadge(pp, tf)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[10px] text-slate-400">
                        {row.pricing ? formatDate(row.pricing.updatedAt) : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          {row.saved ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              저장됨
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveRow(row)}
                              disabled={row.saving || !isChanged}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                                isChanged
                                  ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                                  : 'text-slate-300 bg-slate-100 cursor-not-allowed'
                              } disabled:opacity-50`}
                            >
                              {row.saving ? '...' : '저장'}
                            </button>
                          )}
                          {hasData && (
                            <button
                              onClick={() => openHistory(row.manufacturer, row.brand)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="이력"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* 인라인 이력 행 */}
                    {isHistoryOpen && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-3 pt-0 bg-slate-50/80">
                          <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                              <span className="text-[11px] font-bold text-indigo-700">
                                {row.manufacturer} · {row.brand} 변경 이력
                              </span>
                              <button
                                onClick={() => { setHistoryTarget(null); setHistory([]); }}
                                className="text-indigo-400 hover:text-indigo-600 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {historyLoading ? (
                              <div className="px-3 py-4 text-center text-[11px] text-slate-400">불러오는 중...</div>
                            ) : history.length === 0 ? (
                              <div className="px-3 py-4 text-center text-[11px] text-slate-400">변경 이력이 없습니다.</div>
                            ) : (
                              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                                {history.map(h => {
                                  const fieldLabel: Record<string, string> = {
                                    purchase_price: '매입단가', treatment_fee: '진료수가', both: '매입+수가', initial: '최초등록',
                                  };
                                  const sourceLabel: Record<string, string> = { settings: '설정', receipt_confirmation: '도착확인' };
                                  const fmt = (v: number | null) => v == null ? '—' : v.toLocaleString('ko-KR') + '원';
                                  const dt = new Date(h.changedAt);
                                  const dateStr = `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
                                  return (
                                    <div key={h.id} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                                      <span className={`shrink-0 px-1.5 py-0.5 rounded-full font-black text-[10px] ${h.fieldChanged === 'initial' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {fieldLabel[h.fieldChanged] ?? h.fieldChanged}
                                      </span>
                                      <span className="shrink-0 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {sourceLabel[h.changeSource] ?? h.changeSource}
                                      </span>
                                      {h.fieldChanged !== 'initial' && h.oldPurchasePrice !== h.newPurchasePrice && (
                                        <span className="text-slate-500">매입 <span className="line-through">{fmt(h.oldPurchasePrice)}</span> → <span className="font-bold text-indigo-700">{fmt(h.newPurchasePrice)}</span></span>
                                      )}
                                      {h.fieldChanged !== 'initial' && h.oldTreatmentFee !== h.newTreatmentFee && (
                                        <span className="text-slate-500">수가 <span className="line-through">{fmt(h.oldTreatmentFee)}</span> → <span className="font-bold text-indigo-700">{fmt(h.newTreatmentFee)}</span></span>
                                      )}
                                      {h.fieldChanged === 'initial' && (
                                        <span className="text-slate-500">매입 <span className="font-bold text-indigo-700">{fmt(h.newPurchasePrice)}</span> · 수가 <span className="font-bold text-indigo-700">{fmt(h.newTreatmentFee)}</span></span>
                                      )}
                                      <span className="ml-auto shrink-0 text-[10px] text-slate-400 tabular-nums">{dateStr}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 범례 */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-4 flex-shrink-0 bg-slate-50/50">
          <span className="text-[10px] font-bold text-slate-400">원가율</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> &lt;30%</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 30~50%</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> &gt;50%</span>
          <span className="ml-auto text-[10px] text-slate-400">입력 후 저장 버튼을 눌러주세요</span>
        </div>
      </ModalShell>
    </>
  );
};

export default PricingManagementModal;
