import React, { useState, useEffect, useCallback } from 'react';
import { betaInviteService, ReferralInfo } from '../../services/betaInviteService';

interface ReferralSectionProps {
  hospitalId: string;
  plan: string;
}

const ReferralSection: React.FC<ReferralSectionProps> = ({ plan }) => {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await betaInviteService.getMyReferralInfo();
      setInfo(data);
    } catch {
      // 조회 실패 시 빈 상태
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await betaInviteService.createMyReferralCode();
      await loadInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : '코드 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!info?.code) return;
    navigator.clipboard.writeText(info.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isFree = plan === 'free';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-800 mb-1">친구 초대</h3>
      <p className="text-[11px] text-slate-500 mb-4">
        초대 코드를 공유하세요. 초대받은 회원이 유료 결제를 완료하면 10% 할인 쿠폰을 받습니다.
      </p>

      {loading ? (
        <div className="text-xs text-slate-400 py-4 text-center">불러오는 중...</div>
      ) : (
        <>
          {/* 초대 코드 */}
          {info?.code ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-mono text-sm font-bold text-slate-800 tracking-wider">{info.code}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          ) : (
            <div className="mb-4">
              {isFree ? (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                  유료 플랜 사용자만 초대 코드를 생성할 수 있습니다.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {creating ? '생성 중...' : '초대 코드 생성'}
                </button>
              )}
              {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
            </div>
          )}

          {/* 초대 현황 */}
          {info && (info.referred_count > 0 || info.rewards.length > 0) && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 flex-1 text-center">
                  <p className="text-[11px] text-indigo-600 font-bold mb-0.5">초대한 회원</p>
                  <p className="text-lg font-black text-indigo-700">{info.referred_count}명</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 flex-1 text-center">
                  <p className="text-[11px] text-emerald-600 font-bold mb-0.5">받은 보상 쿠폰</p>
                  <p className="text-lg font-black text-emerald-700">{info.rewards.length}장</p>
                </div>
              </div>

              {info.rewards.length > 0 && (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-500">할인</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500">상태</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500">만료일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {info.rewards.map((r) => (
                        <tr key={r.id} className="text-slate-700">
                          <td className="px-3 py-2 font-semibold">
                            {r.discount_type === 'percentage' ? `${r.discount_value}%` : `${r.discount_value.toLocaleString()}원`}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : r.status === 'exhausted'
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {r.status === 'active' ? '사용 가능' : r.status === 'exhausted' ? '사용 완료' : '만료'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {r.expires_at ? new Date(r.expires_at).toLocaleDateString('ko-KR') : '무제한'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReferralSection;
