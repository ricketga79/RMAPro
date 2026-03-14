import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ShieldCheck, 
  MoreHorizontal, 
  BarChart3,
  AlertCircle,
  Package
} from 'lucide-react';
import { RMA } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { StatCard } from './ui/StatCard';
import { StatusBadge } from './ui/StatusBadge';
import { PageHeader } from './ui/PageHeader';
import { supabase } from '../lib/supabase';

const chartData = [
  { name: 'Jan', rmas: 10, completed: 5 },
  { name: 'Fev', rmas: 15, completed: 8 },
  { name: 'Mar', rmas: 25, completed: 12 },
];

// Define types for Supabase data structures to avoid 'any'
interface SupabaseRMA {
  id: string;
  status: string;
  warranty: string;
  seq_number: number;
  year: number;
  created_at: string;
  customers: { name: string } | null;
  rma_items: SupabaseRMAItem[] | null;
}

interface SupabaseRMAItem {
  product_id: string;
  quantity: number;
  repair_description: string | null;
  repair_status: string | null;
  serial_number: string | null;
  fault_description: string | null;
  warranty: string | null;
  products: { name: string; reference: string } | null;
}

interface SupabaseRMAStatus {
  name: string;
  color: string;
}

interface SupabaseAllRMA {
  status: string;
  warranty: string;
  seq_number: number;
  year: number;
}

export const Dashboard = () => {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [dashboardStatuses, setDashboardStatuses] = useState<{name: string, color: string, count: number}[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    analysis: 0,
    outOfWarranty: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch recent RMAs
    const { data: rmaData, error: rmaError } = await supabase
      .from('rmas')
      .select('*, customers(name), rma_items(quantity, repair_description, repair_status, products(name, reference), serial_number, fault_description, warranty)')
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch all statuses for the bars and mapping
    const { data: statusData } = await supabase
      .from('rma_statuses')
      .select('name, color')
      .order('name');

    // Fetch all RMAs for current counts (simplified for small datasets)
    const { data: allRmas } = await supabase
      .from('rmas')
      .select('status, warranty, seq_number, year');

    if (rmaData) {
      const mapped: RMA[] = (rmaData as any[]).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        clientName: r.customers?.name || 'Desconhecido',
        status: r.status,
        warranty: r.warranty,
        seqNumber: r.seq_number,
        year: r.year,
        dateCreated: new Date(r.created_at).toLocaleDateString('pt-PT'),
        equipment: r.rma_items?.length > 0 ? r.rma_items[0].products?.name : 'N/A',
        productReference: r.rma_items?.length > 0 ? r.rma_items[0].products?.reference : '',
        itemsCount: r.rma_items?.length || 0,
        serialNumber: r.rma_items?.length > 0 ? r.rma_items[0].serial_number : '',
        repairDescription: r.rma_items?.length > 0 ? r.rma_items[0].repair_description : '',
        repairStatus: r.rma_items?.length > 0 ? r.rma_items[0].repair_status : '',
        items: (r.rma_items as any[] || []).map((item: any) => ({
          id: item.id,
          productId: item.products?.id,
          productName: item.products?.name,
          productReference: item.products?.reference,
          quantity: item.quantity,
          serialNumber: item.serial_number,
          faultDescription: item.fault_description,
          repairDescription: item.repair_description,
          repairStatus: item.repair_status,
          warranty: item.warranty
        }))
      }));
      setRmas(mapped);
    }

    if (statusData && allRmas) {
      const statusCounts = statusData.map(s => ({
        ...s,
        count: allRmas.filter(r => r.status === s.name).length
      }));
      setDashboardStatuses(statusCounts);

      const active = allRmas.filter(r => r.status !== 'Concluída' && r.status !== 'Recusada').length;
      const analysis = allRmas.filter(r => r.status === 'Em Análise').length;
      const outOfWarranty = allRmas.filter(r => r.warranty === 'Expirada').length;

      setStats({ active, analysis, outOfWarranty });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão Geral do Painel"
        description="Monitorização em tempo real das autorizações de devolução e métricas de serviço."
        action={
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button className="px-3 py-1.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Últimos 7 Dias</button>
            <button className="px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Últimos 30 Dias</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total de RMAs Ativos"
          value={stats.active.toString()}
          change="Real-time"
          trend="up"
          icon={Clock}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/20"
        />
        <StatCard
          label="Em Análise"
          value={stats.analysis.toString()}
          change="Real-time"
          trend="stable"
          icon={TrendingUp}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/20"
        />
        <StatCard
          label="Fora de Garantia"
          value={stats.outOfWarranty.toString()}
          change="Total"
          trend="up"
          icon={ShieldCheck}
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Desempenho de RMAs
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRmas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rmas" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRmas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Distribuição de Estados</h3>
          <div className="space-y-4">
            {dashboardStatuses.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum estado definido.</p>
            ) : dashboardStatuses.map((item) => {
              const total = stats.active + (dashboardStatuses.find(s => s.name === 'Concluída')?.count || 0) + (dashboardStatuses.find(s => s.name === 'Recusada')?.count || 0);
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              
              const colorClasses: Record<string, string> = {
                azul: 'bg-blue-500',
                ambar: 'bg-amber-500',
                laranja: 'bg-orange-500',
                esmeralda: 'bg-emerald-500',
                rosa: 'bg-rose-500',
                roxo: 'bg-purple-500',
                ciano: 'bg-cyan-500',
                cinza: 'bg-slate-500',
              };

              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">{item.name}</span>
                    <span className="text-slate-900 dark:text-white">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colorClasses[item.color] || 'bg-blue-500'}`} 
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">RMAs Recentes</h3>
          <button className="text-blue-600 text-sm font-bold hover:underline">Ver Todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">ID do RMA</th>
                <th className="px-6 py-4">Nome do Cliente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Garantia</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-slate-400 text-sm">A carregar...</td></tr>
              ) : rmas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-slate-400 text-sm">Nenhum RMA recente.</td></tr>
              ) : rmas.map((rma) => (
                <tr key={rma.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">
                    {rma.seqNumber ? `RMA#${rma.seqNumber.toString().padStart(3, '0')}/${rma.year}` : `#${rma.id.split('-')[0]}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {(rma.clientName || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {rma.equipment || 'N/A'}
                        </span>
                        {rma.itemsCount !== undefined && rma.itemsCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500 italic">
                              {rma.itemsCount} {rma.itemsCount === 1 ? 'artigo' : 'artigos'}
                            </span>
                          </div>
                        )}
                        {rma.productReference && (
                          <span className="text-[10px] text-blue-500 font-mono font-bold">[{rma.productReference}]</span>
                        )}
                        {rma.repairDescription && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {rma.repairStatus && (
                              <span className="text-[7px] font-black uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1 py-0 rounded-[2px] border border-blue-100 dark:border-blue-800 leading-tight">
                                {rma.repairStatus}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold italic line-clamp-1 max-w-[150px]">
                              "{rma.repairDescription}"
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                   </td>
                  <td className="px-6 py-4">
                    <StatusBadge 
                      status={rma.status} 
                      color={dashboardStatuses.find(s => s.name === rma.status)?.color} 
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      rma.warranty === 'Ativa' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {rma.warranty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">{rma.dateCreated}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
