import { Search } from 'lucide-react';
import React from 'react';

export const SearchInput = (props: React.ComponentProps<'input'>) => (
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
    <input
      type="text"
      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500/50 text-sm ring-1 ring-slate-200 dark:ring-slate-700 outline-none transition-all"
      {...props}
    />
  </div>
);
