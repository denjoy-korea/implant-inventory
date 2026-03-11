import React, { useRef, useState, useEffect } from 'react';
import { InventoryItem, ExcelData, Order, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem, CreateReturnParams } from '../types';
import { planService } from '../services/planService';
import { useInventoryManagerControls } from '../hooks/useInventoryManagerControls';
import { useSparklineSeries } from '../hooks/useSparklineSeries';
import { useInventoryManagerData } from '../hooks/useInventoryManagerData';
import { useInventoryManagerFilteredData } from '../hooks/useInventoryManagerFilteredData';
import { isExchangePrefix, stripExchangePrefix } from '../services/appUtils';
import AddItemModal from './AddItemModal';
import BaseStockModal from './inventory/BaseStockModal';
import OptimizeModal from './inventory/OptimizeModal';
import UnregisteredDetailModal from './inventory/UnregisteredDetailModal';
import InventoryDetailSection from './inventory/InventoryDetailSection';
import InventoryDashboardCards from './inventory/InventoryDashboardCards';
import InventoryUsageChart from './inventory/InventoryUsageChart';
import SectionLockCard from './surgery-dashboard/SectionLockCard';
import InventoryManufacturerFilterStrip from './inventory/InventoryManufacturerFilterStrip';
interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateStock: (id: string, initialStock: number, nextCurrentStock?: number) => void | Promise<void>;
  onBulkUpdateStocks?: (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => Promise<void>;
  onDeleteInventoryItem: (id: string) => void;
  onAddInventoryItem: (newItem: InventoryItem) => boolean | void | Promise<boolean | void>;
  onUpdateInventoryItem: (updatedItem: InventoryItem) => void;
  surgeryData?: ExcelData | null;
  orders?: Order[];
  onQuickOrder?: (item: InventoryItem) => void | Promise<void>;
  onCreateReturn?: (params: CreateReturnParams) => Promise<void>;
  managerName?: string;
  isReadOnly?: boolean;
  userId?: string;
  hospitalId?: string;
  plan?: PlanType;
  unregisteredFromSurgery?: SurgeryUnregisteredItem[];
  onRefreshLatestSurgeryUsage?: () => Promise<Record<string, number> | null>;
  onResolveManualInput?: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }) => Promise<{
    checked: number;
    found: number;
    applicable: number;
    alreadyFixed: number;
    updated: number;
    failed: number;
    notFound: number;
    appliedManufacturer: string;
    appliedBrand: string;
    appliedSize: string;
  }>;
  initialShowBaseStockEdit?: boolean;
  onBaseStockEditApplied?: () => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onUpdateStock,
  onBulkUpdateStocks,
  onDeleteInventoryItem,
  onAddInventoryItem,
  onUpdateInventoryItem,
  surgeryData,
  orders = [],
  onQuickOrder,
  onCreateReturn,
  managerName,
  isReadOnly,
  userId,
  hospitalId,
  plan = 'free',
  unregisteredFromSurgery = [],
  onRefreshLatestSurgeryUsage,
  onResolveManualInput,
  initialShowBaseStockEdit,
  onBaseStockEditApplied,
}) => {
  const maxEdits = PLAN_LIMITS[plan].maxBaseStockEdits;
  const isUnlimited = maxEdits === Infinity;
  const canAiForecast = planService.canAccess(plan, 'ai_forecast');
  const canBrandAnalytics = planService.canAccess(plan, 'brand_analytics');
  const canOrderOptimization = planService.canAccess(plan, 'order_optimization');
  const canUnregisteredDetail = planService.canAccess(plan, 'return_management'); // Plus+
  const {
    monthFactor,
    saveStatus,
    selectedManufacturer,
    isAddingItem,
    showBaseStockModal,
    showUnregisteredDetailModal,
    showOptimizeModal,
    showOnlyOrderNeededRows,
    showInventoryDetailColumnFilter,
    inventoryDetailColumnVisibility,
    editCount,
    setMonthFactor,
    setSelectedManufacturer,
    setShowBaseStockModal,
    setShowUnregisteredDetailModal,
    setShowOptimizeModal,
    setShowOnlyOrderNeededRows,
    setShowInventoryDetailColumnFilter,
    toggleInventoryDetailColumn,
    handleBaseStockSaved,
    saveMonthFactorForAll,
    openAddItemModal,
    closeAddItemModal,
  } = useInventoryManagerControls({
    hospitalId,
    isUnlimited,
  });
  const isEditExhausted = !isUnlimited && editCount >= maxEdits;

  const {
    visibleInventory,
    hiddenCategoryCount,
    manufacturersList,
    pendingOrderKeys,
    deadStockItems,
    unregisteredUsageTotal,
    preferredUnregisteredViewMode,
    sparklineMonths,
  } = useInventoryManagerData({ inventory, orders, plan, unregisteredFromSurgery });

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (initialShowBaseStockEdit && !isEditExhausted) {
      // 온보딩에서 진입 시 EditNoticeModal 건너뛰고 바로 편집 화면으로
      setShowBaseStockModal(true);
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    filteredInventory,
    inventoryDetailRows,
    inventoryDetailVisibleColumnCount,
    inventoryDetailUsageTotal,
    inventoryDetailCurrentStockTotal,
    mobileOrderNeededItems,
    chartData,
    maxUsage,
    kpiData,
    supplyCoverageData,
    surgeryBreakdown,
  } = useInventoryManagerFilteredData({
    visibleInventory,
    selectedManufacturer,
    monthFactor,
    showOnlyOrderNeededRows,
    inventoryDetailColumnVisibility,
    pendingOrderKeys,
    surgeryData,
  });

  const sparklineSeriesByItemId = useSparklineSeries(chartData, surgeryData, sparklineMonths);

  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStickyHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header + KPI: 데스크톱 스크롤 영역 (틀고정 없음) */}
      <InventoryDashboardCards
        filteredInventoryCount={filteredInventory.length}
        visibleInventory={visibleInventory}
        hiddenCategoryCount={hiddenCategoryCount}
        monthFactor={monthFactor}
        setMonthFactor={setMonthFactor}
        saveMonthFactorForAll={saveMonthFactorForAll}
        saveStatus={saveStatus}
        isReadOnly={isReadOnly}
        hospitalId={hospitalId}
        isEditExhausted={isEditExhausted}
        isUnlimited={isUnlimited}
        maxEdits={maxEdits}
        editCount={editCount}
        deadStockCount={deadStockItems.length}
        kpiData={kpiData}
        surgeryBreakdown={surgeryBreakdown}
        onShowOptimizeModal={canOrderOptimization ? () => setShowOptimizeModal(true) : undefined}
        onShowBaseStockModal={() => setShowBaseStockModal(true)}
        onOpenAddItemModal={openAddItemModal}
      />

      {/* Sticky: 모바일 요약 요약바 + 데스크톱 제조사 필터 고정 */}
      <div
        ref={stickyRef}
        className="sticky z-20 -mt-2 bg-slate-50/80 backdrop-blur-md pb-3"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
      >
        {/* 모바일 전용 컴팩트 요약 바 */}
        <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
          <div>
            {kpiData.shortageCount > 0 ? (
              <>
                <p className="text-xs font-black text-slate-800">발주 필요</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  <span className="text-rose-600 font-black">{kpiData.shortageCount}종</span>
                  {' · 총 '}
                  <span className="text-rose-600 font-black">{kpiData.shortageDeficit}개</span>
                  {' 부족'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-black text-emerald-700">재고 정상</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">부족 품목 없음</p>
              </>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
            {monthFactor}개월 기준
          </span>
        </div>

        {/* 모바일 전용: 품목 최적화 진입 카드 (sticky 영역) — order_optimization (Plus+) */}
        {!isReadOnly && deadStockItems.length > 0 && canOrderOptimization && (
          <button
            type="button"
            onClick={() => setShowOptimizeModal(true)}
            className="md:hidden w-full bg-white rounded-2xl border border-amber-200 shadow-sm px-4 py-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12l-3-3m0 0l-3 3m3-3v6" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800">품목 최적화</p>
                  <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                    장기 미사용 <span className="font-black">{deadStockItems.length}종</span> 검토 필요
                  </p>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* C. Manufacturer Filter Strip */}
        <InventoryManufacturerFilterStrip
          selectedManufacturer={selectedManufacturer}
          onSelectManufacturer={setSelectedManufacturer}
          visibleInventory={visibleInventory}
          manufacturersList={manufacturersList}
          monthFactor={monthFactor}
        />
      </div>{/* end sticky wrapper */}

      {unregisteredFromSurgery.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-2xl p-4 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-amber-800 tracking-tight flex items-center gap-1.5">
                수술기록 미등록/비정형 품목 {unregisteredFromSurgery.length}종 감지
                <span className="relative group/unregistered-why inline-flex items-center">
                  <svg className="w-3.5 h-3.5 text-amber-600 cursor-help flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/unregistered-why:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p className="font-bold text-amber-300 mb-1">감지 유형</p>
                    <p><span className="font-semibold text-white">① 미등록</span> — 수술기록지에 나온 제조사·브랜드·규격이 재고 마스터 목록에 없는 경우</p>
                    <p className="mt-1"><span className="font-semibold text-white">② 비정형(수기 입력)</span> — 덴트웹에서 픽스쳐를 드롭다운 목록이 아닌 직접 타이핑으로 입력한 경우. 규격 형식이 표준과 달라 자동 매칭이 되지 않습니다.</p>
                  </div>
                </span>
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                재고 마스터 미등록 또는 목록 외 수기 입력으로 감지된 품목입니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-white/80 border border-amber-200 text-[11px] font-bold text-amber-700">
                  누적 사용 {unregisteredUsageTotal.toLocaleString()}개
                </div>
                {canUnregisteredDetail ? (
                  <button
                    onClick={() => {
                      setShowUnregisteredDetailModal(true);
                    }}
                    className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all"
                  >
                    <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
                    </span>
                    <svg className="w-3.5 h-3.5 text-white/90 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    상세보기
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] leading-none">
                      {unregisteredFromSurgery.length}종
                    </span>
                  </button>
                ) : (
                  <div className="relative group/plus-gate inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-200 text-slate-400 text-[11px] font-black cursor-not-allowed select-none">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    상세보기
                    <span className="px-1.5 py-0.5 rounded-full bg-white/60 text-[10px] leading-none">
                      {unregisteredFromSurgery.length}종
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 w-max bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover/plus-gate:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Plus 플랜부터 이용 가능
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-amber-700">
                미등록 품목 확인 후 바로 목록 등록
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unregisteredFromSurgery.slice(0, 8).map((item) => {
              const label = `${item.manufacturer} / ${item.brand} ${item.size}`;
              return (
                <span
                  key={label}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold text-amber-800"
                  title={label}
                >
                  {item.brand} {item.size} · {item.usageCount}개
                </span>
              );
            })}
            {unregisteredFromSurgery.length > 8 && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold text-amber-700">
                +{unregisteredFromSurgery.length - 8}종 더 있음
              </span>
            )}
          </div>
        </div>
      )}

      <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">재고 부족 현황</h3>
          {mobileOrderNeededItems.length > 0 && (
            <span className="text-[11px] font-black text-rose-600">{mobileOrderNeededItems.length}종</span>
          )}
        </div>

        {mobileOrderNeededItems.length === 0 ? (
          <p className="mt-3 text-xs font-semibold text-slate-400">현재 부족 항목이 없습니다.</p>
        ) : (
          <>
            <div className="mt-3 space-y-2">
              {mobileOrderNeededItems.map(({ item, recommended, deficit, alreadyOrdered }) => (
                <article
                  key={`mobile-shortage-${item.id}`}
                  className={`rounded-xl border px-3 py-2.5 ${alreadyOrdered ? 'border-slate-100 bg-slate-50/60 opacity-60' : 'border-rose-100 bg-rose-50/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500 truncate">{item.manufacturer}</p>
                      <p className="text-sm font-black text-slate-800 truncate">{item.brand} {item.size}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        현재 {item.currentStock} / 권장 {recommended}
                      </p>
                      {canAiForecast && item.predictedDailyUsage != null && item.predictedDailyUsage > 0 && (() => {
                        const days = item.currentStock > 0 ? Math.floor(item.currentStock / item.predictedDailyUsage) : 0;
                        const color = days <= 7 ? 'text-rose-500' : days <= 14 ? 'text-amber-500' : 'text-emerald-600';
                        return (
                          <p className={`text-[10px] font-black mt-0.5 ${color}`}>
                            약 {days}일 후 소진 예상
                          </p>
                        );
                      })()}
                    </div>
                    {alreadyOrdered ? (
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 shrink-0">
                        발주됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-600 shrink-0">
                        부족 {deficit}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              발주는 하단 주문 탭에서 진행하세요
            </p>
          </>
        )}
      </div>

      {canBrandAnalytics ? (
        <InventoryUsageChart
          chartData={chartData}
          maxUsage={maxUsage}
          selectedManufacturer={selectedManufacturer}
          monthFactor={monthFactor}
          canAiForecast={canAiForecast}
          sparklineSeriesByItemId={sparklineSeriesByItemId}
          supplyCoverageData={supplyCoverageData}
        />
      ) : (
        <SectionLockCard
          title="규격별 사용량 분석"
          desc="제조사·브랜드별 사용 현황과 소진 속도를 차트로 확인하세요."
          requiredPlan="Plus"
          onUpgrade={undefined}
        />
      )}

      <div className="hidden md:block">
        <InventoryDetailSection
          inventoryDetailRows={inventoryDetailRows}
          monthFactor={monthFactor}
          isReadOnly={isReadOnly}
          onQuickOrder={onQuickOrder}
          showOnlyOrderNeededRows={showOnlyOrderNeededRows}
          onToggleShowOnlyOrderNeededRows={() => setShowOnlyOrderNeededRows(prev => !prev)}
          showInventoryDetailColumnFilter={showInventoryDetailColumnFilter}
          onToggleInventoryDetailColumnFilter={() => setShowInventoryDetailColumnFilter(prev => !prev)}
          onCloseInventoryDetailColumnFilter={() => setShowInventoryDetailColumnFilter(false)}
          inventoryDetailColumnVisibility={inventoryDetailColumnVisibility}
          onToggleInventoryDetailColumn={toggleInventoryDetailColumn}
          inventoryDetailUsageTotal={inventoryDetailUsageTotal}
          inventoryDetailCurrentStockTotal={inventoryDetailCurrentStockTotal}
          inventoryDetailVisibleColumnCount={inventoryDetailVisibleColumnCount}
          stickyTopOffset={stickyHeight}
        />
      </div>

      {/* ================================================= */}
      {/* 품목 최적화 Modal                                 */}
      {/* ================================================= */}
      {showOptimizeModal && (
        <OptimizeModal
          deadStockItems={deadStockItems}
          onDeleteInventoryItem={onDeleteInventoryItem}
          onUpdateInventoryItem={onUpdateInventoryItem}
          onCreateReturn={onCreateReturn}
          managerName={managerName}
          hospitalId={hospitalId}
          onClose={() => setShowOptimizeModal(false)}
        />
      )}

      {/* ================================================= */}
      {/* Add Item Modal                                    */}
      {/* ================================================= */}
      {isAddingItem && (
        <AddItemModal
          inventory={inventory}
          onAdd={async (newItem) => {
            const added = await Promise.resolve(onAddInventoryItem(newItem));
            if (added === false) return;
            // FAIL 연동 품목 자동 생성 (미존재 시에만)
            const failAlreadyExists = inventory.some(
              i => isExchangePrefix(i.manufacturer) &&
                stripExchangePrefix(i.manufacturer) === newItem.manufacturer &&
                i.brand === newItem.brand &&
                i.size === newItem.size
            );
            if (!failAlreadyExists) {
              const failItem: InventoryItem = {
                ...newItem,
                id: `manual_fail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                manufacturer: `수술중교환_${newItem.manufacturer}`,
                initialStock: 0,
                stockAdjustment: 0,
                currentStock: 0,
              };
              await Promise.resolve(onAddInventoryItem(failItem));
            }
            closeAddItemModal();
          }}
          onClose={closeAddItemModal}
        />
      )}

      {/* ================================================= */}
      {/* Base Stock Modal                                  */}
      {/* ================================================= */}
      {showBaseStockModal && (
        <BaseStockModal
          visibleInventory={visibleInventory}
          isUnlimited={isUnlimited}
          editCount={editCount}
          maxEdits={maxEdits}
          hospitalId={hospitalId}
          onRefreshLatestSurgeryUsage={onRefreshLatestSurgeryUsage}
          onBulkUpdateStocks={onBulkUpdateStocks}
          onUpdateStock={onUpdateStock}
          onClose={() => setShowBaseStockModal(false)}
          onAfterSave={(serverCount) => {
            handleBaseStockSaved(serverCount);
            if (autoOpenedRef.current) {
              autoOpenedRef.current = false;
              onBaseStockEditApplied?.();
            }
          }}
        />
      )}

      {/* ================================================= */}
      {/* Unregistered Detail Modal                         */}
      {/* ================================================= */}
      {showUnregisteredDetailModal && (
        <UnregisteredDetailModal
          unregisteredFromSurgery={unregisteredFromSurgery}
          visibleInventory={visibleInventory}
          inventory={inventory}
          isReadOnly={isReadOnly}
          onAddInventoryItem={onAddInventoryItem}
          onResolveManualInput={onResolveManualInput}
          onClose={() => setShowUnregisteredDetailModal(false)}
          initialViewMode={preferredUnregisteredViewMode}
        />
      )}

    </div>
  );
};

export default InventoryManager;
