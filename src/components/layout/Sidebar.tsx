import React from 'react';
import { Package, LayoutDashboard, Truck, Users, Settings, Palette } from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
        : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
      {icon}
    </span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <Package size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">RMA Pro</h2>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Solução Empresarial</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        <SidebarItem
          icon={<LayoutDashboard size={20} />}
          label="Painel"
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        />
        <SidebarItem
          icon={<Settings size={20} />}
          label="Gestão RMA Cliente"
          active={activeTab === 'management'}
          onClick={() => setActiveTab('management')}
        />
        <SidebarItem
          icon={<Truck size={20} />}
          label="Gestão RMA Fornecedor"
          active={activeTab === 'supplier_rma'}
          onClick={() => setActiveTab('supplier_rma')}
        />
        <SidebarItem
          icon={<Package size={20} />}
          label="Artigos"
          active={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
        />
        <SidebarItem
          icon={<Users size={20} />}
          label="Clientes"
          active={activeTab === 'customers'}
          onClick={() => setActiveTab('customers')}
        />
        <SidebarItem
          icon={<Truck size={20} />}
          label="Fornecedores"
          active={activeTab === 'suppliers'}
          onClick={() => setActiveTab('suppliers')}
        />
        <SidebarItem
          icon={<Palette size={20} />}
          label="Estados RMA Cliente"
          active={activeTab === 'statuses'}
          onClick={() => setActiveTab('statuses')}
        />
        <SidebarItem
          icon={<Palette size={20} />}
          label="Estados RMA Fornecedor"
          active={activeTab === 'supplier_statuses'}
          onClick={() => setActiveTab('supplier_statuses')}
        />
      </nav>

    </aside>
  );
};
