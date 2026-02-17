
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, ExcelData, PlanType, PLAN_LIMITS } from '../types';
import { planService } from '../services/planService';
interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateStock: (id: string, initialStock: number) => void;
  onDeleteInventoryItem: (id: string) => void;
  onAddInventoryItem: (newItem: InventoryItem) => void;
  onUpdateInventoryItem: (updatedItem: InventoryItem) => void;
  surgeryData?: ExcelData | null;
  onQuickOrder?: (item: InventoryItem) => void;
  isReadOnly?: boolean;
  userId?: string;
  hospitalId?: string;
  plan?: PlanType;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onUpdateStock,
  onDeleteInventoryItem,
  onAddInventoryItem,
  onUpdateInventoryItem,
  surgeryData,
  onQuickOrder,
  isReadOnly,
  userId,
  hospitalId,
  plan = 'free'
}) => {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});
  const [showEditNotice, setShowEditNotice] = useState(false);
  const [showConsistencyModal, setShowConsistencyModal] = useState(false);

  const maxEdits = PLAN_LIMITS[plan].maxBaseStockEdits;
  const isUnlimited = maxEdits === Infinity;
  const [editCount, setEditCount] = useState(0);
  const editCountLoadedRef = useRef(false);
  const isEditExhausted = !isUnlimited && editCount >= maxEdits;

  // 서버에서 기초재고 수정 횟수 로드 (hospitalId 있을 때만)
  useEffect(() => {
    if (!hospitalId || isUnlimited) return;
    editCountLoadedRef.current = false;
    planService.getBaseStockEditCount(hospitalId).then(count => {
      setEditCount(count);
      editCountLoadedRef.current = true;
    });
  }, [hospitalId, isUnlimited]);

  /** 수술중FAIL_ / 보험청구 항목 제외한 실제 표시 대상 */
  const visibleInventory = useMemo(() => {
    return inventory.filter(item =>
      !item.manufacturer.startsWith('수술중FAIL_') && item.manufacturer !== '보험청구' && item.brand !== '보험임플란트'
    );
  }, [inventory]);

  const manufacturersList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  const filteredInventory = useMemo(() => {
    return visibleInventory
      .filter(item => selectedManufacturer === null || item.manufacturer === selectedManufacturer)
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, selectedManufacturer]);

  // 사용량 차트 데이터 (TOP 12)
  const chartData = useMemo(() => {
    return [...filteredInventory]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 12)
      .filter(item => item.usageCount > 0);
  }, [filteredInventory]);

  const maxUsage = useMemo(() => {
    return Math.max(...chartData.map(d => d.usageCount), 1);
  }, [chartData]);

  // 긴급도 계산: 현재재고 ÷ 일최대사용 → 소진 예상일
  const urgencyData = useMemo(() => {
    const items = filteredInventory
      .filter(i => i.usageCount > 0 && (i.dailyMaxUsage ?? 0) > 0)
      .map(i => {
        const daily = i.dailyMaxUsage ?? 0;
        const daysLeft = daily > 0 ? Math.floor(i.currentStock / daily) : Infinity;
        const level: 'critical' | 'warning' | 'ok' =
          daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'ok';
        return { ...i, daysLeft, level };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const critical = items.filter(i => i.level === 'critical');
    const warning  = items.filter(i => i.level === 'warning');
    const mostUrgent = items[0] ?? null;
    return { critical, warning, mostUrgent };
  }, [filteredInventory]);

  // KPI 집계
  const kpiData = useMemo(() => {
    const totalUsage = filteredInventory.reduce((s, i) => s + i.usageCount, 0);
    const totalStock = filteredInventory.reduce((s, i) => s + i.currentStock, 0);
    const shortageCount = filteredInventory.filter(i => i.currentStock < Math.ceil(i.recommendedStock * monthFactor)).length;
    const avgMonthlyUsage = filteredInventory.length > 0
      ? filteredInventory.reduce((s, i) => s + (i.monthlyAvgUsage ?? 0), 0) / filteredInventory.length
      : 0;
    return { totalUsage, totalStock, shortageCount, avgMonthlyUsage };
  }, [filteredInventory, monthFactor]);

  // 식립 / 수술중 FAIL 건수 분리
  const surgeryBreakdown = useMemo(() => {
    if (!surgeryData) return { placement: 0, fail: 0 };
    const sheet = surgeryData.sheets[surgeryData.activeSheetName];
    if (!sheet) return { placement: 0, fail: 0 };
    let placement = 0;
    let fail = 0;
    sheet.rows.forEach(row => {
      if (Object.values(row).some(val => String(val).includes('합계'))) return;
      if (String(row['수술기록'] || '').includes('[GBR Only]')) return;
      const cls = String(row['구분'] || '');
      const mfr = String(row['제조사'] || '');
      if (selectedManufacturer !== null && mfr !== selectedManufacturer) return;
      const qty = Number(row['갯수']) || 1;
      if (cls === '식립') placement += qty;
      else if (cls === '수술중 FAIL') fail += qty;
    });
    return { placement, fail };
  }, [surgeryData, selectedManufacturer]);

  // 품목 일관성 분석: 브랜드별 규격 패턴 일치 여부
  const consistencyData = useMemo(() => {
    function detectPattern(size: string): string {
      const s = size.trim();
      if (!s) return 'empty';
      if (/^C\d+\s*[Φφ]/i.test(s)) return 'cuff-phi';
      if (/[Φφ]\s*\d/.test(s)) return 'phi';
      if (/[Øø]\s*\d.*\/\s*L/i.test(s)) return 'oslash-l';
      if (/[Øø]\s*\d.*mm/i.test(s)) return 'oslash-mm';
      if (/D[:\s]*\d.*L[:\s]*\d/i.test(s)) return 'dl-cuff';
      if (/^\d{4,6}[a-zA-Z]*$/.test(s)) return 'numeric-code';
      if (/\d+\.?\d*\s*[×xX*]\s*\d/.test(s)) return 'bare-numeric';
      return 'other';
    }
    const patternLabels: Record<string, string> = {
      'phi': 'Φ x 형', 'oslash-mm': 'Ø x mm형', 'oslash-l': 'Ø / L형',
      'cuff-phi': 'Cuff+Φ형', 'dl-cuff': 'D:L: 형', 'numeric-code': '숫자코드',
      'bare-numeric': 'N x N형', 'other': '기타', 'empty': '빈 값',
    };
    const brandGroups: Record<string, { pattern: string; item: typeof filteredInventory[number] }[]> = {};
    filteredInventory.forEach(item => {
      const key = `${item.manufacturer}|${item.brand}`;
      if (!brandGroups[key]) brandGroups[key] = [];
      brandGroups[key].push({ pattern: detectPattern(item.size), item });
    });
    const inconsistentItems: { item: typeof filteredInventory[number]; expectedPattern: string; actualPattern: string; expectedLabel: string; actualLabel: string }[] = [];
    Object.entries(brandGroups).forEach(([, items]) => {
      if (items.length < 2) return;
      const patternCounts: Record<string, number> = {};
      items.forEach(({ pattern }) => { patternCounts[pattern] = (patternCounts[pattern] || 0) + 1; });
      const dominantPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0][0];
      items.forEach(({ pattern, item }) => {
        if (pattern !== dominantPattern && pattern !== 'empty') {
          inconsistentItems.push({
            item, expectedPattern: dominantPattern, actualPattern: pattern,
            expectedLabel: patternLabels[dominantPattern] || dominantPattern,
            actualLabel: patternLabels[pattern] || pattern,
          });
        }
      });
    });
    return { inconsistentCount: inconsistentItems.length, inconsistentItems, isConsistent: inconsistentItems.length === 0 };
  }, [filteredInventory]);

  const handleEditChange = (field: keyof InventoryItem, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkSave = () => {
    Object.entries(editedStocks).forEach(([id, val]) => {
      onUpdateStock(id, val);
    });
    // 낙관적 업데이트 후 서버 동기화
    setEditCount(prev => prev + 1);
    if (hospitalId && !isUnlimited) {
      planService.incrementBaseStockEditCount(hospitalId).then(serverCount => {
        setEditCount(serverCount);
      });
    }
    setEditedStocks({});
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditedStocks({});
    setIsEditMode(false);
  };


  const inputStyle = "w-full p-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold";
  const highlightedInputStyle = "w-full p-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg outline-none font-bold";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ================================================= */}
      {/* Sticky Header Block                               */}
      {/* ================================================= */}
      <div className="sticky top-[44px] z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50" style={{ boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}>
        {/* A. Header Strip */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: summary metrics */}
            <div className="flex items-center gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 품목</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Items</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{filteredInventory.length}<span className="text-xs font-semibold text-slate-400 ml-1">items</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">활성 제조사</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Active Manufacturers</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{selectedManufacturer === null ? manufacturersList.length : 1}<span className="text-xs font-semibold text-slate-400 ml-1">/ {manufacturersList.length}</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">기준 배수</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Stock Multiplier</p>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mt-1">
                  <button onClick={() => setMonthFactor(1)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${monthFactor === 1 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>1개월</button>
                  <button onClick={() => setMonthFactor(2)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${monthFactor === 2 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>2개월</button>
                </div>
              </div>
            </div>
            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              {!isReadOnly && !isEditMode && (
                <button
                  onClick={() => !isEditExhausted && setShowEditNotice(true)}
                  disabled={isEditExhausted}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${isEditExhausted ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  기초재고 편집{isUnlimited ? '' : isEditExhausted ? '' : ` (${maxEdits - editCount}회)`}
                </button>
              )}
              {isEditMode && (
                <>
                  <button onClick={handleCancelEdit} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">취소</button>
                  <button
                    onClick={handleBulkSave}
                    disabled={Object.keys(editedStocks).length === 0}
                    className={`px-4 py-2 text-xs font-black rounded-lg shadow-md transition-all flex items-center gap-1.5 ${Object.keys(editedStocks).length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    일괄저장{Object.keys(editedStocks).length > 0 && ` (${Object.keys(editedStocks).length})`}
                  </button>
                </>
              )}
              <button onClick={() => { if (!isReadOnly) { setEditFormData({ initialStock: 0 }); setIsAddingItem(true); } }} disabled={isReadOnly} className={`px-4 py-2 text-xs font-black rounded-lg shadow-md transition-all flex items-center gap-1.5 ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                품목 추가
              </button>
            </div>
          </div>
        </div>

        {/* B. KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm divide-x divide-slate-50">
          <div className="px-6 py-5 bg-indigo-50/30 border-r-2 border-r-indigo-200 hover:bg-slate-50/50 transition-colors">
            <h4 className="text-sm font-semibold text-slate-800">총 사용량</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">Total Usage</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">{kpiData.totalUsage.toLocaleString()}</p>
              <span className="text-xs font-semibold text-slate-400">개</span>
            </div>
            {(surgeryBreakdown.placement > 0 || surgeryBreakdown.fail > 0) && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-indigo-600">식립 {surgeryBreakdown.placement}</span>
                {surgeryBreakdown.fail > 0 && <span className="text-[10px] font-bold text-rose-500">FAIL {surgeryBreakdown.fail}</span>}
              </div>
            )}
          </div>
          <div className={`px-6 py-5 transition-colors relative overflow-hidden ${kpiData.totalStock < 0 ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50/50'}`}>
            {kpiData.totalStock < 0 && (
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[28px] border-l-transparent border-t-[28px] border-t-rose-400" />
            )}
            <h4 className="text-sm font-semibold text-slate-800">현재 재고</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">Current Stock</p>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-3xl font-bold tabular-nums tracking-tight ${kpiData.totalStock < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {kpiData.totalStock.toLocaleString()}
              </p>
              <span className="text-xs font-semibold text-slate-400">개</span>
            </div>
            {kpiData.totalStock < 0 && (
              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <span>⚠</span> 기초재고 입력 필요
              </p>
            )}
          </div>
          <div className="px-6 py-5 hover:bg-slate-50/50 transition-colors">
            <h4 className="text-sm font-semibold text-slate-800">부족 품목</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">Shortage Items</p>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-3xl font-bold tabular-nums tracking-tight ${kpiData.shortageCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{kpiData.shortageCount}</p>
              <span className="text-xs font-semibold text-slate-400">건</span>
            </div>
          </div>
          <div className="px-6 py-5 hover:bg-slate-50/50 transition-colors">
            <h4 className="text-sm font-semibold text-slate-800">월평균 사용</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">Monthly Avg Usage</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">{kpiData.avgMonthlyUsage.toFixed(1)}</p>
              <span className="text-xs font-semibold text-slate-400">개/월</span>
            </div>
          </div>
          {/* 품목 일관성 KPI */}
          <div className={`px-6 py-5 hover:bg-slate-50/50 transition-colors ${!consistencyData.isConsistent ? 'bg-amber-50/40' : ''}`}>
            <h4 className="text-sm font-semibold text-slate-800">품목 일관성</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">Size Consistency</p>
            <div className="flex items-baseline gap-1.5">
              {consistencyData.isConsistent ? (
                <p className="text-lg font-bold text-emerald-600 tracking-tight">양호</p>
              ) : (
                <p className="text-lg font-bold text-amber-600 tracking-tight">불량 <span className="text-2xl tabular-nums">{consistencyData.inconsistentCount}</span><span className="text-xs font-semibold text-amber-400 ml-0.5">건</span></p>
              )}
            </div>
            {!consistencyData.isConsistent && (
              <button
                onClick={() => setShowConsistencyModal(true)}
                className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
              >
                상세보기
              </button>
            )}
          </div>
        </div>

        {/* C. Manufacturer Filter Strip */}
        <div className="bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
          <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedManufacturer(null)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selectedManufacturer === null ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              전체
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selectedManufacturer === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {visibleInventory.length}
              </span>
            </button>
            {manufacturersList.map(m => {
              const count = visibleInventory.filter(i => i.manufacturer === m).length;
              const hasShortage = visibleInventory.some(i => i.manufacturer === m && i.currentStock < Math.ceil(i.recommendedStock * monthFactor));
              return (
                <button
                  key={m}
                  onClick={() => setSelectedManufacturer(m)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selectedManufacturer === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  {m}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selectedManufacturer === m ? 'bg-white/20 text-white' : hasShortage ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>{/* end sticky wrapper */}

      {/* ================================================= */}
      {/* Usage Analysis Card — redesigned                  */}
      {/* ================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">규격별 사용량 분석</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Usage Analysis by Specification</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOP {Math.min(chartData.length, 12)}</span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              {selectedManufacturer ?? '전체'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px]">
          {/* ── 좌측: 수평 바 차트 ── */}
          <div className="px-6 py-5 space-y-2.5">
            {chartData.length > 0 ? chartData.map((item, idx) => {
              const pct = Math.round((item.usageCount / maxUsage) * 100);
              const isTop = idx === 0;
              const isLow = item.currentStock < Math.ceil((item.recommendedStock ?? 0) * monthFactor);
              return (
                <div key={item.id} className="group flex items-center gap-3">
                  {/* 순위 */}
                  <span className={`w-5 text-right text-[10px] font-black shrink-0 ${isTop ? 'text-indigo-500' : 'text-slate-300'}`}>
                    {idx + 1}
                  </span>
                  {/* 라벨 */}
                  <div className="w-[110px] shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter leading-none">{item.brand}</p>
                    <p className="text-[11px] font-black text-slate-700 truncate leading-snug">{item.size}</p>
                  </div>
                  {/* 바 */}
                  <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* 수치 */}
                  <div className="w-[52px] shrink-0 text-right flex items-center justify-end gap-1">
                    <span className={`text-[11px] font-black ${isTop ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {item.usageCount}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">개</span>
                    {isLow && (
                      <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" title="재고 부족" />
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-400 font-bold italic">사용 데이터가 없습니다.</p>
              </div>
            )}
          </div>

          {/* ── 우측: 긴급도 패널 ── */}
          <div className="lg:border-l border-t lg:border-t-0 border-slate-100 px-5 py-5 flex flex-row lg:flex-col justify-between gap-4 min-w-[180px]">

            {/* 가장 긴급한 품목 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">최우선 발주</p>
              {urgencyData.mostUrgent ? (
                <div className={`rounded-xl px-3 py-2.5 ${urgencyData.mostUrgent.level === 'critical' ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <p className={`text-[10px] font-black leading-none ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {urgencyData.mostUrgent.brand}
                  </p>
                  <p className={`text-[11px] font-bold mt-0.5 ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {urgencyData.mostUrgent.size}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-xl font-black tabular-nums leading-none ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {urgencyData.mostUrgent.daysLeft <= 0 ? '0' : urgencyData.mostUrgent.daysLeft}
                    </span>
                    <span className={`text-[10px] font-bold ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                      일 후 소진
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-600">전 품목 안전</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">긴급 품목 없음</p>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-slate-50 hidden lg:block" />

            {/* 긴급도 요약 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">긴급도 현황</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">3일 이내</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${urgencyData.critical.length > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {urgencyData.critical.length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">7일 이내</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${urgencyData.warning.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                    {urgencyData.warning.length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">안전</span>
                  </div>
                  <span className="text-[12px] font-black tabular-nums text-emerald-600">
                    {filteredInventory.filter(i => i.usageCount > 0 && (i.dailyMaxUsage ?? 0) > 0 && Math.floor(i.currentStock / (i.dailyMaxUsage ?? 1)) > 7).length}건
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-50/60 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-violet-400" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">1위</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">2위 이하</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">재고 부족</span>
          </div>
          <div className="ml-auto text-[9px] text-slate-300 font-medium">수술기록 연동 기준</div>
        </div>
      </div>

      {/* ================================================= */}
      {/* Deep Analysis Divider                             */}
      {/* ================================================= */}
      <div className="flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Inventory Detail</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ================================================= */}
      {/* Table Card                                        */}
      {/* ================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">기초 재고</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">
                  <div>사용량</div>
                  <div className="text-sm font-black text-rose-500 mt-1 tabular-nums">{filteredInventory.reduce((s, i) => s + i.usageCount, 0)}</div>
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-indigo-400 text-center">월평균사용</th>
                <th className="px-6 py-3 text-[11px] font-bold text-indigo-400 text-center">일최대사용</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">
                  <div>현재 재고</div>
                  <div className="text-sm font-black text-slate-800 mt-1 tabular-nums">{filteredInventory.reduce((s, i) => s + i.currentStock, 0)}</div>
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center text-indigo-600">권장량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                const recommended = Math.ceil(item.recommendedStock * monthFactor);
                const isLowStock = item.currentStock < recommended;
                const hasEdit = item.id in editedStocks;

                return (
                  <tr key={item.id} className={`group transition-colors ${hasEdit ? 'bg-amber-50/40' : 'hover:bg-slate-50/40'}`}>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{item.manufacturer}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800 tracking-tight">{item.brand}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.size}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-700 tabular-nums">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={editedStocks[item.id] ?? item.initialStock}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditedStocks(prev => {
                              if (val === item.initialStock) {
                                const { [item.id]: _, ...rest } = prev;
                                return rest;
                              }
                              return { ...prev, [item.id]: val };
                            });
                          }}
                          className={`w-20 p-1.5 text-sm text-center font-black rounded-lg outline-none ${hasEdit ? 'text-indigo-700 bg-indigo-50 border border-indigo-300 focus:border-indigo-500' : 'text-slate-900 bg-white border border-slate-300 focus:border-indigo-500'}`}
                        />
                      ) : (
                        item.initialStock
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-rose-500 tabular-nums">{item.usageCount > 0 ? `-${item.usageCount}` : '0'}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.monthlyAvgUsage ?? 0}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.dailyMaxUsage ?? 0}</td>
                    <td className={`px-6 py-4 text-center text-sm font-black tabular-nums transition-colors ${isLowStock ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'}`}>
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{recommended}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isEditMode && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {Object.keys(editedStocks).length > 0
                ? `${Object.keys(editedStocks).length}개 항목 변경됨`
                : '변경된 항목 없음'}
            </span>
            <div className="flex gap-2">
              <button onClick={handleCancelEdit} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">취소</button>
              <button
                onClick={handleBulkSave}
                disabled={Object.keys(editedStocks).length === 0}
                className={`px-5 py-2 text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${Object.keys(editedStocks).length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                일괄 저장{Object.keys(editedStocks).length > 0 && ` (${Object.keys(editedStocks).length})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* Add Item Modal                                    */}
      {/* ================================================= */}
      {isAddingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">품목 수동 추가</h3>
              <button onClick={() => setIsAddingItem(false)} aria-label="닫기" className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">제조사</label>
                <input type="text" value={editFormData.manufacturer || ''} onChange={(e) => handleEditChange('manufacturer', e.target.value)} className={inputStyle} placeholder="제조사명" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">브랜드</label>
                <input type="text" value={editFormData.brand || ''} onChange={(e) => handleEditChange('brand', e.target.value)} className={inputStyle} placeholder="브랜드명" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">규격</label>
                <input type="text" value={editFormData.size || ''} onChange={(e) => handleEditChange('size', e.target.value)} className={inputStyle} placeholder="규격 (예: D4.0 L10)" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">기초 재고</label>
                <input type="number" value={editFormData.initialStock || 10} onChange={(e) => handleEditChange('initialStock', e.target.value)} className={inputStyle} />
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setIsAddingItem(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-2xl transition-all">취소</button>
              <button
                onClick={() => {
                  if (editFormData.manufacturer && editFormData.brand && editFormData.size) {
                    onAddInventoryItem({
                      id: `manual_${Date.now()}`,
                      manufacturer: editFormData.manufacturer!,
                      brand: editFormData.brand!,
                      size: editFormData.size!,
                      initialStock: Number(editFormData.initialStock || 0),
                      stockAdjustment: 0,
                      usageCount: 0,
                      currentStock: Number(editFormData.initialStock || 0),
                      recommendedStock: 5,
                      monthlyAvgUsage: 0,
                      dailyMaxUsage: 0
                    });
                    setIsAddingItem(false);
                    setEditFormData({});
                  } else {
                    alert("모든 필드를 입력해주세요.");
                  }
                }}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                추가 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* Edit Notice Modal                                 */}
      {/* ================================================= */}
      {showEditNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">기초 재고 편집 안내</h3>
              <div className="w-full mt-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-bold text-amber-700 text-balance">최초 1회만 사용을 권장합니다</p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed text-balance">시스템 도입 시 기초 재고를 일괄 등록하는 용도입니다.</p>
              </div>
              <p className="w-full mt-4 text-sm text-slate-500 leading-relaxed text-balance">이후 재고는 <span className="font-bold text-slate-700">현재 재고</span>를 기준으로 관리되며, <span className="font-bold text-slate-700">주문(발주 입고)</span>과 <span className="font-bold text-slate-700">재고 실사</span>를 통해 정확한 현재 재고를 유지하세요.</p>
              <div className="mt-4 px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-xs font-bold text-slate-400">남은 편집 횟수: <span className="text-indigo-600">{isUnlimited ? '무제한' : `${maxEdits - editCount}회`}</span></span>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setShowEditNotice(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => { setShowEditNotice(false); setIsEditMode(true); }}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                편집 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* Consistency Detail Modal                           */}
      {/* ================================================= */}
      {showConsistencyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black">품목 일관성 불량 목록</h3>
                <p className="text-amber-100 text-xs font-medium mt-0.5">브랜드별 규격 패턴이 일치하지 않는 {consistencyData.inconsistentCount}건</p>
              </div>
              <button onClick={() => setShowConsistencyModal(false)} aria-label="닫기" className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">현재 패턴</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">예상 패턴</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consistencyData.inconsistentItems.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-400">{entry.item.manufacturer}</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-800">{entry.item.brand}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600">{entry.item.size}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">{entry.actualLabel}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">{entry.expectedLabel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
              <button onClick={() => setShowConsistencyModal(false)} className="px-6 py-2 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-700 active:scale-95 transition-all">
                확인
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryManager;
