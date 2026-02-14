
import React, { useState, useMemo, useEffect } from 'react';
import { ExcelData, ExcelRow, ExcelSheet } from '../types';

interface ExcelTableProps {
  data: ExcelData;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onToggleAll: (selectAll: boolean) => void;
  onUpdateCell: (index: number, column: string, value: any) => void;
  onSheetChange: (sheetName: string) => void;
  onCreateFailList?: () => void;
  onOpenNewModal?: () => void;
  isLengthExtracted?: boolean;
  onExtractLengths?: () => void;
  onResetLengths?: () => void;
  onBulkToggleManufacturer?: (manufacturer: string, targetUnused: boolean) => void;
  onBulkToggleByLength?: (threshold: number) => void;
  hideStatusFilters?: boolean;
}

type FilterType = 'all' | 'active' | 'unused';

const ExcelTable: React.FC<ExcelTableProps> = ({ 
  data, 
  selectedIndices, 
  onToggleSelect, 
  onToggleAll, 
  onUpdateCell,
  onSheetChange,
  onCreateFailList,
  onOpenNewModal,
  isLengthExtracted,
  onExtractLengths,
  onResetLengths,
  onBulkToggleManufacturer,
  onBulkToggleByLength,
  hideStatusFilters = false
}) => {
  const [filter, setFilter] = useState<FilterType>(hideStatusFilters ? 'all' : 'active');
  const [mFilter, setMFilter] = useState<FilterType>('active');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const activeSheet = data.sheets[data.activeSheetName];

  // 초기 열 설정 및 순서 초기화
  useEffect(() => {
    if (activeSheet) {
      setVisibleColumns(new Set(activeSheet.columns));
      setColumnOrder(activeSheet.columns);
    }
  }, [activeSheet?.columns]);

  const counts = useMemo(() => {
    if (!activeSheet) return { all: 0, active: 0, unused: 0 };
    return {
      all: activeSheet.rows.length,
      active: activeSheet.rows.filter(r => r['사용안함'] !== true).length,
      unused: activeSheet.rows.filter(r => r['사용안함'] === true).length
    };
  }, [activeSheet]);

  const manufacturerStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number }> = {};
    if (!activeSheet) return stats;
    activeSheet.rows.forEach(r => {
      const m = String(r['제조사'] || '기타');
      if (!stats[m]) stats[m] = { active: 0, total: 0 };
      stats[m].total++;
      if (r['사용안함'] !== true) stats[m].active++;
    });
    return stats;
  }, [activeSheet]);

  const filteredManufacturers = useMemo(() => {
    const list = Object.keys(manufacturerStats).sort();
    return list.filter(m => {
      const stats = manufacturerStats[m] as { active: number; total: number };
      if (mFilter === 'active') return stats.active > 0;
      if (mFilter === 'unused') return stats.active === 0;
      return true;
    });
  }, [manufacturerStats, mFilter]);

  const mCounts = useMemo(() => {
    const values = Object.values(manufacturerStats) as { active: number; total: number }[];
    return {
      all: values.length,
      active: values.filter(v => v.active > 0).length,
      unused: values.filter(v => v.active === 0).length
    };
  }, [manufacturerStats]);

  const visibleRows = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (filter === 'active') return row['사용안함'] !== true;
        if (filter === 'unused') return row['사용안함'] === true;
        return true;
      });
  }, [activeSheet, filter]);

  const toggleColumn = (col: string) => {
    const next = new Set(visibleColumns);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setVisibleColumns(next);
  };

  const toggleAllColumns = (show: boolean) => {
    if (show) setVisibleColumns(new Set(activeSheet.columns));
    else setVisibleColumns(new Set());
  };

  // Drag and Drop Logic
  const handleDragStart = (col: string) => {
    setDraggedColumn(col);
  };

  const handleDragOver = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    if (draggedColumn === targetCol) return;
    setDragOverColumn(targetCol);
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetCol) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetCol);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  if (!activeSheet) return null;

  const currentVisibleCols = columnOrder.filter(c => visibleColumns.has(c));

  return (
    <div className="space-y-4">
      {/* Sheet Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(data.sheets).map(name => (
          <button
            key={name}
            onClick={() => onSheetChange(name)}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              data.activeSheetName === name 
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm' 
                : 'bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Manufacturer Quick Toggles */}
      {!hideStatusFilters && onBulkToggleManufacturer && Object.keys(manufacturerStats).length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 gap-3">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" /></svg>
                제조사별 일괄 처리
              </h3>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg w-fit">
                <button onClick={() => setMFilter('active')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>사용 {mCounts.active}</button>
                <button onClick={() => setMFilter('unused')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'unused' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>미사용 {mCounts.unused}</button>
                <button onClick={() => setMFilter('all')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>전체 {mCounts.all}</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredManufacturers.map(m => {
              const stats = manufacturerStats[m] as { active: number; total: number };
              const isActive = stats?.active > 0;
              return (
                <div key={m} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-3 px-4 min-h-[64px]">
                  <span className="text-xs font-bold text-slate-800 truncate pr-2">{m}</span>
                  <div className="flex items-center gap-3 border-l border-slate-50 pl-3">
                    <div onClick={() => onBulkToggleManufacturer(m, isActive)} className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 flex-shrink-0 ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-6' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-3">
          {!hideStatusFilters ? (
            <div className="inline-flex p-1 bg-slate-200/50 rounded-xl">
              <button onClick={() => setFilter('active')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>사용 <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100">{counts.active}</span></button>
              <button onClick={() => setFilter('unused')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filter === 'unused' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>미사용 <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-300">{counts.unused}</span></button>
              <button onClick={() => setFilter('all')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>전체 <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200">{counts.all}</span></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">
              총 데이터 <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-600 text-white">{counts.all}</span>
            </div>
          )}

          {/* 열 관리 토글 */}
          <div className="relative">
            <button 
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              열 관리 {visibleColumns.size}/{activeSheet.columns.length}
            </button>
            
            {isColumnSelectorOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800">보일 열 선택</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAllColumns(true)} className="text-[10px] font-bold text-indigo-600">전체선택</button>
                    <button onClick={() => toggleAllColumns(false)} className="text-[10px] font-bold text-rose-500">전체해제</button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {columnOrder.map(col => (
                    <div 
                      key={col} 
                      draggable 
                      onDragStart={() => handleDragStart(col)}
                      onDragOver={(e) => handleDragOver(e, col)}
                      onDrop={(e) => handleDrop(e, col)}
                      className={`flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-move transition-all ${draggedColumn === col ? 'opacity-30 bg-indigo-50' : ''} ${dragOverColumn === col ? 'border-t-2 border-indigo-400' : ''}`}
                    >
                      <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 9h8v2H8zm0 4h8v2H8z"/></svg>
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns.has(col)} 
                          onChange={() => toggleColumn(col)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className={`text-xs font-bold transition-colors ${visibleColumns.has(col) ? 'text-slate-800' : 'text-slate-400'}`}>
                          {col}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setIsColumnSelectorOpen(false)}
                  className="w-full mt-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-all"
                >
                  적용하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr>
                {currentVisibleCols.map((col) => (
                  <th 
                    key={col} 
                    draggable
                    onDragStart={() => handleDragStart(col)}
                    onDragOver={(e) => handleDragOver(e, col)}
                    onDrop={(e) => handleDrop(e, col)}
                    className={`px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-r border-slate-100 last:border-0 cursor-move transition-all ${draggedColumn === col ? 'bg-indigo-50 opacity-50' : ''} ${dragOverColumn === col ? 'border-l-4 border-indigo-500' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M8 9h8v2H8zm0 4h8v2H8z"/></svg>
                      {col}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map(({ row, index: originalIndex }) => (
                <tr key={originalIndex} className={`transition-colors hover:bg-slate-50/50 ${selectedIndices.has(originalIndex) ? 'bg-blue-50/30' : ''}`}>
                  {currentVisibleCols.map((col) => {
                    const val = row[col];
                    const isCheck = col === '사용안함';
                    const isLongText = col === '수술기록' || col === '수술내용';
                    const isToothNo = col === '치아번호';
                    
                    return (
                      <td key={`${originalIndex}-${col}`} className={`px-2 py-1.5 border-r border-slate-50 last:border-0 ${draggedColumn === col ? 'bg-indigo-50/10' : ''}`}>
                        {isCheck ? (
                          <div className="flex justify-center min-w-[60px]"><input type="checkbox" checked={!!val} onChange={(e) => onUpdateCell(originalIndex, col, e.target.checked)} className="w-4 h-4 text-red-500 rounded border-slate-300 focus:ring-red-500" /></div>
                        ) : (
                          <div className="flex items-center min-w-max">
                            <input 
                              type="text" 
                              value={val || ''} 
                              onChange={(e) => onUpdateCell(originalIndex, col, e.target.value)} 
                              style={{ minWidth: isLongText ? '280px' : isToothNo ? '80px' : '60px' }}
                              className={`w-full px-2 py-1 text-xs border-transparent hover:border-slate-200 focus:border-indigo-400 rounded outline-none bg-transparent whitespace-nowrap overflow-hidden text-ellipsis transition-all ${isLongText ? 'font-medium' : ''}`} 
                              readOnly={hideStatusFilters} 
                              title={val || ''}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* 횡스크롤 시 가독성을 위한 열 최소 너비 및 텍스트 유지 */
        table { border-spacing: 0; border-collapse: separate; }
        td input { text-overflow: ellipsis; }
        td:hover input { border-color: #e2e8f0; background: white; }
      `}</style>
    </div>
  );
};

export default ExcelTable;
