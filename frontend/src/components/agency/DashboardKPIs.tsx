import React from 'react';

interface KPI {
  label: string;
  value: number | string;
  icon?: string;
  color?: string;
}

interface DashboardKPIsProps {
  kpis: KPI[];
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="card p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">{kpi.label}</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-2 ${kpi.color || 'text-dark'}`}>
                {kpi.value}
              </p>
            </div>
            {kpi.icon && <span className="text-xl sm:text-2xl">{kpi.icon}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
