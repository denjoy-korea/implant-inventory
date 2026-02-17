
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ExcelData, PlanType, PLAN_LIMITS } from '../types';
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
  plan = 'free'
}) => {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [activeManufacturers, setActiveManufacturers] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});
  const [showEditNotice, setShowEditNotice] = useState(false);


  const maxEdits = PLAN_LIMITS[plan].maxBaseStockEdits;
  const isUnlimited = maxEdits === Infinity;
  const EDIT_COUNT_KEY = userId ? `dentweb_initial_stock_edit_count_${userId}` : 'dentweb_initial_stock_edit_count';
  const getEditCount = () => parseInt(localStorage.getItem(EDIT_COUNT_KEY) || '0', 10);
  const [editCount, setEditCount] = useState(getEditCount);
  const isEditExhausted = !isUnlimited && editCount >= maxEdits;

  useEffect(() => {
    setEditCount(getEditCount());
  }, [userId]);

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

  useEffect(() => {
    if (activeManufacturers.size === 0 && manufacturersList.length > 0) {
      setActiveManufacturers(new Set(manufacturersList));
    }
  }, [manufacturersList]);

  const toggleManufacturer = (m: string) => {
    const next = new Set(activeManufacturers);
    if (next.has(m)) next.delete(m); else next.add(m);
    setActiveManufacturers(next);
  };

  const filteredInventory = useMemo(() => {
    return visibleInventory
      .filter(item => activeManufacturers.has(item.manufacturer))
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [inventory, activeManufacturers]);

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

  const handleEditChange = (field: keyof InventoryItem, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkSave = () => {
    Object.entries(editedStocks).forEach(([id, val]) => {
      onUpdateStock(id, val);
    });
    const newCount = editCount + 1;
    localStorage.setItem(EDIT_COUNT_KEY, String(newCount));
    setEditCount(newCount);
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">재고 현황 마스터</h2>
            <p className="text-sm text-slate-500 font-medium italic mt-1">품목별 기초 재고를 설정하고 실시간 사용량을 모니터링하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[20px] border border-slate-200 shadow-sm">
            {manufacturersList.map(m => (
              <button 
                key={m} 
                onClick={() => toggleManufacturer(m)} 
                className={`px-5 py-2.5 text-[11px] font-black rounded-xl transition-all ${activeManufacturers.has(m) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 브랜드별 사용량 시각화 차트 */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              규격별 사용량 분석 (TOP 12)
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Manufacturers Data</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-10 min-h-[160px] items-end">
            {chartData.length > 0 ? chartData.map((item) => (
              <div key={item.id} className="group relative flex flex-col items-center">
                <div className="absolute -top-6 text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-2 py-0.5 rounded">
                  {item.usageCount}개
                </div>
                <div 
                  className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-indigo-500 to-violet-400 shadow-lg shadow-indigo-100 group-hover:from-indigo-600 group-hover:to-violet-500 transition-all duration-500 ease-out relative"
                  style={{ height: `${(item.usageCount / maxUsage) * 140 + 5}px` }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"></div>
                </div>
                <div className="mt-3 text-center w-full">
                  <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{item.brand}</p>
                  <p className="text-[10px] font-black text-slate-700 truncate">{item.size}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-10 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <p className="text-xs text-slate-400 font-bold italic">사용 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {!isReadOnly && !isEditMode && (
              <button
                onClick={() => !isEditExhausted && setShowEditNotice(true)}
                disabled={isEditExhausted}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${isEditExhausted ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                기초 재고 편집{isUnlimited ? '' : isEditExhausted ? '' : ` (${maxEdits - editCount}회 남음)`}
              </button>
            )}
            {isEditMode && (
              <>
                <button onClick={handleCancelEdit} className="px-4 py-2.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">취소</button>
                <button
                  onClick={handleBulkSave}
                  disabled={Object.keys(editedStocks).length === 0}
                  className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 ${Object.keys(editedStocks).length > 0 ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  일괄 저장{Object.keys(editedStocks).length > 0 && ` (${Object.keys(editedStocks).length})`}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { if (!isReadOnly) { setEditFormData({ initialStock: 0 }); setIsAddingItem(true); } }} disabled={isReadOnly} className={`px-6 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 active:scale-95'}`}>품목 수동 추가</button>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => setMonthFactor(1)} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${monthFactor === 1 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>1개월 기준</button>
              <button onClick={() => setMonthFactor(2)} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${monthFactor === 2 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>2개월 기준</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
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

      {isAddingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-md rounded-[32px] shadow-2xl overflow-hidden">
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

      {showEditNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
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

    </div>
  );
};

export default InventoryManager;
