export type AdminTab =
  | 'overview'
  | 'hospitals'
  | 'users'
  | 'reset_requests'
  | 'manual'
  | 'plan_management'
  | 'reviews'
  | 'analysis_leads'
  | 'inquiries'
  | 'waitlist'
  | 'plan_change_requests'
  | 'traffic'
  | 'content'
  | 'consultations'
  | 'integrations';

const ADMIN_TAB_TITLES: Record<AdminTab, string> = {
  overview: '시스템 개요',
  hospitals: '병원 관리',
  users: '전체 회원 관리',
  reset_requests: '초기화 요청 관리',
  manual: '사용자 매뉴얼',
  plan_management: '플랜 관리',
  reviews: '고객 후기 관리',
  inquiries: '문의내역 관리',
  waitlist: '대기자 관리',
  plan_change_requests: '플랜 변경 신청',
  analysis_leads: '분석 리드 관리',
  traffic: '방문자 트래픽',
  content: '콘텐츠 관리',
  consultations: '상담 관리',
  integrations: '연동 설정',
};

export function getAdminTabTitle(tab: AdminTab): string {
  return ADMIN_TAB_TITLES[tab];
}
