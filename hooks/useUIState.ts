import { useEffect, useRef, useState } from 'react';
import type { DashboardTab } from '../types';

const SIDEBAR_AUTO_COLLAPSE_WIDTH = 1360;
const MOBILE_VIEWPORT_MAX_WIDTH = 767;

interface UseUIStateParams {
  showDashboardSidebar: boolean;
  showStandardDashboardHeader: boolean;
  dashboardHeaderRef: React.RefObject<HTMLElement | null>;
  dashboardTab: DashboardTab;
}

export function useUIState({
  showDashboardSidebar,
  showStandardDashboardHeader,
  dashboardHeaderRef,
  dashboardTab,
}: UseUIStateParams) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarToggleVisible, setIsSidebarToggleVisible] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileOrderNav, setMobileOrderNav] = useState<'order' | 'receipt'>('order');
  const [dashboardHeaderHeight, setDashboardHeaderHeight] = useState(44);
  const [isOffline, setIsOffline] = useState<boolean>(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ));

  // showMobileDashboardNav을 hook 안에서 파생 계산하여 순환 의존성 방지
  const showMobileDashboardNav = showDashboardSidebar && showStandardDashboardHeader && isNarrowViewport;

  // 대시보드 헤더 높이 동기화 (sticky 섹션 참조용)
  // dashboardTab은 ResizeObserver가 없을 때 탭 전환 시 재계산을 트리거하기 위해 deps에 포함
  const dashboardTabRef = useRef(dashboardTab);
  dashboardTabRef.current = dashboardTab;

  useEffect(() => {
    if (!showStandardDashboardHeader) return;
    const headerEl = dashboardHeaderRef.current;
    if (!headerEl) return;

    const syncHeaderHeight = () => {
      const measured = Math.round(headerEl.getBoundingClientRect().height);
      if (measured > 0) {
        setDashboardHeaderHeight(prev => (prev === measured ? prev : measured));
      }
    };

    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncHeaderHeight);
      observer.observe(headerEl);
    }

    return () => {
      window.removeEventListener('resize', syncHeaderHeight);
      observer?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStandardDashboardHeader, dashboardTab]);

  // 모바일 뷰포트 감지
  useEffect(() => {
    if (!showDashboardSidebar) {
      setIsMobileViewport(false);
      setIsMobileMenuOpen(false);
      return;
    }
    const mq = window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH}px)`);
    const sync = () => {
      const isMobile = mq.matches;
      setIsMobileViewport(isMobile);
      if (!isMobile) setIsMobileMenuOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [showDashboardSidebar]);

  // 네트워크 상태 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setIsOffline(!window.navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // 모바일 메뉴 열릴 때 스크롤 잠금
  useEffect(() => {
    if (!showMobileDashboardNav || !isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [showMobileDashboardNav, isMobileMenuOpen]);

  // 포인터(터치/마우스) 감지 — 사이드바 토글 버튼 노출 여부
  useEffect(() => {
    if (!showDashboardSidebar) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setIsFinePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [showDashboardSidebar]);

  // 좁은 화면 → 사이드바 자동 접기
  useEffect(() => {
    if (!showDashboardSidebar) {
      setIsSidebarToggleVisible(false);
      setIsNarrowViewport(false);
      return;
    }
    const sync = () => {
      const isNarrow = window.innerWidth <= SIDEBAR_AUTO_COLLAPSE_WIDTH;
      setIsNarrowViewport(isNarrow);
      if (isNarrow) setIsSidebarCollapsed(true);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [showDashboardSidebar]);

  // Notion 스타일 사이드바 단축키: Ctrl/Cmd + \
  useEffect(() => {
    if (!showDashboardSidebar) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== '\\') return;
      e.preventDefault();
      setIsSidebarCollapsed(prev => !prev);
      setIsSidebarToggleVisible(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showDashboardSidebar]);

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarToggleVisible,
    setIsSidebarToggleVisible,
    isFinePointer,
    isMobileViewport,
    isNarrowViewport,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    mobileOrderNav,
    setMobileOrderNav,
    dashboardHeaderHeight,
    isOffline,
    showMobileDashboardNav,
  };
}
