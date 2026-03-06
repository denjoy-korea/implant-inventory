import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { InventoryItem } from '../types';
import { auditService, AuditEntry, AuditHistoryItem } from '../services/auditService';
import { operationLogService } from '../services/operationLogService';
import { useToast } from './useToast';
import { isExchangePrefix } from '../services/appUtils';

const MISMATCH_REASONS = ['기록 누락', '수술기록 오입력', '분실', '입고 수량 오류', '기타'] as const;

interface UseInventoryAuditParams {
  inventory: InventoryItem[];
  hospitalId: string;
  userName?: string;
  onApplied: () => void;
  onAuditSessionComplete?: () => void;
  showHistory?: boolean;
  onCloseHistory?: () => void;
}

export function useInventoryAudit({
  inventory,
  hospitalId,
  userName,
  onApplied,
  onAuditSessionComplete,
  showHistory,
  onCloseHistory,
}: UseInventoryAuditParams) {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeManufacturer, setActiveManufacturer] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<Record<string, { matched: boolean; actualCount?: number; reason?: string }>>({});
  const [showAuditSummary, setShowAuditSummary] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isAuditActive, setIsAuditActive] = useState(false);
  const [customReasonMode, setCustomReasonMode] = useState<Record<string, boolean>>({});
  const [confirmedItems, setConfirmedItems] = useState<string[]>([]);
  const confirmedItemsSet = useMemo(() => new Set(confirmedItems), [confirmedItems]);
  const [expandedAuditKeys, setExpandedAuditKeys] = useState<Set<string>>(new Set());
  const { toast, showToast } = useToast();
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const summaryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!hospitalId) return;
    setIsHistoryLoading(true);
    const data = await auditService.getAuditHistory(hospitalId);
    setAuditHistory(data);
    setIsHistoryLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  // 이력을 실사일+담당자 기준으로 그룹핑
  const groupedHistory = useMemo(() => {
    // 같은 날 같은 사람이 여러 번 실사할 수 있으므로 created_at 분 단위로 세션 분리
    const groups: Record<string, { date: string; createdAt: string; performedBy: string | null; items: AuditHistoryItem[] }> = {};
    auditHistory.forEach(h => {
      const sessionMinute = h.createdAt.substring(0, 16); // "2026-02-20T16:02"
      const key = `${sessionMinute}__${h.performedBy || ''}`;
      if (!groups[key]) groups[key] = { date: h.auditDate, createdAt: h.createdAt, performedBy: h.performedBy ?? null, items: [] };
      groups[key].items.push(h);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt));
  }, [auditHistory]);

  const toggleExpand = (key: string) => {
    setExpandedAuditKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleInventory = useMemo(() => {
    return inventory.filter(item =>
      !isExchangePrefix(item.manufacturer) && item.manufacturer !== '보험청구' && item.brand !== '보험임플란트'
    );
  }, [inventory]);

  const manufacturersList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  const brandsList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory
      .filter(item => activeManufacturer === null || item.manufacturer === activeManufacturer)
      .forEach(item => { if (item.brand) set.add(item.brand); });
    return Array.from(set).sort();
  }, [visibleInventory, activeManufacturer]);

  useEffect(() => {
    if (activeBrand === null && brandsList.length > 0) {
      setActiveBrand(brandsList[0]);
    }
  }, [brandsList, activeBrand]);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleInventory
      .filter(item => activeManufacturer === null || item.manufacturer === activeManufacturer)
      .filter(item => activeBrand === null || item.brand === activeBrand)
      .filter(item => {
        if (!q) return true;
        return (
          item.brand.toLowerCase().includes(q) ||
          item.size.toLowerCase().includes(q) ||
          item.manufacturer.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, activeBrand, activeManufacturer, searchQuery]);

  // KPI: 완료(confirmedItems) 기준 — 불일치 항목은 완료 버튼 클릭 후에만 카운팅
  const { totalItems, totalAudited, totalMatched, totalMismatched, totalMismatchedQty, progressPct } = useMemo(() => {
    const items = filteredInventory.length;
    const confirmed = filteredInventory.filter(i => confirmedItemsSet.has(i.id));
    const matched = confirmed.filter(i => auditResults[i.id]?.matched).length;
    const mismatchedEntries = confirmed.filter(i => auditResults[i.id] && !auditResults[i.id].matched);
    const mismatchedQty = mismatchedEntries.reduce((sum, i) => {
      const r = auditResults[i.id];
      return sum + Math.abs((r.actualCount ?? 0) - (i.currentStock ?? 0));
    }, 0);
    return {
      totalItems: items,
      totalAudited: confirmed.length,
      totalMatched: matched,
      totalMismatched: mismatchedEntries.length,
      totalMismatchedQty: mismatchedQty,
      progressPct: items > 0 ? Math.round((confirmed.length / items) * 100) : 0,
    };
  }, [filteredInventory, auditResults, confirmedItemsSet]);

  // 불일치 item 상세 (배너용) — 완료된 항목만
  const mismatchItems = useMemo(() => {
    return filteredInventory
      .filter(i => confirmedItemsSet.has(i.id) && auditResults[i.id] && !auditResults[i.id].matched)
      .map(i => ({ id: i.id, result: auditResults[i.id], item: i }));
  }, [auditResults, filteredInventory, confirmedItemsSet]);

  // 브랜드별 실사 통계 (탭 dot 색 계산용) — 완료 기준
  const brandStats = useMemo(() => {
    const stats: Record<string, { total: number; audited: number; mismatch: number }> = {};
    visibleInventory.forEach(item => {
      if (!stats[item.brand]) stats[item.brand] = { total: 0, audited: 0, mismatch: 0 };
      stats[item.brand].total++;
      if (confirmedItemsSet.has(item.id)) {
        stats[item.brand].audited++;
        if (auditResults[item.id] && !auditResults[item.id].matched) stats[item.brand].mismatch++;
      }
    });
    return stats;
  }, [visibleInventory, auditResults, confirmedItemsSet]);

  const auditedCount = Object.keys(auditResults).length;
  const pendingAuditItems = useMemo(
    () => filteredInventory.filter(item => !confirmedItemsSet.has(item.id)),
    [filteredInventory, confirmedItemsSet]
  );

  // 브랜드 내 모든 항목 완료(confirmedItems) 시 자동으로 다음 브랜드로 이동
  useEffect(() => {
    if (!isAuditActive || activeBrand === null) return;
    const brandItems = visibleInventory.filter(i => i.brand === activeBrand);
    if (brandItems.length === 0) return;
    const allConfirmed = brandItems.every(i => confirmedItemsSet.has(i.id));
    if (!allConfirmed) return;
    const allBrandsDone = brandsList.every(b => {
      const bItems = visibleInventory.filter(i => i.brand === b);
      return bItems.length === 0 || bItems.every(i => confirmedItemsSet.has(i.id));
    });
    if (allBrandsDone) {
      const timer = setTimeout(() => setActiveBrand(null), 600);
      return () => clearTimeout(timer);
    }
    const currentIdx = brandsList.indexOf(activeBrand);
    const nextBrand = brandsList[currentIdx + 1];
    if (!nextBrand) return;
    const timer = setTimeout(() => setActiveBrand(nextBrand), 600);
    return () => clearTimeout(timer);
  }, [confirmedItemsSet, activeBrand, brandsList, isAuditActive, visibleInventory]);

  const handleAuditComplete = useCallback(() => setShowAuditSummary(true), []);
  const handleAuditClose = useCallback(() => { setAuditResults({}); setShowAuditSummary(false); setIsAuditActive(false); setCustomReasonMode({}); setConfirmedItems([]); }, []);

  useEffect(() => {
    if (showAuditSummary) summaryCloseButtonRef.current?.focus();
  }, [showAuditSummary]);

  // AuditSummary 포커스 트랩 + ESC는 ModalShell이 자동 처리

  const handleApply = async () => {
    setIsApplying(true);
    try {
      let entries: AuditEntry[];
      if (mismatchItems.length > 0) {
        entries = mismatchItems
          .map(({ id, result }): AuditEntry | null => {
            const item = inventory.find(i => i.id === id);
            if (!item) return null;
            const actualStock = result.actualCount ?? item.currentStock;
            return {
              inventoryId: id,
              systemStock: item.currentStock,
              actualStock,
              difference: actualStock - item.currentStock,
              reason: result.reason || MISMATCH_REASONS[0],
              performedBy: userName,
            };
          })
          .filter((e): e is AuditEntry => e !== null);
      } else {
        const firstItem = visibleInventory[0];
        entries = firstItem ? [{
          inventoryId: firstItem.id,
          systemStock: firstItem.currentStock,
          actualStock: firstItem.currentStock,
          difference: 0,
          reason: null,
          performedBy: userName,
        }] : [];
      }
      const mismatchCount = mismatchItems.length;
      const { success, error } = await auditService.applyAudit(hospitalId, entries);
      if (success) {
        operationLogService.logOperation('inventory_audit', `재고 실사 적용: 불일치 ${mismatchCount}건`, { mismatchCount });
        showToast(mismatchCount > 0 ? `실사 완료: 불일치 ${mismatchCount}건 반영` : '실사 완료: 전 품목 일치', 'success');
        handleAuditClose();
        loadHistory();
        onApplied();
        onAuditSessionComplete?.();
      } else {
        showToast(`실사 적용 실패: ${error}`, 'error');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const getBrandDotColor = (brand: string) => {
    const s = brandStats[brand];
    if (!s || s.audited === 0) return 'bg-slate-300';
    if (s.mismatch > 0) return 'bg-rose-500';
    if (s.audited === s.total) return 'bg-emerald-500';
    return 'bg-indigo-400';
  };

  return {
    activeBrand, setActiveBrand,
    searchQuery, setSearchQuery,
    activeManufacturer, setActiveManufacturer,
    auditResults, setAuditResults,
    showAuditSummary, setShowAuditSummary,
    isApplying,
    isAuditActive, setIsAuditActive,
    customReasonMode, setCustomReasonMode,
    confirmedItems, setConfirmedItems,
    confirmedItemsSet,
    expandedAuditKeys,
    toast, showToast,
    auditHistory,
    isMobileViewport,
    isHistoryLoading,
    groupedHistory,
    visibleInventory,
    manufacturersList,
    brandsList,
    filteredInventory,
    totalItems, totalAudited, totalMatched, totalMismatched, totalMismatchedQty, progressPct,
    mismatchItems,
    brandStats,
    auditedCount,
    pendingAuditItems,
    loadHistory,
    toggleExpand,
    handleAuditComplete,
    handleAuditClose,
    handleApply,
    getBrandDotColor,
    summaryCloseButtonRef,
  };
}
