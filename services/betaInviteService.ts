import { supabase } from './supabaseClient';
import { normalizeBetaInviteCode } from '../utils/betaSignupPolicy';

export interface BetaInviteCodeRow {
  id: string;
  code: string;
  distributed_to: string | null;
  distributed_contact: string | null;
  note: string | null;
  is_active: boolean;
  verify_count: number;
  last_verified_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BetaCodeVerifyResult {
  ok: boolean;
  message: string;
}

interface CreateBetaCodeParams {
  distributedTo?: string;
  distributedContact?: string;
  note?: string;
  expiresAt?: string | null;
}

interface UpdateBetaCodeMetaParams {
  distributedTo?: string;
  distributedContact?: string;
  note?: string;
}

function buildRandomSegment(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateBetaInviteCode(): string {
  return `BETA-${buildRandomSegment(4)}-${buildRandomSegment(4)}`;
}

export const betaInviteService = {
  async verifyCode(rawCode: string): Promise<BetaCodeVerifyResult> {
    const code = normalizeBetaInviteCode(rawCode);
    if (!code) {
      return { ok: false, message: '초대 코드를 입력해주세요.' };
    }

    const { data, error } = await supabase.rpc('verify_beta_invite_code', {
      p_code: code,
    });

    if (error) {
      return { ok: false, message: '코드 검증에 실패했습니다. 잠시 후 다시 시도해주세요.' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row && typeof row === 'object') {
      const ok = Boolean((row as { ok?: boolean }).ok);
      const message = String((row as { message?: string }).message || (ok ? '확인되었습니다.' : '유효하지 않은 코드입니다.'));
      return { ok, message };
    }

    return { ok: false, message: '코드 검증 응답이 올바르지 않습니다.' };
  },

  async listCodes(): Promise<BetaInviteCodeRow[]> {
    const { data, error } = await supabase
      .from('beta_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      throw new Error('베타 코드 목록을 불러오지 못했습니다.');
    }
    return (data || []) as BetaInviteCodeRow[];
  },

  async createCode(params: CreateBetaCodeParams): Promise<BetaInviteCodeRow> {
    const distributedTo = String(params.distributedTo || '').trim();
    const distributedContact = String(params.distributedContact || '').trim();
    const note = String(params.note || '').trim();
    const expiresAt = params.expiresAt ?? null;
    const { data: authData } = await supabase.auth.getUser();
    const createdBy = authData.user?.id || null;

    for (let i = 0; i < 6; i += 1) {
      const code = generateBetaInviteCode();
      const { data, error } = await supabase
        .from('beta_invite_codes')
        .insert({
          code,
          distributed_to: distributedTo || null,
          distributed_contact: distributedContact || null,
          note: note || null,
          expires_at: expiresAt,
          created_by: createdBy,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as BetaInviteCodeRow;
      }

      const pgCode = (error as { code?: string } | null)?.code;
      if (pgCode === '23505') {
        continue;
      }
      throw new Error('베타 코드 생성에 실패했습니다.');
    }

    throw new Error('베타 코드 생성에 실패했습니다. 다시 시도해주세요.');
  },

  async updateCodeMeta(id: string, params: UpdateBetaCodeMetaParams): Promise<BetaInviteCodeRow> {
    const distributedTo = String(params.distributedTo || '').trim();
    const distributedContact = String(params.distributedContact || '').trim();
    const note = String(params.note || '').trim();

    const { data, error } = await supabase
      .from('beta_invite_codes')
      .update({
        distributed_to: distributedTo || null,
        distributed_contact: distributedContact || null,
        note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error('배포 정보 저장에 실패했습니다.');
    }

    return data as BetaInviteCodeRow;
  },

  async setCodeActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('beta_invite_codes')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error('코드 상태 변경에 실패했습니다.');
    }
  },

  async deleteCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('beta_invite_codes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error('코드 삭제에 실패했습니다.');
    }
  },
};
