import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: LucideIcon;
  color?: string;
  variant?: 'default' | 'simple';
}

export const StatCard = ({ label, value, change, trend, icon: Icon, color, variant = 'default' }: StatCardProps) => {
  if (variant === 'simple') {
    return (
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
          {change && trend && (
            <span className={`${
              trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 
              trend === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' :
              'text-slate-500 bg-slate-50 dark:bg-slate-800'
            } text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1`}>
              {change}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        {Icon && color && (
           <div className={`p-2 rounded-lg ${color}`}>
             <Icon size={20} />
           </div>
        )}
        {change && trend && (
           <span className={`text-xs font-bold flex items-center gap-1 ${
             trend === 'up' ? 'text-emerald-500' : 
             trend === 'down' ? 'text-rose-500' : 
             'text-slate-400'
           }`}>
             {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
             {change}
           </span>
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
      <h3 className="text-3xl font-black mt-1 text-slate-900 dark:text-white tracking-tight">{value}</h3>
    </div>
  );
};
