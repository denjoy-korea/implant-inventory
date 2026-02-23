import { supabase } from './supabaseClient';

/** 브라우저 세션당 고유 ID (sessionStorage 기반, PII 없음) */
function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem('denjoy_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('denjoy_sid', sid);
    }
    return sid;
  } catch {
    return 'unknown';
  }
}

/** 공개 페이지 이름 목록 — 내부 대시보드 뷰는 제외 */
const PUBLIC_PAGES = new Set([
  'landing', 'pricing', 'analyze', 'contact', 'value', 'login', 'signup',
]);

type EventData = Record<string, unknown>;

function getClientContext(): EventData {
  try {
    if (typeof window === 'undefined') return {};
    const viewportWidth = typeof window.innerWidth === 'number' ? window.innerWidth : null;
    const isMobile = typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 1279px)').matches
      : (typeof viewportWidth === 'number' ? viewportWidth <= 1279 : null);
    return {
      is_mobile: isMobile,
      viewport_width: viewportWidth,
    };
  } catch {
    return {};
  }
}

export const pageViewService = {
  /** 페이지 뷰 기록 (fire-and-forget, 실패 시 조용히 무시) */
  track(page: string): void {
    if (!PUBLIC_PAGES.has(page)) return;
    supabase.from('page_views').insert({
      page,
      event_type: `${page}_view`,
      event_data: getClientContext(),
      session_id: getSessionId(),
      referrer: document.referrer || null,
    }).then(undefined, () => {});
  },

  /**
   * 로그인 성공 시 호출 — 현재 세션의 page_views에 user_id를 기록해
   * "방문 후 로그인" 전환을 추적한다. fire-and-forget.
   */
  markConverted(userId: string, accountId?: string | null): void {
    const sid = getSessionId();
    if (!sid || sid === 'unknown') return;
    const payload: { user_id: string; account_id?: string } = { user_id: userId };
    if (accountId && accountId.trim()) {
      payload.account_id = accountId.trim();
    }
    supabase
      .from('page_views')
      .update(payload)
      .eq('session_id', sid)
      .is('user_id', null)
      .then(undefined, () => {});
  },

  /**
   * 페이지 내 UI 이벤트 추적 (fire-and-forget)
   * event_type 예: 'pricing_waitlist_button_click', 'pricing_waitlist_submit_success'
   * event_data 예: { plan: 'plus' }
   */
  trackEvent(event_type: string, event_data?: EventData, page = 'pricing'): void {
    const normalizedPage = PUBLIC_PAGES.has(page) ? page : 'landing';
    const context = getClientContext();
    supabase.from('page_views').insert({
      page: normalizedPage,
      event_type,
      event_data: event_data ? { ...event_data, ...context } : context,
      session_id: getSessionId(),
      referrer: document.referrer || null,
    }).then(undefined, () => {});
  },

  /** 관리자용: 전체 데이터 삭제 (테스트용) */
  async deleteAll(): Promise<void> {
    const { error } = await supabase.from('page_views').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  /** 관리자용: 최근 N일 데이터 조회 */
  async getRecent(days = 90): Promise<{ page: string; session_id: string | null; user_id: string | null; referrer: string | null; event_type: string | null; event_data: Record<string, unknown> | null; created_at: string }[]> {
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data, error } = await supabase
      .from('page_views')
      .select('page, session_id, user_id, referrer, event_type, event_data, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as { page: string; session_id: string | null; user_id: string | null; referrer: string | null; event_type: string | null; event_data: Record<string, unknown> | null; created_at: string }[];
  },
};
