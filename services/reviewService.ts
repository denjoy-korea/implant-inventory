import { supabase } from './supabaseClient';

export type ReviewType = 'initial' | '6month';
export type ReviewRole = '원장' | '실장' | '팀장' | '스탭';

export interface UserReview {
  id: string;
  user_id: string;
  review_type: ReviewType;
  rating: number;
  content: string;
  display_last_name: string | null;
  display_role: ReviewRole | null;
  display_hospital: string | null;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewWritableStatus {
  canInitial: boolean;     // 첫 후기 작성 가능
  can6Month: boolean;      // 6개월 후기 작성 가능
  hasInitial: boolean;     // 첫 후기 작성 완료
  has6Month: boolean;      // 6개월 후기 작성 완료
}

/** "김ㅇㅇ 원장 / 서울치과" 형식 변환 유틸 */
export function formatReviewDisplayName(
  lastName: string | null,
  role: ReviewRole | null,
  hospital: string | null,
): { line1: string; line2: string | null } {
  if (!lastName?.trim()) return { line1: '익명', line2: null };
  const name = `${lastName.trim()}ㅇㅇ`;
  return {
    line1: role ? `${name} ${role}` : name,
    line2: hospital?.trim() || null,
  };
}

const SNOOZE_KEY_PREFIX = 'review_snooze_';
const SNOOZE_DAYS = 7;
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export const reviewService = {
  /** 내 후기 목록 조회 */
  async getMyReviews(userId: string): Promise<UserReview[]> {
    const { data, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as UserReview[];
  },

  /** 공개 후기 목록 (홈 표시용) */
  async getPublicReviews(limit = 12): Promise<UserReview[]> {
    const { data, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as UserReview[];
  },

  /** 기능소개 섹션 노출 후기 조회 (공개 + featured) */
  async getFeaturedReviews(): Promise<UserReview[]> {
    const { data, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('is_featured', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserReview[];
  },

  /** 관리자용 전체 후기 조회 */
  async getAllReviews(): Promise<UserReview[]> {
    const { data, error } = await supabase
      .from('user_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserReview[];
  },

  /** 팝업 표시 여부 판단 (DB 작성 여부 + 스누즈 확인) */
  async checkWritable(userId: string, accountCreatedAt: string): Promise<ReviewWritableStatus> {
    const { data, error } = await supabase
      .from('user_reviews')
      .select('review_type')
      .eq('user_id', userId);
    if (error) throw error;

    const written = new Set((data ?? []).map((r: { review_type: string }) => r.review_type));
    const hasInitial = written.has('initial');
    const has6Month = written.has('6month');

    const accountAge = Date.now() - new Date(accountCreatedAt).getTime();
    const is10DayEligible = accountAge >= TEN_DAYS_MS;
    const is6MonthEligible = accountAge >= SIX_MONTHS_MS;

    return {
      canInitial: !hasInitial && is10DayEligible,
      can6Month: !has6Month && is6MonthEligible,
      hasInitial,
      has6Month,
    };
  },

  /** 후기 작성 */
  async createReview(params: {
    userId: string;
    reviewType: ReviewType;
    rating: number;
    content: string;
    displayLastName?: string;
    displayRole?: ReviewRole;
    displayHospital?: string;
  }): Promise<UserReview> {
    const { data, error } = await supabase
      .from('user_reviews')
      .insert({
        user_id: params.userId,
        review_type: params.reviewType,
        rating: params.rating,
        content: params.content.trim(),
        display_last_name: params.displayLastName?.trim() || null,
        display_role: params.displayRole || null,
        display_hospital: params.displayHospital?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as UserReview;
  },

  /** 후기 수정 (본인만) */
  async updateReview(id: string, params: {
    rating: number;
    content: string;
    displayLastName?: string;
    displayRole?: ReviewRole;
    displayHospital?: string;
    isPublic?: boolean;
  }): Promise<UserReview> {
    const { data, error } = await supabase
      .from('user_reviews')
      .update({
        rating: params.rating,
        content: params.content.trim(),
        display_last_name: params.displayLastName?.trim() || null,
        display_role: params.displayRole || null,
        display_hospital: params.displayHospital?.trim() || null,
        ...(params.isPublic !== undefined ? { is_public: params.isPublic } : {}),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as UserReview;
  },

  /** 관리자 기능소개 노출 토글 */
  async toggleFeatured(id: string, isFeatured: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_reviews')
      .update({ is_featured: isFeatured })
      .eq('id', id);
    if (error) throw error;
  },

  /** 관리자 공개/비공개 토글 */
  async togglePublic(id: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_reviews')
      .update({ is_public: isPublic })
      .eq('id', id);
    if (error) throw error;
  },

  /** 관리자 삭제 */
  async deleteReview(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_reviews')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── 스누즈 (localStorage) ──────────────────────────────

  getSnoozedUntil(userId: string, reviewType: ReviewType): Date | null {
    try {
      const raw = localStorage.getItem(`${SNOOZE_KEY_PREFIX}${userId}_${reviewType}`);
      if (!raw) return null;
      const until = new Date(raw);
      return isNaN(until.getTime()) ? null : until;
    } catch {
      return null;
    }
  },

  isSnoozed(userId: string, reviewType: ReviewType): boolean {
    const until = this.getSnoozedUntil(userId, reviewType);
    if (!until) return false;
    return Date.now() < until.getTime();
  },

  snooze(userId: string, reviewType: ReviewType, days = SNOOZE_DAYS): void {
    try {
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      localStorage.setItem(`${SNOOZE_KEY_PREFIX}${userId}_${reviewType}`, until.toISOString());
    } catch {}
  },

  clearSnooze(userId: string, reviewType: ReviewType): void {
    try {
      localStorage.removeItem(`${SNOOZE_KEY_PREFIX}${userId}_${reviewType}`);
    } catch {}
  },
};
