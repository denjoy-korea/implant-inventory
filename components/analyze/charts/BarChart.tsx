import React from 'react';

interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  items: BarChartItem[];
  maxValue: number;
}

const BarChart: React.FC<BarChartProps> = ({ items, maxValue }) => (
  <div className="space-y-3">
    {items.map((item, i) => (
      <div key={i}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 font-medium truncate">{item.label}</span>
          <span className="text-xs font-bold text-slate-800 ml-2 flex-shrink-0">{item.value}건</span>
        </div>
        <div className="bg-slate-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

export default BarChart;
