import { supabase } from './supabaseClient';

// ─── Types ───────────────────────────────────────

export interface CouponTemplate {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number;
  valid_days: number | null;
  applicable_plans: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  hospital_id: string;
  template_id: string;
  source_code_id: string | null;
  source_type: 'partner' | 'promo' | 'admin';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number;
  used_count: number;
  issued_at: string;
  expires_at: string | null;
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
  template?: CouponTemplate;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  hospital_id: string;
  billing_id: string | null;
  billing_cycle: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  redeemed_at: string;
}

export interface DiscountPreview {
  coupon_id: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  remaining_uses: number;
}

export interface CouponStats {
  total: number;
  active: number;
  exhausted: number;
  expired: number;
  revoked: number;
  totalUsed: number;
}

export interface RedemptionStats {
  totalRedemptions: number;
  totalDiscountAmount: number;
}

export interface ChannelStat {
  channel: string;
  totalCodes: number;
  activeCodes: number;
  totalVerifications: number;
  signups: number;
}

// ─── Service ─────────────────────────────────────

export const couponService = {
  // ── 템플릿 관리 (admin) ──

  async listTemplates(): Promise<CouponTemplate[]> {
    const { data, error } = await supabase
      .from('coupon_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error('쿠폰 템플릿 목록 조회 실패');
    return (data || []) as CouponTemplate[];
  },

  async createTemplate(params: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays?: number | null;
    applicablePlans?: string[];
  }): Promise<CouponTemplate> {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('coupon_templates')
      .insert({
        name: params.name,
        description: params.description || null,
        discount_type: params.discountType,
        discount_value: params.discountValue,
        max_uses: params.maxUses,
        valid_days: params.validDays ?? null,
        applicable_plans: params.applicablePlans || [],
        created_by: authData.user?.id || null,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('쿠폰 템플릿 생성 실패');
    return data as CouponTemplate;
  },

  async updateTemplate(id: string, params: Partial<{
    name: string;
    description: string | null;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays: number | null;
    applicablePlans: string[];
    isActive: boolean;
  }>): Promise<CouponTemplate> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) update.name = params.name;
    if (params.description !== undefined) update.description = params.description;
    if (params.discountType !== undefined) update.discount_type = params.discountType;
    if (params.discountValue !== undefined) update.discount_value = params.discountValue;
    if (params.maxUses !== undefined) update.max_uses = params.maxUses;
    if (params.validDays !== undefined) update.valid_days = params.validDays;
    if (params.applicablePlans !== undefined) update.applicable_plans = params.applicablePlans;
    if (params.isActive !== undefined) update.is_active = params.isActive;

    const { data, error } = await supabase
      .from('coupon_templates')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error('쿠폰 템플릿 수정 실패');
    return data as CouponTemplate;
  },

  // ── 사용자 쿠폰 ──

  async listUserCoupons(hospitalId: string): Promise<UserCoupon[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, template:coupon_templates(*)')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('쿠폰 목록 조회 실패');
    return (data || []) as UserCoupon[];
  },

  async getAvailableCoupons(hospitalId: string): Promise<UserCoupon[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, template:coupon_templates(*)')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('expires_at', { ascending: true, nullsFirst: false });
    if (error) throw new Error('사용 가능 쿠폰 조회 실패');
    const now = new Date();
    return ((data || []) as UserCoupon[]).filter(c =>
      c.used_count < c.max_uses &&
      (!c.expires_at || new Date(c.expires_at) > now)
    );
  },

  async revokeCoupon(couponId: string): Promise<void> {
    const { error } = await supabase
      .from('user_coupons')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', couponId);
    if (error) throw new Error('쿠폰 회수 실패');
  },

  // ── 할인 미리보기 (클라이언트 참고용) ──

  previewDiscount(coupon: UserCoupon, originalAmount: number): DiscountPreview {
    let discountAmount: number;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(originalAmount * coupon.discount_value / 100);
    } else {
      discountAmount = Math.min(coupon.discount_value, originalAmount);
    }
    const finalAmount = Math.max(originalAmount - discountAmount, 0);

    return {
      coupon_id: coupon.id,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      remaining_uses: coupon.max_uses - coupon.used_count,
    };
  },

  // ── 사용 이력 ──

  async listRedemptions(hospitalId: string): Promise<CouponRedemption[]> {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('redeemed_at', { ascending: false })
      .limit(200);
    if (error) throw new Error('쿠폰 사용 이력 조회 실패');
    return (data || []) as CouponRedemption[];
  },

  // ── 통계 (admin) ──

  async getCouponStats(): Promise<CouponStats> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('status, discount_amount, used_count');
    if (error) throw new Error('쿠폰 통계 조회 실패');
    const rows = (data || []) as { status: string; discount_amount: number; used_count: number }[];
    const stats: CouponStats = { total: rows.length, active: 0, exhausted: 0, expired: 0, revoked: 0, totalUsed: 0 };
    for (const r of rows) {
      if (r.status === 'active') stats.active++;
      else if (r.status === 'exhausted') stats.exhausted++;
      else if (r.status === 'expired') stats.expired++;
      else if (r.status === 'revoked') stats.revoked++;
      stats.totalUsed += r.used_count || 0;
    }
    return stats;
  },

  async getRedemptionStats(): Promise<RedemptionStats> {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('discount_amount');
    if (error) throw new Error('쿠폰 사용 통계 조회 실패');
    const rows = (data || []) as { discount_amount: number }[];
    return {
      totalRedemptions: rows.length,
      totalDiscountAmount: rows.reduce((sum, r) => sum + (r.discount_amount || 0), 0),
    };
  },

  async getChannelStats(): Promise<ChannelStat[]> {
    const { data, error } = await supabase
      .from('beta_invite_codes')
      .select('channel, code_type, is_active, verify_count, used_at')
      .eq('code_type', 'partner');
    if (error) throw new Error('채널 통계 조회 실패');
    const rows = (data || []) as { channel: string | null; is_active: boolean; verify_count: number; used_at: string | null }[];
    const map = new Map<string, ChannelStat>();
    for (const r of rows) {
      const ch = r.channel || '(미지정)';
      const existing = map.get(ch) || { channel: ch, totalCodes: 0, activeCodes: 0, totalVerifications: 0, signups: 0 };
      existing.totalCodes++;
      if (r.is_active) existing.activeCodes++;
      existing.totalVerifications += r.verify_count || 0;
      if (r.used_at) existing.signups++;
      map.set(ch, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.signups - a.signups);
  },
};
