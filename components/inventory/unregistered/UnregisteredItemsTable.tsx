import React from 'react';

export interface UnregisteredListItem {
  rowKey: string;
  manufacturer: string;
  canonicalManufacturer: string;
  resolvedManufacturerFromExisting: boolean;
  brand: string;
  size: string;
  reason?: string;
  canRegister: boolean;
  preferredManualFixSize: string;
  usageCount: number;
  registerBlockReason: string | null;
  samples?: Array<{ date: string; patientMasked: string; chartNumber: string }>;
  parsedDimensions: { diameter: number | null; length: number | null; cuff: string | null };
  dimensionalMatchInfo: 'exact_match' | 'dim_in_brand' | 'new_dim' | 'parse_fail' | 'no_inventory';
}

interface UnregisteredItemsTableProps {
  filteredUnregistered: UnregisteredListItem[];
  isManualOnlyUnregisteredView: boolean;
  isReadOnly?: boolean;
  hasManualResolver: boolean;
  registeringUnregistered: Record<string, boolean>;
  onOpenManualFix: (item: UnregisteredListItem) => void;
  onRegister: (item: UnregisteredListItem) => void;
}

const UnregisteredItemsTable: React.FC<UnregisteredItemsTableProps> = ({
  filteredUnregistered,
  isManualOnlyUnregisteredView,
  isReadOnly,
  hasManualResolver,
  registeringUnregistered,
  onOpenManualFix,
  onRegister,
}) => {
  if (filteredUnregistered.length === 0) {
    return (
      <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-slate-400 font-semibold">
        검색 결과가 없습니다.
      </div>
    );
  }

  if (isManualOnlyUnregisteredView) {
    return (
      <table className="w-full text-left border-collapse table-fixed">
        <thead className="md:sticky md:top-0 bg-slate-50 border-b border-slate-200 z-10">
          <tr>
            <th className="w-[80px] px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">No</th>
            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">수정 대상 기록</th>
            <th className="w-[156px] px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">수정</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredUnregistered.map((item, idx) => (
            <tr key={item.rowKey} className="hover:bg-amber-50/40 transition-colors">
              <td className="px-4 py-3 text-sm font-black text-slate-400 text-center tabular-nums whitespace-nowrap align-top">
                {idx + 1}
              </td>
              <td className="px-4 py-3 align-top">
                {item.samples && item.samples.length > 0 ? (
                  <div className="space-y-1.5">
                    {item.reason === 'non_list_input' && (
                      <p className="text-[11px] font-black text-rose-500 break-keep whitespace-normal">
                        입력 형식: {item.manufacturer} - {item.brand} - {item.size}
                      </p>
                    )}
                    {item.samples.slice(0, 3).map((sample, sampleIdx) => (
                      <p key={`${item.rowKey}-manual-sample-${sampleIdx}`} className="text-base font-black text-slate-600 leading-tight break-keep whitespace-normal">
                        {sample.date} · {sample.patientMasked} ({sample.chartNumber})
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-300">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                {item.reason === 'non_list_input' ? (
                  <button
                    onClick={() => onOpenManualFix(item)}
                    disabled={isReadOnly || !hasManualResolver}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                      !isReadOnly && hasManualResolver
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    수정
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-300">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-left border-collapse table-fixed text-[12px]">
      <thead className="md:sticky md:top-0 bg-slate-50 border-b border-slate-200 z-10">
        <tr>
          <th className="w-[56px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">No</th>
          <th className="w-[92px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">제조사</th>
          <th className="w-[100px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">브랜드</th>
          <th className="w-[132px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">규격</th>
          <th className="w-[176px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">일치 여부</th>
          <th className="w-[92px] px-3 py-3 text-[10px] font-bold text-amber-600 uppercase tracking-wider text-right whitespace-nowrap">누적 사용</th>
          <th className="w-[196px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">등록</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredUnregistered.map((item, idx) => (
          <tr
            key={item.rowKey}
            className={`hover:bg-amber-50/40 transition-colors ${item.dimensionalMatchInfo === 'parse_fail' ? 'bg-rose-50/20' : ''}`}
          >
            <td className="px-3 py-3 text-xs font-black text-slate-400 text-center tabular-nums whitespace-nowrap align-top">{idx + 1}</td>
            <td className="px-3 py-3 whitespace-nowrap align-top">
              <p className="text-[11px] font-bold text-slate-500">{item.manufacturer}</p>
              {item.resolvedManufacturerFromExisting && (
                <p className="text-[10px] font-semibold text-indigo-500 mt-0.5 break-keep whitespace-normal leading-tight">
                  등록 제조사: {item.canonicalManufacturer}
                </p>
              )}
            </td>
            <td className="px-3 py-3 text-[13px] font-black text-slate-800 whitespace-nowrap align-top">{item.brand}</td>
            <td className="px-3 py-3 align-top">
              <p className="text-[13px] font-semibold text-slate-600 whitespace-nowrap">{item.size}</p>
              {item.reason === 'non_list_input' && item.canRegister && item.preferredManualFixSize !== item.size && (
                <p className="text-[10px] font-semibold text-indigo-500 mt-0.5 break-keep whitespace-normal leading-tight">
                  → {item.preferredManualFixSize}
                </p>
              )}
            </td>
            <td className="px-3 py-3 align-top">
              <span
                className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black ${
                  item.dimensionalMatchInfo === 'exact_match'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.dimensionalMatchInfo === 'dim_in_brand'
                    ? 'bg-teal-100 text-teal-700'
                    : item.dimensionalMatchInfo === 'new_dim'
                    ? 'bg-amber-100 text-amber-700'
                    : item.dimensionalMatchInfo === 'parse_fail'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.dimensionalMatchInfo === 'exact_match' ? '치수 일치'
                  : item.dimensionalMatchInfo === 'dim_in_brand' ? '범위내 일치'
                  : item.dimensionalMatchInfo === 'new_dim' ? '신규 치수'
                  : item.dimensionalMatchInfo === 'parse_fail' ? '파싱 불가'
                  : '기준 없음'}
              </span>
              {item.dimensionalMatchInfo === 'parse_fail' ? (
                <p className="text-[10px] font-semibold text-rose-500 mt-1 break-keep whitespace-normal leading-tight">
                  규격 형식 미인식
                </p>
              ) : item.dimensionalMatchInfo === 'no_inventory' ? (
                <p className="text-[10px] font-semibold text-slate-400 mt-1 break-keep whitespace-normal leading-tight">
                  재고 없음 — 신규 등록
                </p>
              ) : (
                <p className="text-[10px] font-semibold text-slate-500 mt-1 break-keep whitespace-normal leading-tight">
                  {item.parsedDimensions.diameter}mm × {item.parsedDimensions.length}mm
                  {item.parsedDimensions.cuff ? ` C${item.parsedDimensions.cuff}` : ''}
                </p>
              )}
            </td>
            <td className="px-3 py-3 text-right whitespace-nowrap align-top">
              <span className="inline-flex px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-black text-amber-700 tabular-nums whitespace-nowrap">
                {item.usageCount.toLocaleString()}개
              </span>
            </td>
            <td className="px-3 py-3 text-right align-top">
              <div className="flex flex-col items-end gap-1">
                {item.reason === 'non_list_input' && !item.canRegister && (
                  <button
                    onClick={() => onOpenManualFix(item)}
                    disabled={isReadOnly || !hasManualResolver}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                      !isReadOnly && hasManualResolver
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    수정
                  </button>
                )}
                <button
                  onClick={() => onRegister(item)}
                  disabled={
                    !item.canRegister ||
                    !!registeringUnregistered[item.rowKey] ||
                    (item.reason === 'non_list_input' && !hasManualResolver)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    item.canRegister && !registeringUnregistered[item.rowKey] && !(item.reason === 'non_list_input' && !hasManualResolver)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {registeringUnregistered[item.rowKey]
                    ? (item.reason === 'non_list_input' ? '수정 중...' : '등록 중...')
                    : item.canRegister
                    ? (item.reason === 'non_list_input' ? '일괄 수정' : '목록 등록')
                    : '등록 불가'}
                </button>
                {!item.canRegister && (
                  <p className="max-w-[196px] text-[10px] font-semibold text-rose-500 break-keep whitespace-normal text-right leading-tight">
                    {item.registerBlockReason}
                  </p>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UnregisteredItemsTable;
