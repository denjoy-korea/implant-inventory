import React from 'react';
import { ExcelData, PlanType } from '../../types';
import FeatureGate from '../FeatureGate';
import FixtureWorkflowGuide from '../FixtureWorkflowGuide';
import ManufacturerToggle from '../ManufacturerToggle';
import BrandChart from '../BrandChart';
import LengthFilter from '../LengthFilter';
import ExcelTable from '../ExcelTable';

interface DashboardFixtureEditSectionProps {
  fixtureData: ExcelData | null;
  selectedFixtureIndices: Record<string, Set<number>>;
  inventoryCount: number;
  effectivePlan: PlanType;
  enabledManufacturers: string[];
  hasSavedPoint: boolean;
  isDirtyAfterSave: boolean;
  restoreToast: 'idle' | 'restored';
  saveToast: 'idle' | 'saved';
  formattedSavedAt: string | null;
  restoreDiffCount: number;
  restorePanelRef: React.RefObject<HTMLDivElement | null>;
  onManufacturerToggle: (manufacturer: string, isActive: boolean) => void;
  onBulkToggle: (filters: Record<string, string>, targetUnused: boolean) => void;
  onLengthToggle: (normalizedTarget: string, setUnused: boolean) => void;
  onRestoreToSavedPoint: () => void;
  onSaveSettings: () => boolean;
  onUpdateFixtureCell: (index: number, column: string, value: boolean | string | number) => void;
  onFixtureSheetChange: (sheetName: string) => void;
  onExpandFailClaim: () => void;
  onRequestDownloadExcel: () => void;
  onRequestApplyToInventory: () => void;
  onGoToFixtureUpload: () => void;
}

const DashboardFixtureEditSection: React.FC<DashboardFixtureEditSectionProps> = ({
  fixtureData,
  selectedFixtureIndices,
  inventoryCount,
  effectivePlan,
  enabledManufacturers,
  hasSavedPoint,
  isDirtyAfterSave,
  restoreToast,
  saveToast,
  formattedSavedAt,
  restoreDiffCount,
  restorePanelRef,
  onManufacturerToggle,
  onBulkToggle,
  onLengthToggle,
  onRestoreToSavedPoint,
  onSaveSettings,
  onUpdateFixtureCell,
  onFixtureSheetChange,
  onExpandFailClaim,
  onRequestDownloadExcel,
  onRequestApplyToInventory,
  onGoToFixtureUpload,
}) => {
  const activeSheet = fixtureData?.sheets?.[fixtureData?.activeSheetName ?? ''];

  if (!fixtureData || !activeSheet) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
          <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">등록된 데이터가 없습니다</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
            현재 픽스쳐 데이터가 비어 있습니다.<br />
            <span className="font-semibold text-indigo-600">로우데이터 업로드</span> 메뉴에서 엑셀 파일을 업로드해주세요.
          </p>
        </div>
        <button
          onClick={onGoToFixtureUpload}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
        >
          <span className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </span>
          <span>로우데이터 업로드하러 가기</span>
        </button>
      </div>
    );
  }

  const completedSteps = (() => {
    const rows = activeSheet.rows;
    const steps: number[] = [];

    // STEP 1: 제조사 선택 — 사용안함 처리된 제조사가 1개 이상
    const mfrs = new Set(rows.map(r => String(r['제조사'] || '')));
    const disabledMfrs = new Set(rows.filter(r => r['사용안함'] === true).map(r => String(r['제조사'] || '')));
    if (disabledMfrs.size > 0 || enabledManufacturers.length < mfrs.size) steps.push(1);

    // STEP 2: 브랜드 필터링 — 사용안함 처리된 브랜드가 존재
    const unusedBrands = rows.some(r => r['사용안함'] === true);
    if (unusedBrands) steps.push(2);

    // STEP 3: 길이 필터링
    if (unusedBrands) steps.push(3);

    // STEP 5: 교환/청구 확장
    const hasFailRows = rows.some(r => String(r['제조사'] || '').startsWith('수술중교환_'));
    if (hasFailRows) steps.push(5);

    // STEP 7: 재고 마스터 반영
    if (inventoryCount > 0) steps.push(7);

    return steps;
  })();

  const activeManufacturers = Array.from(new Set(
    activeSheet.rows
      .filter(r => r['사용안함'] !== true)
      .map(r => String(r['제조사'] || ''))
      .filter(m => m && !m.startsWith('수술중교환_') && m !== '보험청구')
  )).sort();

  const selectedIndices = selectedFixtureIndices[fixtureData.activeSheetName] || new Set<number>();

  return (
    <div className="space-y-6">
      <FixtureWorkflowGuide completedSteps={completedSteps} />

      <ManufacturerToggle
        sheet={activeSheet}
        onToggle={onManufacturerToggle}
      />

      <FeatureGate feature="brand_analytics" plan={effectivePlan}>
        <BrandChart
          data={activeSheet}
          enabledManufacturers={enabledManufacturers}
          onToggleBrand={(manufacturer, brand, unused) => onBulkToggle({ '제조사': manufacturer, '브랜드': brand }, unused)}
          onToggleAllBrands={(manufacturer, unused) => onBulkToggle({ '제조사': manufacturer }, unused)}
        />
      </FeatureGate>

      <LengthFilter sheet={activeSheet} onToggleLength={onLengthToggle} />

      <div ref={restorePanelRef}>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-100 ${isDirtyAfterSave && hasSavedPoint ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">복구 지점</span>
            </div>
            <div className="flex items-center gap-2">
              {formattedSavedAt && (
                <span className="text-[11px] text-slate-400 font-medium">{formattedSavedAt} 저장</span>
              )}
              {isDirtyAfterSave && hasSavedPoint && restoreDiffCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  {restoreDiffCount}개 변경됨
                </span>
              )}
              {!isDirtyAfterSave && hasSavedPoint && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  저장 상태와 동일
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 p-4">
            {hasSavedPoint && (
              <button
                type="button"
                onClick={onRestoreToSavedPoint}
                disabled={!isDirtyAfterSave || restoreDiffCount === 0}
                title={!isDirtyAfterSave || restoreDiffCount === 0 ? '저장 지점과 동일한 상태입니다' : `${restoreDiffCount}개 항목을 저장 지점으로 복구합니다`}
                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 whitespace-nowrap ${restoreToast === 'restored'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                  : isDirtyAfterSave && restoreDiffCount > 0
                    ? 'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.99] shadow-sm cursor-pointer'
                    : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
              >
                {restoreToast === 'restored' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    복구 완료
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {restoreDiffCount > 0 ? `저장 지점으로 복구 (${restoreDiffCount}개)` : '복구'}
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onSaveSettings}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${saveToast === 'saved'
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                : isDirtyAfterSave || !hasSavedPoint
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 active:scale-[0.99] shadow-md shadow-indigo-100'
                  : 'bg-slate-100 border-slate-100 text-slate-400 hover:bg-slate-200 hover:border-slate-200 active:scale-[0.99]'
                }`}
            >
              {saveToast === 'saved' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  저장 완료
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {isDirtyAfterSave || !hasSavedPoint ? '지금 상태로 저장' : '저장됨'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ExcelTable
        data={fixtureData}
        selectedIndices={selectedIndices}
        onToggleSelect={() => {}}
        onToggleAll={() => {}}
        onUpdateCell={onUpdateFixtureCell}
        onSheetChange={onFixtureSheetChange}
        onExpandFailClaim={onExpandFailClaim}
        activeManufacturers={activeManufacturers}
      />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">다음 단계</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRequestDownloadExcel}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            STEP 6 — 엑셀 다운로드 (덴트웹용)
          </button>
          <button
            onClick={onRequestApplyToInventory}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            STEP 7 — 재고 마스터 반영
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFixtureEditSection;
