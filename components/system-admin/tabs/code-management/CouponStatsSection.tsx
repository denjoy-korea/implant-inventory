import React from 'react';
import { CouponStats, RedemptionStats, ChannelStat } from '../../../../services/couponService';

interface CouponStatsSectionProps {
  couponStats: CouponStats | null;
  redemptionStats: RedemptionStats | null;
  channelStats: ChannelStat[];
}

const CouponStatsSection: React.FC<CouponStatsSectionProps> = ({
  couponStats,
  redemptionStats,
  channelStats,
}) => {
  return (
    <>
      {/* ── 운영 통계 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 쿠폰 발급 통계 */}
        {couponStats && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">쿠폰 발급 현황</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-600">{couponStats.total}</p>
                <p className="text-[11px] text-slate-500 mt-1">총 발급</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{couponStats.active}</p>
                <p className="text-[11px] text-slate-500 mt-1">사용 가능</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-600">{couponStats.totalUsed}</p>
                <p className="text-[11px] text-slate-500 mt-1">총 사용 횟수</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
              <span>소진 {couponStats.exhausted}</span>
              <span className="text-slate-300">|</span>
              <span>만료 {couponStats.expired}</span>
              <span className="text-slate-300">|</span>
              <span>회수 {couponStats.revoked}</span>
            </div>
          </div>
        )}

        {/* 쿠폰 사용 통계 */}
        {redemptionStats && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">할인 실적</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-violet-600">{redemptionStats.totalRedemptions}</p>
                <p className="text-[11px] text-slate-500 mt-1">총 사용 건수</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-violet-600">{redemptionStats.totalDiscountAmount.toLocaleString()}<span className="text-sm">원</span></p>
                <p className="text-[11px] text-slate-500 mt-1">총 할인 금액</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 채널별 분석 */}
      {channelStats.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800">채널별 제휴코드 분석</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">제휴 코드의 채널별 사용 현황입니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">채널</th>
                  <th className="px-4 py-3 text-right font-bold">총 코드</th>
                  <th className="px-4 py-3 text-right font-bold">활성 코드</th>
                  <th className="px-4 py-3 text-right font-bold">검증 횟수</th>
                  <th className="px-4 py-3 text-right font-bold">가입 전환</th>
                  <th className="px-4 py-3 text-right font-bold">전환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channelStats.map((ch) => {
                  const cvr = ch.totalVerifications > 0
                    ? Math.round((ch.signups / ch.totalVerifications) * 100)
                    : 0;
                  return (
                    <tr key={ch.channel} className="text-slate-700">
                      <td className="px-4 py-3 font-bold text-violet-700">{ch.channel}</td>
                      <td className="px-4 py-3 text-right">{ch.totalCodes}</td>
                      <td className="px-4 py-3 text-right">{ch.activeCodes}</td>
                      <td className="px-4 py-3 text-right">{ch.totalVerifications}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{ch.signups}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cvr >= 50 ? 'bg-emerald-50 text-emerald-700' : cvr >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {cvr}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default CouponStatsSection;
