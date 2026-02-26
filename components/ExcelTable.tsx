
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ExcelData, ExcelRow, ExcelSheet } from '../types';
import { extractLengthFromSize } from '../services/sizeUtils';
import { normalizeLength } from './LengthFilter';
import { MIN_FIXTURE_LENGTH } from '../constants';

interface ExcelTableProps {
  data: ExcelData;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onToggleAll: (selectAll: boolean) => void;
  onUpdateCell: (index: number, column: string, value: boolean | string | number) => void;
  onSheetChange: (sheetName: string) => void;
  hideStatusFilters?: boolean;
  onExpandFailClaim?: () => void;
  activeManufacturers?: string[];
}

type FilterType = 'all' | 'active' | 'unused';

const ExcelTable: React.FC<ExcelTableProps> = ({
  data,
  selectedIndices,
  onToggleSelect,
  onToggleAll,
  onUpdateCell,
  onSheetChange,
  hideStatusFilters = false,
  onExpandFailClaim,
  activeManufacturers,
}) => {
  const [filter, setFilter] = useState<FilterType>(hideStatusFilters ? 'all' : 'active');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showFailClaimModal, setShowFailClaimModal] = useState(false);
  const [showFailAlreadyDoneToast, setShowFailAlreadyDoneToast] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showHighlightPanel, setShowHighlightPanel] = useState(false);
  const [highlightedLengths, setHighlightedLengths] = useState<Set<string>>(new Set());
  const highlightPanelRef = useRef<HTMLDivElement>(null);

  const activeSheet = data.sheets[data.activeSheetName];

  // 초기 열 설정 — 시트 이름 + 컬럼 배열을 직렬화해 참조 비교 안정화
  const columnsKey = `${data.activeSheetName}::${activeSheet?.columns.join(',') ?? ''}`;
  useEffect(() => {
    if (activeSheet) {
      setVisibleColumns(new Set(activeSheet.columns));
      setColumnOrder([...activeSheet.columns]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsKey]);

  const counts = useMemo(() => {
    if (!activeSheet) return { all: 0, active: 0, unused: 0 };
    return {
      all: activeSheet.rows.length,
      active: activeSheet.rows.filter(r => r['사용안함'] !== true).length,
      unused: activeSheet.rows.filter(r => r['사용안함'] === true).length
    };
  }, [activeSheet]);

  const isFailExpanded = useMemo(() => {
    if (!activeSheet) return false;
    return activeSheet.rows.some(r => String(r['제조사'] || '').startsWith('수술중교환_'));
  }, [activeSheet]);

  const visibleRows = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (filter === 'active') { if (row['사용안함'] === true) return false; }
        else if (filter === 'unused') { if (row['사용안함'] !== true) return false; }
        if (selectedManufacturer !== null) {
          if (String(row['제조사'] || '') !== selectedManufacturer) return false;
        }
        return true;
      });
  }, [activeSheet, filter, selectedManufacturer]);

  // 하이라이트 패널용: 활성 행에서 길이값 추출
  const availableLengths = useMemo(() => {
    if (!activeSheet) return [];
    const seen = new Set<string>();
    activeSheet.rows.forEach(r => {
      if (r['사용안함'] === true) return;
      const size = String(r['규격(SIZE)'] || r['규격'] || r['사이즈'] || r['Size'] || r['size'] || '');
      const raw = extractLengthFromSize(size);
      if (!raw) return;
      const normalized = normalizeLength(raw);
      if (!normalized || parseFloat(normalized) < MIN_FIXTURE_LENGTH) return;
      seen.add(normalized);
    });
    return Array.from(seen).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [activeSheet]);

  // 행별 하이라이트 여부 판별용 함수
  const getRowLength = (row: ExcelRow): string => {
    const size = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
    const raw = extractLengthFromSize(size);
    if (!raw) return '';
    return normalizeLength(raw);
  };

  const toggleHighlightLength = (length: string) => {
    setHighlightedLengths(prev => {
      const next = new Set(prev);
      if (next.has(length)) next.delete(length);
      else next.add(length);
      return next;
    });
  };

  // 패널 외부 클릭 닫기
  useEffect(() => {
    if (!showHighlightPanel) return;
    const handleClick = (e: MouseEvent) => {
      if (highlightPanelRef.current && !highlightPanelRef.current.contains(e.target as Node)) {
        setShowHighlightPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showHighlightPanel]);

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

      <div className="flex justify-between items-center pt-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {!hideStatusFilters && activeManufacturers && activeManufacturers.length > 0 ? (
            activeManufacturers.map(m => {
              const isSelected = selectedManufacturer === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedManufacturer(prev => prev === m ? null : m)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-700'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-indigo-300' : 'bg-slate-300'}`} />
                  {m}
                </button>
              );
            })
          ) : hideStatusFilters ? (
            <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">
              총 데이터 <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-600 text-white">{counts.all}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* 하이라이트 버튼 */}
          {!hideStatusFilters && availableLengths.length > 0 && (
            <div className="relative" ref={highlightPanelRef}>
              <button
                type="button"
                onClick={() => setShowHighlightPanel(p => !p)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border rounded-xl transition-all ${
                  highlightedLengths.size > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                    : showHighlightPanel
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                하이라이트
                {highlightedLengths.size > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500 text-white">{highlightedLengths.size}</span>
                )}
              </button>

              {showHighlightPanel && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-56">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700">길이별 하이라이트</span>
                    {highlightedLengths.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setHighlightedLengths(new Set())}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
                      >
                        전체 해제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableLengths.map(length => {
                      const isOn = highlightedLengths.has(length);
                      return (
                        <button
                          key={length}
                          type="button"
                          onClick={() => toggleHighlightLength(length)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all w-full ${
                            isOn
                              ? 'bg-amber-400 border-amber-400 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {isOn ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                          {length}mm
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hideStatusFilters && onExpandFailClaim && (
            <div className="relative group/fail-claim-tip">
              <button
                onClick={() => isFailExpanded ? setShowFailAlreadyDoneToast(true) : setShowFailClaimModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 hover:border-rose-300 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                교환/청구 확장
              </button>
              <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/fail-claim-tip:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                <p className="font-bold text-rose-300 mb-1">📋 교환 항목 확장</p>
                <p>수술기록지 작성 시 수술 중 교환되는 픽스쳐를 별도 추적·관리하기 위해 필요합니다.</p>
                <p className="mt-1 text-slate-400">별도로 관리하신다면 확장하지 않아도 됩니다.</p>
                <p className="font-bold text-amber-300 mt-2.5 mb-1">🏥 보험청구 항목 추가</p>
                <p>보험청구 2단계 진행 시, 수술기록지에 픽스쳐 정보를 실수로 중복 입력하는 것을 방지합니다.</p>
                <p className="mt-2 pt-2 border-t border-slate-600 text-amber-200">⚠️ 초기에 설정하지 않으면 추후 데이터 불일치 발생 시 조정에 추가 기간·비용이 발생할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showFailClaimModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">교환/청구 항목 확장</h3>
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
                    <p className="text-xs font-bold text-slate-700">수술중교환 항목</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">각 항목의 제조사 앞에 "수술중교환_"을 붙인 복제본 <span className="font-bold text-slate-600">+{counts.active}개</span></p>
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
                  <p className="text-xs font-bold text-slate-500">총 예상 결과: <span className="text-indigo-600">{counts.active * 2 + 1}개</span> (기존 {counts.active} + 교환 {counts.active} + 보험청구 1)</p>
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

      {showFailAlreadyDoneToast && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden">
            <div className="p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1.5">이미 교환/청구 확장 완료</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                수술중교환 항목이 이미 추가되어 있습니다.<br />
                덴트웹에 반영하려면 아래 순서로 진행해 주세요.
              </p>
              <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-2.5 text-left mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-xs text-slate-700">아래 <span className="font-bold">STEP 6 — 엑셀 다운로드</span> 버튼으로 파일 저장</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-xs text-slate-700">덴트웹 <span className="font-bold">픽스쳐 설정 → 파일 불러오기</span>로 목록 업데이트</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-xs text-slate-700"><span className="font-bold">재고 마스터에 반영하기</span> 버튼 클릭</p>
                </div>
              </div>
            </div>
            <div className="px-7 pb-7">
              <button
                onClick={() => setShowFailAlreadyDoneToast(false)}
                className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all active:scale-95"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-420px)] min-h-[300px] custom-scrollbar">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="md:sticky md:top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr>
                {currentVisibleCols.map((col) => (
                  <th
                    key={col}
                    draggable
                    onDragStart={() => handleDragStart(col)}
                    onDragOver={(e) => handleDragOver(e, col)}
                    onDrop={(e) => handleDrop(e, col)}
                    onDragEnd={() => { setDraggedColumn(null); setDragOverColumn(null); }}
                    className={`px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-r border-slate-100 last:border-0 cursor-move transition-all ${
                      draggedColumn === col ? 'bg-indigo-50 opacity-50' : ''
                    } ${
                      dragOverColumn === col ? 'outline outline-2 outline-indigo-400 outline-offset-[-2px]' : ''
                    }`}
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
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={currentVisibleCols.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">해당하는 데이터가 없습니다</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map(({ row, index: originalIndex }) => {
                  const rowLength = highlightedLengths.size > 0 ? getRowLength(row) : '';
                  const isHighlighted = rowLength !== '' && highlightedLengths.has(rowLength);
                  return (
                    <tr key={originalIndex} className={`group/row transition-colors hover:bg-rose-50 ${isHighlighted ? 'bg-amber-50' : selectedIndices.has(originalIndex) ? 'bg-blue-50/30' : ''}`}>
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
                                  value={String(val ?? '')}
                                  onChange={(e) => onUpdateCell(originalIndex, col, e.target.value)}
                                  style={{ minWidth: isLongText ? '280px' : isToothNo ? '80px' : '60px' }}
                                  className={`w-full px-2 py-1 text-xs border-transparent hover:border-slate-200 focus:border-indigo-400 rounded outline-none bg-transparent whitespace-nowrap overflow-hidden text-ellipsis transition-all group-hover/row:font-bold ${isLongText ? 'font-medium' : ''} ${isPatientInfo ? 'patient-info-blur' : ''}`}
                                  readOnly={hideStatusFilters}
                                  title={isPatientInfo ? '환자 정보 보호' : String(val ?? '')}
                                />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExcelTable;
