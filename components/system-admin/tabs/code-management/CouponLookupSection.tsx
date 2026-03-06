import React from 'react';
import { UserCoupon } from '../../../../services/couponService';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('ko-KR', { hour12: false });
}

interface CouponLookupSectionProps {
  userCoupons: UserCoupon[];
  couponsLoading: boolean;
  couponHospitalId: string;
  onHospitalIdChange: (id: string) => void;
  onSearch: () => Promise<void>;
  onRevoke: (couponId: string) => Promise<void>;
}

const CouponLookupSection: React.FC<CouponLookupSectionProps> = ({
  userCoupons,
  couponsLoading,
  couponHospitalId,
  onHospitalIdChange,
  onSearch,
  onRevoke,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-800">발급 쿠폰 조회</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">병원 ID로 해당 병원에 발급된 쿠폰을 조회합니다.</p>
      </div>
      <div className="px-5 py-3 flex items-center gap-3">
        <input
          value={couponHospitalId}
          onChange={(e) => onHospitalIdChange(e.target.value)}
          placeholder="병원 ID (UUID)"
          className="flex-1 max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          onKeyDown={(e) => { if (e.key === 'Enter') void onSearch(); }}
        />
        <button
          type="button"
          onClick={() => void onSearch()}
          disabled={couponsLoading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {couponsLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {userCoupons.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">쿠폰명</th>
                <th className="px-4 py-3 text-left font-bold">할인</th>
                <th className="px-4 py-3 text-left font-bold">사용</th>
                <th className="px-4 py-3 text-left font-bold">출처</th>
                <th className="px-4 py-3 text-left font-bold">상태</th>
                <th className="px-4 py-3 text-left font-bold">만료일</th>
                <th className="px-4 py-3 text-right font-bold">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userCoupons.map((uc) => {
                const statusColors: Record<string, string> = {
                  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  exhausted: 'bg-slate-100 text-slate-500 border-slate-200',
                  expired: 'bg-amber-50 text-amber-700 border-amber-200',
                  revoked: 'bg-rose-50 text-rose-600 border-rose-200',
                };
                const statusLabels: Record<string, string> = {
                  active: '사용 가능',
                  exhausted: '소진',
                  expired: '만료',
                  revoked: '회수됨',
                };
                return (
                  <tr key={uc.id} className="text-slate-700">
                    <td className="px-4 py-3 font-semibold">{uc.template?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold border bg-violet-50 text-violet-700 border-violet-200">
                        {uc.discount_type === 'percentage' ? `${uc.discount_value}%` : `${uc.discount_value.toLocaleString()}원`}
                      </span>
                    </td>
                    <td className="px-4 py-3">{uc.used_count}/{uc.max_uses}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${
                        uc.source_type === 'partner' ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : uc.source_type === 'promo' ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {uc.source_type === 'partner' ? '제휴' : uc.source_type === 'promo' ? '프로모' : '관리자'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${statusColors[uc.status] || ''}`}>
                        {statusLabels[uc.status] || uc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{uc.expires_at ? formatDateTime(uc.expires_at) : '무제한'}</td>
                    <td className="px-4 py-3 text-right">
                      {uc.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => void onRevoke(uc.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        >
                          회수
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CouponLookupSection;
