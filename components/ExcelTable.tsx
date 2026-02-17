
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
  onBulkToggleByLength?: (threshold: number) => void;
  hideStatusFilters?: boolean;
  onExpandFailClaim?: () => void;
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

  hideStatusFilters = false,
  onExpandFailClaim
}) => {
  const [filter, setFilter] = useState<FilterType>(hideStatusFilters ? 'all' : 'active');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showFailClaimModal, setShowFailClaimModal] = useState(false);
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
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${data.activeSheetName === name
              ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
              : 'bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200'
              }`}
          >
            {name}
          </button>
        ))}
      </div>



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

        </div>
        {!hideStatusFilters && onExpandFailClaim && (
          <button
            onClick={() => setShowFailClaimModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 hover:border-rose-300 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            FAIL/청구 확장
          </button>
        )}
      </div>

      {showFailClaimModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">FAIL/청구 항목 확장</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                현재 <span className="font-bold text-indigo-600">사용 중인 항목({counts.active}개)</span>을 기반으로<br />
                다음 항목이 자동 생성됩니다.
              </p>
              <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-3 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black">F</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">수술중FAIL 항목</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">각 항목의 제조사 앞에 "수술중FAIL_"을 붙인 복제본 <span className="font-bold text-slate-600">+{counts.active}개</span></p>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black">B</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">보험청구 항목</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">제조사/브랜드 "보험청구", 규격 "2단계 청구" <span className="font-bold text-slate-600">+1개</span></p>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-bold text-slate-500">총 예상 결과: <span className="text-indigo-600">{counts.active * 2 + 1}개</span> (기존 {counts.active} + FAIL {counts.active} + 보험청구 1)</p>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setShowFailClaimModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => { setShowFailClaimModal(false); onExpandFailClaim?.(); }}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                확장 실행
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M8 9h8v2H8zm0 4h8v2H8z" /></svg>
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
                    const isPatientInfo = col === '환자정보';

                    return (
                      <td key={`${originalIndex}-${col}`} className={`px-2 py-1.5 border-r border-slate-50 last:border-0 ${draggedColumn === col ? 'bg-indigo-50/10' : ''}`}>
                        {isCheck ? (
                          <div className="flex justify-center min-w-[60px]"><input type="checkbox" checked={!!val} onChange={(e) => onUpdateCell(originalIndex, col, e.target.checked)} className="w-4 h-4 text-red-500 rounded border-slate-300 focus:ring-red-500" /></div>
                        ) : (
                          <div className={`flex items-center min-w-max ${isPatientInfo ? 'patient-info-cell' : ''}`}>
                            <input
                              type="text"
                              value={val || ''}
                              onChange={(e) => onUpdateCell(originalIndex, col, e.target.value)}
                              style={{ minWidth: isLongText ? '280px' : isToothNo ? '80px' : '60px' }}
                              className={`w-full px-2 py-1 text-xs border-transparent hover:border-slate-200 focus:border-indigo-400 rounded outline-none bg-transparent whitespace-nowrap overflow-hidden text-ellipsis transition-all ${isLongText ? 'font-medium' : ''} ${isPatientInfo ? 'patient-info-blur' : ''}`}
                              readOnly={hideStatusFilters}
                              title={isPatientInfo ? '환자 정보 보호' : (val || '')}
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

        /* 환자정보 블러 처리 */
        .patient-info-blur {
          filter: blur(5px);
          transition: filter 0.2s ease;
          user-select: none;
        }
        .patient-info-cell:hover .patient-info-blur {
          filter: blur(0);
          user-select: auto;
        }
      `}</style>
    </div>
  );
};

export default ExcelTable;
