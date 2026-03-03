import React from 'react';
import { buildSparklinePath } from '../../utils/chartUtils';

interface FailKpiStripProps {
  animTotal: number;
  animProcessed: number;
  animPending: number;
  animFailRate: number;
  animMonthlyAvg: number;
  failRate: number;
  monthlyFailDataLength: number;
  totalReturnPending: number;
  failSparkline: number[];
  exchangeSparkline: number[];
}

const FailKpiStrip: React.FC<FailKpiStripProps> = ({
  animTotal,
  animProcessed,
  animPending,
  animFailRate,
  animMonthlyAvg,
  failRate,
  monthlyFailDataLength,
  totalReturnPending,
  failSparkline,
  exchangeSparkline,
}) => (
  <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm">
    <div className="grid grid-cols-5 divide-x divide-slate-100">
      {/* 총 교환 발생 */}
      <div className="p-4 relative overflow-hidden">
        <h4 className="text-sm font-semibold text-slate-800">총 교환 발생</h4>
        <p className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight mt-2">{animTotal}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
        {failSparkline.length > 1 && (
          <svg className="absolute bottom-0 right-2 opacity-30" width="80" height="28">
            <path d={buildSparklinePath(failSparkline, 76, 24)} fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 교환 처리 완료 */}
      <div className="p-4 relative overflow-hidden">
        <h4 className="text-sm font-semibold text-slate-800">교환 처리 완료</h4>
        <p className="text-2xl font-bold text-emerald-600 tabular-nums tracking-tight mt-2">{animProcessed}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
        {exchangeSparkline.length > 1 && (
          <svg className="absolute bottom-0 right-2 opacity-30" width="80" height="28">
            <path d={buildSparklinePath(exchangeSparkline, 76, 24)} fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 미처리 잔여 */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-800">미처리 잔여</h4>
        <p className={`text-2xl font-bold tabular-nums tracking-tight mt-2 ${animPending > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{animPending}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
        {animPending > 0 && <p className="text-[10px] font-bold text-rose-400 mt-1">⚠ 전량 미처리</p>}
        {totalReturnPending > 0 && (
          <p className="text-[10px] font-bold text-amber-500 mt-0.5">반품 대기중 {totalReturnPending}건</p>
        )}
      </div>

      {/* 교환율 */}
      <div className="p-4 relative overflow-hidden">
        <h4 className="text-sm font-semibold text-slate-800">교환율</h4>
        <p className={`text-2xl font-bold tabular-nums tracking-tight mt-2 ${failRate > 20 ? 'text-rose-500' : failRate > 10 ? 'text-amber-500' : 'text-slate-800'}`}>
          {(animFailRate / 10).toFixed(1)}<span className="text-sm font-semibold text-slate-400 ml-0.5">%</span>
        </p>
        {failSparkline.length > 1 && (
          <svg className="absolute bottom-0 right-2 opacity-20" width="80" height="28">
            <path d={buildSparklinePath(failSparkline, 76, 24)} fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 월 평균 FAIL */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-800">월 평균</h4>
        <p className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight mt-2">
          {(animMonthlyAvg / 10).toFixed(1)}<span className="text-sm font-semibold text-slate-400 ml-1">건/월</span>
        </p>
        {monthlyFailDataLength > 0 && (
          <p className="text-[10px] text-slate-400 mt-1">{monthlyFailDataLength}개월 기준</p>
        )}
      </div>
    </div>
  </div>
);

export default FailKpiStrip;
