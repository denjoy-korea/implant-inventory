/**
 * z-index 계층 상수
 *
 * 레이어 우선순위:
 *   TOOLTIP        — 툴팁, 팝오버
 *   PERSISTENT_UI  — 영구 UI (사이드바, 헤더, KakaoButton)
 *   DROPDOWN       — 드롭다운, 서브메뉴
 *   MOBILE_NAV     — 모바일 네비게이션 오버레이
 *   PWA_BAR        — PWA 업데이트 배너
 *   MODAL          — 표준 모달 (ConfirmModal, UpgradeModal, ReviewPopup)
 *   MODAL_STACK    — 모달 위에 열리는 모달 (ReturnCandidateModal 등)
 *   ALERT          — 오류/알림 (PlanLimitToast)
 *   FULLSCREEN     — 전체화면 오버레이 (파일업로드 로딩)
 */
export const Z = {
  TOOLTIP: 10,
  PERSISTENT_UI: 40,
  DROPDOWN: 50,
  MOBILE_NAV: 100,
  PWA_BAR: 120,
  MODAL: 200,
  MODAL_STACK: 300,
  ALERT: 250,
  FULLSCREEN: 340,
} as const;

export type ZLayer = keyof typeof Z;
