import { ChevronRight, Sun, Moon, Bell, LogOut } from 'lucide-react';
import React from 'react';
import { supabase } from '../../lib/supabase';

interface NavbarProps {
  activeTab: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Navbar = ({ activeTab, isDarkMode, toggleDarkMode }: NavbarProps) => {
  const tabTranslations: Record<string, string> = {
    dashboard: 'Painel',
    suppliers: 'Fornecedores',
    inventory: 'Artigos',
    customers: 'Clientes',
    management: 'Gestão de RMAs',
    statuses: 'Estados de RMA'
  };

  const translatedTab = tabTranslations[activeTab] || activeTab;

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden md:flex items-center text-xs text-slate-500 font-medium uppercase tracking-wider">
          <span>Portal de Gestão</span>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-slate-900 dark:text-white font-bold">{translatedTab}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="p-2 ml-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Sair do sistema"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
