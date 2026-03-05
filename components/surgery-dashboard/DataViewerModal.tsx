import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExcelRow } from '../../types';

const COLUMNS = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'] as const;
const COL_WIDTHS: Record<string, number> = { '날짜': 100, '환자정보': 100, '치아번호': 65, '갯수': 45, '수술기록': 320, '구분': 80, '제조사': 100, '브랜드': 100, '규격(SIZE)': 100, '골질': 60, '초기고정': 60 };
const PAGE_SIZE = 50;

function getKoreanWeekday(dateValue: unknown): string | null {
  const raw = String(dateValue || '').trim();
  if (!raw) return null;

  // Prefer date-only parsing to avoid timezone day shifts from Date string parsing.
  const datePart = raw.slice(0, 10);
  const match = datePart.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  let parsed: Date | null = null;

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) parsed = localDate;
  } else {
    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) parsed = fallback;
  }

  if (!parsed) return null;
  const days = ['일', '월', '화', '수', '목', '금', '토'] as const;
  return days[parsed.getDay()];
}

const DataViewerModal: React.FC<{ rows: ExcelRow[]; initialDayFilter: string | null; onClose: () => void }> = ({ rows, initialDayFilter, onClose }) => {
  const [search, setSearch] = useState('');
  const [filterCol, setFilterCol] = useState<string>('전체');
  const [filterCls, setFilterCls] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(initialDayFilter);
  const [page, setPage] = useState(0);
  const COL_SETTINGS_KEY = 'dentweb_data_viewer_col_settings';
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try { const s = JSON.parse(localStorage.getItem(COL_SETTINGS_KEY) || ''); return new Set(s.visible as string[]); } catch { return new Set(COLUMNS); }
  });
  const [colOrder, setColOrder] = useState<string[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(COL_SETTINGS_KEY) || ''); return s.order as string[]; } catch { return [...COLUMNS]; }
  });
  const [showColFilter, setShowColFilter] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const saveColSettings = () => {
    localStorage.setItem(COL_SETTINGS_KEY, JSON.stringify({ visible: [...visibleCols], order: colOrder }));
    setShowSaveConfirm(false);
  };

  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); }
      else next.add(col);
      return next;
    });
  };

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setColOrder(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(dragOverIdx, 0, moved);
        return next;
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const displayCols = colOrder.filter(c => visibleCols.has(c));

  const filtered = useMemo(() => {
    let result = rows;
    if (dayFilter) {
      result = result.filter(row => {
        const weekday = getKoreanWeekday(row['날짜']);
        return weekday === dayFilter;
      });
    }
    if (filterCls) {
      result = result.filter(row => String(row['구분'] || '') === filterCls);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(row => {
        if (filterCol === '전체') {
          return COLUMNS.some(col => String(row[col] || '').toLowerCase().includes(q));
        }
        return String(row[filterCol] || '').toLowerCase().includes(q);
      });
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortCol] ?? '');
        const bv = String(b[sortCol] ?? '');
        const an = Number(av);
        const bn = Number(bv);
        const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv, 'ko');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, filterCol, filterCls, dayFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, filterCol, filterCls, dayFilter, sortCol, sortDir]);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      const enabledFocusable = focusable.filter((el) => !el.hasAttribute('disabled'));

      if (enabledFocusable.length === 0) return;

      const first = enabledFocusable[0];
      const last = enabledFocusable[enabledFocusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 구분별 집계 (청구·골이식만은 갯수 0으로 처리)
  const summary = useMemo(() => {
    const noUsageTypes = new Set(['청구', '골이식만']);
    const counts = new Map<string, { rows: number; qty: number }>();
    rows.forEach(row => {
      const cls = String(row['구분'] || '기타');
      const qty = noUsageTypes.has(cls) ? 0 : (Number(row['갯수']) || 0);
      const prev = counts.get(cls) || { rows: 0, qty: 0 };
      counts.set(cls, { rows: prev.rows + 1, qty: prev.qty + qty });
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b, 'ko'));
  }, [rows]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white w-full max-w-6xl h-[85vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="surgery-data-viewer-title"
        aria-describedby="surgery-data-viewer-desc"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="surgery-data-viewer-title" className="text-lg font-black text-slate-900">수술기록 데이터 조회</h3>
              {dayFilter && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md border border-indigo-200 flex items-center gap-1.5">
                  {dayFilter}요일
                  <button onClick={() => setDayFilter(null)} className="hover:text-indigo-900 focus:outline-none">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
            </div>
            <p id="surgery-data-viewer-desc" className="text-xs text-slate-400 mt-0.5">{filtered.length}건의 레코드 (총 {rows.length}건)</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="데이터 조회 모달 닫기" className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary Strip + Classification Filter */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 gap-4">
          <div className="flex flex-wrap gap-3">
            {summary.map(([cls, { rows: cnt, qty }]) => {
              const noUsage = cls === '청구' || cls === '골이식만';
              return (
                <div key={cls} className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-xs whitespace-nowrap">
                  <span className="font-bold text-slate-700">{cls}</span>
                  <span className="text-slate-400 mx-1.5">|</span>
                  {noUsage ? (
                    <span className="text-slate-500">{cnt}건</span>
                  ) : (
                    <span className="font-bold text-indigo-600">갯수합계 {qty}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-nowrap shrink-0 overflow-x-auto gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {([null, '식립', '수술중교환', '청구', '골이식만'] as const).map(cls => {
              const active = filterCls === cls;
              const colors: Record<string, string> = { '식립': 'bg-indigo-600 text-white', '수술중교환': 'bg-rose-500 text-white', '청구': 'bg-teal-500 text-white', '골이식만': 'bg-amber-500 text-white' };
              const label = cls === null ? '전체' : cls === '수술중교환' ? '교환' : cls;
              return (
                <button key={label} onClick={() => setFilterCls(cls)} className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? (cls === null ? 'bg-slate-800 text-white' : colors[cls]) : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <select
            value={filterCol}
            onChange={e => setFilterCol(e.target.value)}
            className="px-3 py-2 text-base sm:text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 outline-none focus:border-indigo-400"
          >
            <option value="전체">전체 컬럼</option>
            {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색어 입력..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 text-slate-700"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">검색결과 {filtered.length}건</span>
          {/* Column visibility toggle + Save */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowColFilter(p => !p)}
                aria-label="컬럼 설정 열기"
                className={`p-2 rounded-lg border transition-all ${showColFilter ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                title="컬럼 설정"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
              {showColFilter && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {colOrder.map((col, idx) => (
                    <div
                      key={col}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-1 px-2 py-1.5 text-xs transition-colors ${dragOverIdx === idx ? 'bg-indigo-50 border-t-2 border-indigo-300' : 'hover:bg-slate-50'} ${dragIdx === idx ? 'opacity-40' : ''}`}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>
                      </span>
                      <button
                        onClick={() => toggleCol(col)}
                        className="shrink-0 p-0.5"
                        aria-label={`${col} 컬럼 ${visibleCols.has(col) ? '숨기기' : '보이기'}`}
                      >
                        {visibleCols.has(col) ? (
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        )}
                      </button>
                      <span className={`font-medium flex-1 ${visibleCols.has(col) ? 'text-slate-700' : 'text-slate-400'}`}>{col}</span>
                      <span className="text-[9px] text-slate-300 tabular-nums w-4 text-right">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSaveConfirm(true)}
              aria-label="컬럼 설정 저장 열기"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
              title="컬럼 설정 저장"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto" onClick={() => showColFilter && setShowColFilter(false)}>
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: 40 }} />
              {displayCols.map(col => (
                <col key={col} style={{ width: COL_WIDTHS[col] || 100 }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 text-center border-b border-slate-200">#</th>
                {displayCols.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {sortCol === col ? (
                        <svg className="w-3 h-3 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {sortDir === 'asc'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((row, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-3 py-2 text-[10px] text-slate-300 text-center tabular-nums">{page * PAGE_SIZE + i + 1}</td>
                  {displayCols.map(col => {
                    const rowCls = String(row['구분'] || '');
                    const noUsage = rowCls === '청구' || rowCls === '골이식만';
                    const isQty = col === '갯수';
                    const isCls = col === '구분';
                    let displayVal = isQty && noUsage ? '0' : String(row[col] ?? '');
                    if (col === '환자정보' && displayVal) {
                      displayVal = displayVal
                        .replace(/^(.)(.+?)(?=\()/, (_m, first, rest) => first + '*'.repeat(rest.length))
                        .replace(/\((\d+)\)/, (_m, nums) => '(' + '*'.repeat(nums.length) + ')');
                    }
                    return (
                      <td key={col} className={`px-3 py-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap ${isQty ? 'text-center font-black tabular-nums' : ''} ${isCls ? 'font-bold' : 'text-slate-600'} ${isCls && rowCls === '식립' ? 'text-indigo-600' : ''} ${isCls && rowCls === '수술중교환' ? 'text-rose-500' : ''} ${isCls && rowCls === '청구' ? 'text-teal-600' : ''} ${isCls && rowCls === '골이식만' ? 'text-amber-600' : ''} ${isQty && !noUsage && Number(displayVal) > 1 ? 'text-rose-600 bg-rose-50/50' : ''}`} title={displayVal}>
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <span className="text-xs text-slate-400 font-medium tabular-nums">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}

        {/* Save Confirm Modal */}
        {showSaveConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-[24px]" onClick={() => setShowSaveConfirm(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="save-col-settings-title"
              aria-describedby="save-col-settings-desc"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                </div>
                <h4 id="save-col-settings-title" className="text-base font-black text-slate-900 mb-1">컬럼 설정 저장</h4>
                <p id="save-col-settings-desc" className="text-sm text-slate-500">현재 컬럼 표시/순서 설정을 저장합니다.<br />다음에 다시 열어도 이 설정이 유지됩니다.</p>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">취소</button>
                <button onClick={saveColSettings} className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-100 transition-all">저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataViewerModal;
