
import React, { useMemo, useState, useEffect } from 'react';
import { ExcelRow, InventoryItem, Order as FailOrder } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { useToast } from '../hooks/useToast';

interface FailManagerProps {
  surgeryMaster: Record<string, ExcelRow[]>;
  inventory: InventoryItem[];
  failOrders: FailOrder[];
  onAddFailOrder: (order: FailOrder) => void;
  currentUserName: string;
  isReadOnly?: boolean;
}

const FailManager: React.FC<FailManagerProps> = ({ surgeryMaster, inventory, failOrders, onAddFailOrder, currentUserName, isReadOnly }) => {
  const { toast, showToast } = useToast();
  // 비교를 위한 정규화 함수
  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

  // 1. FAIL 히스토리 전체 추출
  const historyFailList = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    return allRows.filter(row => row['구분'] === '수술중 FAIL' || row['구분'] === 'FAIL 교환완료');
  }, [surgeryMaster]);

  // 2. 미처리 FAIL 리스트
  const pendingFailList = useMemo(() => {
    return historyFailList.filter(row => row['구분'] === '수술중 FAIL');
  }, [historyFailList]);

  // 3. 제조사 목록
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    historyFailList.forEach(f => set.add(String(f['제조사'] || '기타')));
    return Array.from(set).sort();
  }, [historyFailList]);

  const [activeM, setActiveM] = useState<string>(manufacturers[0] || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{brand: string, size: string, quantity: number}[]>([]);

  // 제조사별 통계
  const mStats = useMemo(() => {
    const stats: Record<string, { total: number; processed: number; pending: number }> = {};
    historyFailList.forEach(f => {
      const m = String(f['제조사'] || '기타');
      if (!stats[m]) stats[m] = { total: 0, processed: 0, pending: 0 };
      stats[m].total++;
      if (f['구분'] === 'FAIL 교환완료') stats[m].processed++;
      else stats[m].pending++;
    });
    return stats;
  }, [historyFailList]);

  const currentStats = mStats[activeM] || { total: 0, processed: 0, pending: 0 };
  const currentRemainingFails = currentStats.pending;

  const mPendingList = pendingFailList.filter(f => String(f['제조사'] || '기타') === activeM);

  // 팝업 상단: 교환 권장 품목 추출 (FAIL 발생했으나 아직 주문안된 품목)
  const recommendedExchangeItems = useMemo(() => {
    if (!activeM || !isModalOpen) return [];
    
    // 1. 현재 제조사의 FAIL 항목들을 브랜드/규격별로 집계
    const failCounts: Record<string, { brand: string, size: string, count: number }> = {};
    mPendingList.forEach(f => {
      const b = String(f['브랜드'] || 'Unknown');
      const s = String(f['규격(SIZE)'] || 'Unknown');
      const key = `${simpleNormalize(b)}|${getSizeMatchKey(s, activeM)}`;
      if (!failCounts[key]) {
        failCounts[key] = { brand: b, size: s, count: 0 };
      }
      failCounts[key].count++;
    });

    // 2. 이미 DB에 있는 '입고 대기' 중인 주문 수량 + 현재 작성 중인 폼의 수량 합산하여 차감
    const result = Object.values(failCounts).map(item => {
      let alreadyOrderedQty = 0;
      
      // DB 내 기존 주문 확인
      failOrders
        .filter(o => o.status === 'ordered' && simpleNormalize(o.manufacturer) === simpleNormalize(activeM))
        .forEach(order => {
          order.items.forEach(oi => {
            if (simpleNormalize(oi.brand) === simpleNormalize(item.brand) &&
                getSizeMatchKey(oi.size, activeM) === getSizeMatchKey(item.size, activeM)) {
              alreadyOrderedQty += oi.quantity;
            }
          });
        });
      
      // 현재 작성 중인 폼(Modal 내) 내 수량 확인
      selectedItems.forEach(si => {
        if (simpleNormalize(si.brand) === simpleNormalize(item.brand) &&
            getSizeMatchKey(si.size, activeM) === getSizeMatchKey(item.size, activeM)) {
          alreadyOrderedQty += Number(si.quantity || 0);
        }
      });
      
      return { ...item, remainingToOrder: item.count - alreadyOrderedQty };
    }).filter(item => item.remainingToOrder > 0);

    return result;
  }, [activeM, mPendingList, failOrders, selectedItems, isModalOpen]);

  const availableInventoryForM = useMemo(() => {
    if (!activeM) return [];
    const normalizedActiveM = simpleNormalize(activeM);
    return inventory.filter(i => {
      const normalizedInvM = simpleNormalize(i.manufacturer);
      return normalizedInvM.includes(normalizedActiveM) || normalizedActiveM.includes(normalizedInvM);
    });
  }, [inventory, activeM]);

  const handleOpenOrderModal = () => {
    if (currentRemainingFails <= 0) {
      showToast('현재 제조사에 반품 가능한 FAIL 잔여 건수가 없습니다.', 'error');
      return;
    }
    setSelectedItems([{ brand: '', size: '', quantity: 1 }]);
    setIsModalOpen(true);
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const next = [...selectedItems];
    if (field === 'brand') {
      next[index] = { ...next[index], brand: value, size: '' };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setSelectedItems(next);
  };

  const quickAddRecommended = (item: { brand: string, size: string, remainingToOrder: number }) => {
    const otherItemsTotal = selectedItems
      .filter(si => simpleNormalize(si.brand) !== simpleNormalize(item.brand) || getSizeMatchKey(si.size, activeM) !== getSizeMatchKey(item.size, activeM))
      .reduce((sum, si) => sum + (Number(si.brand && si.size ? si.quantity : 0)), 0);
    
    const globalLimitRoom = Math.max(0, currentRemainingFails - otherItemsTotal);
    const maxPossibleQty = Math.min(item.remainingToOrder, globalLimitRoom);

    if (maxPossibleQty <= 0) {
      showToast('제조사 전체 반품 가능 수량을 초과할 수 없습니다.', 'error');
      return;
    }

    const existingIdx = selectedItems.findIndex(si => simpleNormalize(si.brand) === simpleNormalize(item.brand) && getSizeMatchKey(si.size, activeM) === getSizeMatchKey(item.size, activeM));
    if (existingIdx >= 0) {
      const next = [...selectedItems];
      next[existingIdx].quantity = maxPossibleQty;
      setSelectedItems(next);
    } else {
      const emptyIdx = selectedItems.findIndex(si => !si.brand && !si.size);
      if (emptyIdx >= 0) {
        const next = [...selectedItems];
        next[emptyIdx] = { brand: item.brand, size: item.size, quantity: maxPossibleQty };
        setSelectedItems(next);
      } else {
        setSelectedItems([...selectedItems, { brand: item.brand, size: item.size, quantity: maxPossibleQty }]);
      }
    }
  };

  const handleOrderSubmit = () => {
    const validItems = selectedItems.filter(i => i.brand && i.size).map(i => ({...i, quantity: Number(i.quantity)}));
    if (validItems.length === 0) {
      showToast('유효한 품목을 하나 이상 선택해주세요.', 'error');
      return;
    }

    const totalOrderQty = validItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalOrderQty > currentRemainingFails) {
      showToast(`주문 수량(${totalOrderQty})이 잔여 FAIL 건수(${currentRemainingFails})를 초과할 수 없습니다.`, 'error');
      return;
    }

    // 각 품목을 개별 주문 데이터로 등록
    validItems.forEach((item, index) => {
      const newOrder: FailOrder = {
        id: `order_${Date.now()}_${index}`,
        type: 'fail_exchange',
        manufacturer: activeM,
        date: new Date().toISOString().split('T')[0],
        items: [item], // 개별 품목으로 분리
        manager: currentUserName,
        status: 'ordered'
      };
      onAddFailOrder(newOrder);
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">식립 FAIL 관리 마스터</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium italic">수술 중 발생한 FAIL 데이터를 추적하고 교환 상태를 자동 동기화합니다.</p>
        </div>
        
        <div className="flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-[320px]">
          <div className="px-6 py-4 flex flex-col justify-center border-r border-slate-100 bg-rose-50/30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">총 FAIL 발생</p>
            <p className="text-3xl font-black text-rose-600 tabular-nums">
              {historyFailList.length}<span className="text-sm ml-1 font-bold">건</span>
            </p>
          </div>
          <div className="flex-1 px-6 py-4 grid grid-cols-2 gap-4 items-center">
             <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">교환완료</p>
                <p className="text-base font-black text-indigo-600">{historyFailList.filter(f => f['구분'] === 'FAIL 교환완료').length}</p>
             </div>
             <div className="text-center border-l border-slate-50">
                <p className="text-[9px] font-bold text-rose-400 uppercase mb-0.5">미처리 잔여</p>
                <p className="text-base font-black text-rose-500">{pendingFailList.length}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200">
        {manufacturers.map(m => {
          const stats = mStats[m];
          return (
            <button
              key={m}
              onClick={() => setActiveM(m)}
              className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-x border-t relative -mb-px ${activeM === m ? 'bg-white border-slate-200 text-rose-600 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10' : 'bg-slate-50 border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {m}
              {stats.pending > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full">{stats.pending}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeM ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-10">
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">총 발생</p>
                    <p className="text-2xl font-black text-slate-800">{currentStats.total}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 hidden sm:block"></div>
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">교환 처리됨</p>
                    <p className="text-2xl font-black text-indigo-600">{currentStats.processed}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 hidden sm:block"></div>
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-bold text-rose-400 mb-1 italic">반품 가능 잔여</p>
                    <p className="text-2xl font-black text-rose-600">{currentRemainingFails}</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenOrderModal}
                  disabled={isReadOnly}
                  className={`px-6 py-3 font-bold rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center gap-2 ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700 hover:translate-y-[-2px]'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  반품 및 교환 주문
                </button>
              </div>

            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                최근 교환 주문 이력
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {failOrders.filter(o => o.manufacturer === activeM).map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-800">{order.date} 주문</p>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">Ordered</span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">{item.brand} {item.size}</span>
                          <span className="text-slate-800">{item.quantity}개</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-end">
                      <span className="text-[10px] font-bold text-slate-400">담당: {order.manager}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm">
          <svg className="w-16 h-16 text-slate-100 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-slate-400 font-medium italic">데이터가 로드되면 제조사를 선택하여 관리를 시작하세요.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-8 bg-rose-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">대체 주문 및 반품 처리</h3>
                <p className="text-xs opacity-80 mt-1 font-bold uppercase tracking-wider">{activeM} / 반품 가능 잔량: {currentRemainingFails}건</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {recommendedExchangeItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      교환 권장 품목
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended for Exchange</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {recommendedExchangeItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => quickAddRecommended(item)}
                        className="flex-shrink-0 bg-rose-50 border border-rose-100 p-4 rounded-2xl cursor-pointer hover:bg-rose-100 hover:scale-105 transition-all group min-w-[160px]"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">PENDING {item.remainingToOrder}건</span>
                          <svg className="w-3 h-3 text-rose-300 group-hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-xs font-black text-slate-800 truncate">{item.brand}</p>
                        <p className="text-[11px] font-bold text-slate-500">{item.size}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">주문일자 (오늘)</label>
                  <input type="text" value={new Date().toLocaleDateString('ko-KR')} readOnly className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-slate-700 shadow-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품/주문 담당자</label>
                  <div className="w-full bg-slate-100 border border-slate-200 p-3 rounded-xl font-black text-slate-500 shadow-sm cursor-not-allowed">
                    {currentUserName}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-sm font-black text-slate-800">교환 요청 품목</h4>
                  <p className="text-[10px] text-slate-400 italic">* 제조사 FAIL 합계를 초과하여 주문할 수 없습니다.</p>
                </div>
                
                {selectedItems.map((item, idx) => {
                  const brandOptions = Array.from(new Set(availableInventoryForM.map(i => i.brand))).sort();
                  const sizeOptions = availableInventoryForM
                    .filter(i => i.brand === item.brand)
                    .map(i => i.size)
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                  return (
                    <div key={idx} className="flex gap-3 items-end p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
                      <div className="flex-[2]">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">브랜드 선택</label>
                        <select 
                          value={item.brand} 
                          onChange={(e) => updateOrderItem(idx, 'brand', e.target.value)}
                          className="w-full p-2.5 text-xs border border-slate-200 rounded-lg outline-none font-black text-slate-700 bg-slate-50 cursor-pointer"
                        >
                          <option value="">브랜드 선택</option>
                          {brandOptions.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">규격 선택</label>
                        <select 
                          value={item.size} 
                          onChange={(e) => updateOrderItem(idx, 'size', e.target.value)}
                          disabled={!item.brand}
                          className="w-full p-2.5 text-xs border border-slate-200 rounded-lg outline-none font-black text-slate-700 bg-slate-50 cursor-pointer disabled:bg-slate-100 disabled:opacity-50"
                        >
                          <option value="">규격 선택</option>
                          {sizeOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">수량</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                          className="w-full p-2.5 text-xs border border-rose-200 rounded-lg outline-none font-black text-center text-rose-600 bg-rose-50/30"
                        />
                      </div>
                      <button 
                        onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                        disabled={selectedItems.length === 1}
                        className="p-2.5 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  );
                })}

                <button 
                  onClick={() => setSelectedItems([...selectedItems, { brand: '', size: '', quantity: 1 }])}
                  className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                  + 추가 품목 입력
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm font-bold text-slate-600">
                총 주문 수량: <span className={`text-xl font-black ml-1 tabular-nums ${selectedItems.reduce((s, i) => s + (Number(i.brand && i.size ? i.quantity : 0)), 0) > currentRemainingFails ? 'text-rose-600 underline decoration-wavy' : 'text-indigo-600'}`}>{selectedItems.reduce((s, i) => s + (Number(i.brand && i.size ? i.quantity : 0)), 0)}</span> / <span className="text-slate-400">{currentRemainingFails}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-2xl transition-all">취소</button>
                <button 
                  onClick={handleOrderSubmit} 
                  className="flex-1 sm:flex-none px-10 py-3 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"
                >
                  주문 확인 및 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default FailManager;
