import React from 'react';
import type { UsagePatterns } from './usageTypes';
import { DonutChart } from '../../AnalyzeCharts';

interface AnalyzeUsageManufacturerCardProps {
  manufacturerDistribution: UsagePatterns['manufacturerDistribution'];
}

const AnalyzeUsageManufacturerCard: React.FC<AnalyzeUsageManufacturerCardProps> = ({ manufacturerDistribution }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg shadow-slate-200/50">
      <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">제조사별 소모 비중</h3>
      <DonutChart data={manufacturerDistribution} />
    </div>
  );
};

export default AnalyzeUsageManufacturerCard;
