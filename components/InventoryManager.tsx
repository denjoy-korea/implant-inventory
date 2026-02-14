
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ExcelData, Order } from '../types';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateStock: (id: string, initialStock: number) => void;
  onDeleteInventoryItem: (id: string) => void;
  onAddInventoryItem: (newItem: InventoryItem) => void;
  onUpdateInventoryItem: (updatedItem: InventoryItem) => void;
  surgeryData?: ExcelData | null;
  onQuickOrder?: (item: InventoryItem) => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ 
  inventory, 
  onUpdateStock, 
  onDeleteInventoryItem,
  onAddInventoryItem,
  onUpdateInventoryItem,
  surgeryData,
  onQuickOrder
}) => {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [activeManufacturers, setActiveManufacturers] = useState<Set<string>>(new Set());
  const [showInitialSettingCol, setShowInitialSettingCol] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});

  const manufacturersList = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort();
  }, [inventory]);

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
    return inventory
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

  const handleEditChange = (field: keyof InventoryItem | 'targetCurrentStock', value: any) => {
    if (field === 'targetCurrentStock') {
      const targetVal = parseInt(value) || 0;
      const editingItem = editingItemId ? inventory.find(i => i.id === editingItemId) : null;
      
      if (editingItem) {
        const usage = editingItem.usageCount || 0;
        // 현재 재고 = 기초 재고 + 입고량 - 사용량
        // 기초 재고 = 현재 재고 - 입고량 + 사용량
        // 여기서 '입고량'을 계산하기 위해 기존 데이터의 관계를 활용
        // 입고량 = 현재재고 - 기초재고 + 사용량
        const currentReceived = editingItem.currentStock - editingItem.initialStock + usage;
        
        // 새 기초재고 = 새 타겟재고 - 현재입고량 + 사용량
        const newInitial = targetVal - currentReceived + usage;
        
        setEditFormData(prev => ({ 
          ...prev, 
          initialStock: newInitial, 
          currentStock: targetVal 
        }));
      }
    } else if (field === 'initialStock') {
      const val = parseInt(value) || 0;
      const editingItem = editingItemId ? inventory.find(i => i.id === editingItemId) : null;
      if (editingItem) {
        const usage = editingItem.usageCount || 0;
        const currentReceived = editingItem.currentStock - editingItem.initialStock + usage;
        setEditFormData(prev => ({ 
          ...prev, 
          initialStock: val, 
          currentStock: val + currentReceived - usage 
        }));
      }
    } else {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const saveEdit = () => {
    if (editFormData.id) { onUpdateInventoryItem(editFormData as InventoryItem); setEditingItemId(null); setEditFormData({}); }
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
            <button 
              onClick={() => setShowInitialSettingCol(!showInitialSettingCol)} 
              className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-all shadow-sm ${showInitialSettingCol ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {showInitialSettingCol ? '설정 컬럼 숨기기' : '설정 컬럼 표시'}
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditFormData({ initialStock: 10 }); setIsAddingItem(true); }} className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">품목 수동 추가</button>
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
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                {showInitialSettingCol && <th className="px-6 py-6 text-[11px] font-bold text-indigo-600 text-center bg-indigo-50/30">기초설정</th>}
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 text-center">기초 재고</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 text-center">사용량</th>
                <th className="px-6 py-6 text-[11px] font-bold text-indigo-400 text-center">월평균사용</th>
                <th className="px-6 py-6 text-[11px] font-bold text-indigo-400 text-center">일최대사용</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 text-center">현재 재고</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 text-center text-indigo-600">권장량</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 text-center">관리/발주</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                const isEditing = editingItemId === item.id;
                const recommended = Math.ceil(item.recommendedStock * monthFactor);
                const isLowStock = item.currentStock < recommended;

                return (
                  <tr key={item.id} className={`group transition-colors ${isEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/40'}`}>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{item.manufacturer}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800 tracking-tight">{item.brand}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.size}</td>
                    {showInitialSettingCol && (
                      <td className="px-6 py-4 text-center bg-indigo-50/10 min-w-[100px]">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editFormData.currentStock ?? item.currentStock} 
                            onChange={(e) => handleEditChange('targetCurrentStock', e.target.value)} 
                            className={highlightedInputStyle + " text-center shadow-inner border-indigo-300 ring-2 ring-indigo-50"} 
                          />
                        ) : (
                          <span className="text-sm font-black text-indigo-700 tabular-nums">{item.currentStock}</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-700 tabular-nums">
                      {isEditing ? (
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-800">
                            {editFormData.initialStock ?? item.initialStock}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">(입고량 자동 역산)</span>
                        </div>
                      ) : (
                        item.initialStock
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-rose-500 tabular-nums">-{item.usageCount}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.monthlyAvgUsage ?? 0}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.dailyMaxUsage ?? 0}</td>
                    <td className={`px-6 py-4 text-center text-sm font-black tabular-nums transition-colors ${isLowStock ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'}`}>
                      {isEditing ? (editFormData.currentStock ?? item.currentStock) : item.currentStock}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{recommended}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></button>
                            <button onClick={() => { setEditingItemId(null); setEditFormData({}); }} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setEditingItemId(item.id); setEditFormData({...item}); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            {isLowStock && onQuickOrder && (
                              <button onClick={() => onQuickOrder(item)} className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-rose-100 hover:scale-105 active:scale-95 transition-all">즉시 발주</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">품목 수동 추가</h3>
              <button onClick={() => setIsAddingItem(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                      initialStock: Number(editFormData.initialStock || 10),
                      usageCount: 0,
                      currentStock: Number(editFormData.initialStock || 10),
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
    </div>
  );
};

export default InventoryManager;
