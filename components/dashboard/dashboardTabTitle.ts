import { DashboardTab } from '../../types';

const DASHBOARD_TAB_TITLES: Record<DashboardTab, string> = {
  overview: '대시보드 홈',
  fixture_upload: '로우데이터 업로드',
  fixture_edit: '데이터 설정/가공',
  inventory_master: '재고 마스터',
  inventory_audit: '재고 실사',
  surgery_database: '수술기록 DB',
  surgery_upload: '수술기록 업로드',
  fail_management: '교환 관리',
  order_management: '주문 관리',
  member_management: '구성원 관리',
  settings: '설정',
  audit_log: '감사 로그',
};

export function getDashboardTabTitle(tab: DashboardTab): string {
  return DASHBOARD_TAB_TITLES[tab] ?? '대시보드';
}
