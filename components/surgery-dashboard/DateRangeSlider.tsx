import React, { useRef, useCallback, useState } from 'react';

interface DateRangeSliderProps {
  months: string[];
  startIdx: number;
  endIdx: number;
  onChange: (start: number, end: number) => void;
}

export default function DateRangeSlider({ months, startIdx, endIdx, onChange }: DateRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const count = months.length;
  if (count <= 1) return null;
  const maxIdx = count - 1;

  const getIdxFromX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * maxIdx);
  }, [maxIdx]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    trackRef.current?.setPointerCapture(e.pointerId);
    const idx = getIdxFromX(e.clientX);
    const distToStart = Math.abs(idx - startIdx);
    const distToEnd = Math.abs(idx - endIdx);

    let which: 'start' | 'end';
    if (distToStart < distToEnd) which = 'start';
    else if (distToEnd < distToStart) which = 'end';
    else which = idx < startIdx ? 'start' : 'end';

    setDragging(which);
    if (which === 'start') onChange(Math.min(idx, endIdx), endIdx);
    else onChange(startIdx, Math.max(idx, startIdx));
  }, [getIdxFromX, startIdx, endIdx, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const idx = getIdxFromX(e.clientX);
    if (dragging === 'start') onChange(Math.min(idx, endIdx), endIdx);
    else onChange(startIdx, Math.max(idx, startIdx));
  }, [dragging, getIdxFromX, startIdx, endIdx, onChange]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const startPct = (startIdx / maxIdx) * 100;
  const endPct = (endIdx / maxIdx) * 100;
  const isFullRange = startIdx === 0 && endIdx === maxIdx;
  const selectedCount = endIdx - startIdx + 1;

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return `${y}.${mo}`;
  };

  const formatLabel = (m: string, i: number) => {
    const [y, mo] = m.split('-');
    const moNum = parseInt(mo);
    const isYearStart = i === 0 || (i > 0 && months[i - 1]?.split('-')[0] !== y);
    if (isYearStart) return `'${y.slice(2)}.${moNum}`;
    return String(moNum);
  };

  const labelStep = count <= 13 ? 1 : count <= 24 ? 2 : 3;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-6 py-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-xs font-semibold text-slate-700">기간 필터</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Period Filter</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-lg">
            <span className="text-[11px] font-bold text-indigo-600 tabular-nums">{formatMonth(months[startIdx])}</span>
            <span className="text-[10px] text-indigo-300 font-light">~</span>
            <span className="text-[11px] font-bold text-indigo-600 tabular-nums">{formatMonth(months[endIdx])}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tabular-nums">{selectedCount}개월</span>
          {!isFullRange && (
            <button
              onClick={() => onChange(0, maxIdx)}
              className="text-[10px] text-slate-400 hover:text-indigo-500 font-medium transition-colors underline underline-offset-2 decoration-slate-200 hover:decoration-indigo-300"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="px-1.5">
        <div
          ref={trackRef}
          className="relative h-6 select-none touch-none cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Track background */}
          <div className="absolute top-[9px] left-0 right-0 h-[5px] bg-slate-100 rounded-full" />

          {/* Month tick marks */}
          {months.map((_, i) => {
            const pct = (i / maxIdx) * 100;
            const inRange = i >= startIdx && i <= endIdx;
            return (
              <div
                key={i}
                className={`absolute top-[10px] w-px h-[3px] -translate-x-[0.5px] transition-colors duration-100 ${
                  inRange ? 'bg-indigo-300' : 'bg-slate-200'
                }`}
                style={{ left: `${pct}%` }}
              />
            );
          })}

          {/* Selected range bar */}
          <div
            className="absolute top-[9px] h-[5px] rounded-full transition-[left,width] duration-75"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0, endPct - startPct)}%`,
              background: 'linear-gradient(90deg, #818CF8, #4F46E5)',
            }}
          />

          {/* Start thumb */}
          <div
            className={`absolute top-[4px] w-[15px] h-[15px] -ml-[7.5px] rounded-full bg-white border-2 border-indigo-500 transition-transform duration-100 z-10 ${
              dragging === 'start' ? 'scale-[1.3] shadow-lg shadow-indigo-200/60' : 'shadow-sm hover:scale-110'
            }`}
            style={{ left: `${startPct}%` }}
          >
            <div className="absolute inset-[3px] rounded-full bg-indigo-500" />
          </div>

          {/* End thumb */}
          <div
            className={`absolute top-[4px] w-[15px] h-[15px] -ml-[7.5px] rounded-full bg-white border-2 border-indigo-500 transition-transform duration-100 z-10 ${
              dragging === 'end' ? 'scale-[1.3] shadow-lg shadow-indigo-200/60' : 'shadow-sm hover:scale-110'
            }`}
            style={{ left: `${endPct}%` }}
          >
            <div className="absolute inset-[3px] rounded-full bg-indigo-500" />
          </div>
        </div>

        {/* Month labels */}
        <div className="relative h-3.5 -mt-0.5">
          {months.map((m, i) => {
            if (i % labelStep !== 0 && i !== maxIdx) return null;
            const pct = (i / maxIdx) * 100;
            const inRange = i >= startIdx && i <= endIdx;
            return (
              <span
                key={m}
                className={`absolute text-[8px] tabular-nums -translate-x-1/2 transition-colors duration-100 ${
                  inRange ? 'text-slate-500 font-medium' : 'text-slate-300'
                }`}
                style={{ left: `${pct}%` }}
              >
                {formatLabel(m, i)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
