import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
      {description && <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
    </div>
    {action && (
      <div>
        {action}
      </div>
    )}
  </div>
);
