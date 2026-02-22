import React from 'react';

export interface SystemAdminKpiCard {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  active: boolean;
}

interface SystemAdminOverviewTabProps {
  kpiCards: SystemAdminKpiCard[];
  colorMap: Record<string, { text: string; iconBg: string }>;
}

const SystemAdminOverviewTab: React.FC<SystemAdminOverviewTabProps> = ({ kpiCards, colorMap }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((card, i) => {
          const c = colorMap[card.color];
          return (
            <button
              key={i}
              onClick={card.onClick}
              className={`group bg-white px-5 py-5 rounded-2xl border transition-all text-left hover:shadow-md ${card.active ? 'border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${c.iconBg} ${c.text} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>{card.icon}</div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-tight">{card.value}</div>
                  <p className="text-xs font-bold text-slate-500 mt-1">{card.label}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${c.text}`}>{card.sub}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SystemAdminOverviewTab;
