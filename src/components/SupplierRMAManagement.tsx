import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  Calendar, 
  Package, 
  Info,
  CheckCircle2,
  X,
  Truck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RMA, Supplier, Product, Customer, RMAItem, RMAStatus } from '../types'; // Added RMAItem, RMAStatus
import { StatusBadge } from './ui/StatusBadge';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';
import { Pagination } from './ui/Pagination';
import { AlertCircle, X as CloseIcon } from 'lucide-react';

export const SupplierRMAManagement = () => {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statuses, setStatuses] = useState<RMAStatus[]>([]); // Changed type from {id: string, name: string, color: string}[] to RMAStatus[]
  const [viewingRma, setViewingRma] = useState<RMA | null>(null);
  const [viewingItemIndex, setViewingItemIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [resolutionModal, setResolutionModal] = useState<{ isOpen: boolean; rmaId: string; status: string; creditNote: string; resolutionNote: string } | null>(null);
  
  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newRma, setNewRma] = useState<Partial<RMA>>({
    customerId: '',
    supplierId: '',
    status: '',
    odooDoc: '',
    items: []
  });

  const itemsPerPage = 6;

  const supplierToClientStatus: Record<string, string> = {
    'Pendente de Envio': 'Aguarda Envio ao Fornecedor',
    'Enviado ao Fornecedor': 'Enviado ao Fornecedor',
    'Crédito do Fornecedor': 'Crédito do Fornecedor',
    'Reparado/Substituído': 'Reparado/Substituído'
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch RMAs with items - specifically filtering for supplier-related statuses
    // For now, we fetch all and filter client-side to ensure we have the full context
    // but in a real app, you'd filter by specific status IDs or names
    const { data: rmaData, error: rmaError } = await supabase
      .from('rmas')
      .select(`
        *,
        customers(name),
        suppliers(name),
        rma_items(
          id,
          product_id,
          quantity,
          serial_number,
          fault_description,
          warranty,
          products(name, reference)
        )
      `)
      .order('created_at', { ascending: false });

    const { data: statusData } = await supabase
      .from('rma_statuses')
      .select('id, name, color, category')
      .order('name');

    if (statusData) setStatuses(statusData);

    if (rmaData) {
      const mapped: RMA[] = (rmaData as any[]).map(r => ({
        id: r.id,
        customerId: r.customer_id,
        clientName: r.customers?.name,
        supplierId: r.supplier_id,
        supplierName: r.suppliers?.name,
        status: r.status,
        supplierStatus: r.supplier_status || 'Pendente de Envio',
        isSupplierActive: r.is_supplier_active,
        supplierCreditNote: r.supplier_credit_note || '',
        supplierResolutionNote: r.supplier_resolution_note || '',
        odooDoc: r.odoo_doc || '',
        seqNumber: r.seq_number,
        year: r.year,
        dateCreated: new Date(r.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }),
        updatedAt: r.updated_at,
        items: (r.rma_items as any[] || []).map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.products?.name,
          productReference: item.products?.reference,
          quantity: item.quantity,
          serialNumber: item.serial_number,
          faultDescription: item.fault_description,
          repairStatus: item.repair_status,
          warranty: item.warranty
        }))
      }));

      // Filter for RMAs that are explicitly active for supplier
      const allSupplierRmas = mapped
        .map(rma => ({
          ...rma,
          items: rma.items?.filter(item => item.repairStatus === 'Aguarda Envio ao Fornecedor') || []
        }))
        .filter(rma => rma.items.length > 0);
      setRmas(allSupplierRmas);
    }

    const { data: customersData } = await supabase.from('customers').select('*').order('name');
    const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name');
    const { data: productsData } = await supabase.from('products').select('*').order('name');

    if (customersData) setCustomers(customersData);
    if (suppliersData) setSuppliers(suppliersData);
    if (productsData) setProducts(productsData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteRma = async (id: string) => {
    if (!confirm('Tem a certeza que pretende eliminar este registo de RMA?')) return;
    
    // First delete items
    const { error: itemsError } = await supabase
      .from('rma_items')
      .delete()
      .eq('rma_id', id);

    if (itemsError) {
      alert('Erro ao eliminar itens da RMA');
      return;
    }

    const { error } = await supabase
      .from('rmas')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao eliminar RMA');
    } else {
      fetchData();
    }
  };

  const handleEditClick = (rma: RMA) => {
    setEditingId(rma.id);
    setNewRma({
      customerId: rma.customerId,
      supplierId: rma.supplierId,
      status: rma.status,
      supplierStatus: rma.supplierStatus,
      odooDoc: rma.odooDoc,
      items: [...(rma.items || [])]
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditSingleItem = (rma: RMA, itemIndex: number) => {
    const item = rma.items?.[itemIndex];
    if (!item) return;
    setEditingId(rma.id);
    setNewRma({
      customerId: rma.customerId,
      supplierId: rma.supplierId,
      status: rma.status,
      supplierStatus: rma.supplierStatus,
      odooDoc: rma.odooDoc,
      items: [{
        id: item.id,
        productId: item.productId,
        productName: item.productName || '',
        productReference: item.productReference || '',
        quantity: item.quantity,
        serialNumber: item.serialNumber || '',
        faultDescription: item.faultDescription || '',
        repairDescription: item.repairDescription || '',
        repairStatus: item.repairStatus || '',
        warranty: item.warranty
      }]
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDeleteSingleItem = async (rma: RMA, itemIndex: number) => {
    const item = rma.items?.[itemIndex];
    if (!item || !item.id) return;
    if (!window.confirm(`Tem a certeza que deseja eliminar o artigo "${item.productName}" desta RMA?`)) return;
    const { error } = await supabase.from('rma_items').delete().eq('id', item.id);
    if (error) {
      alert('Erro ao eliminar artigo: ' + error.message);
    } else {
      setViewingRma(null);
      fetchData();
    }
  };

  const handleSaveRma = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: any = {
      customer_id: newRma.customerId,
      supplier_id: newRma.supplierId || null,
      status: newRma.status,
      supplier_status: newRma.supplierStatus,
      odoo_doc: newRma.odooDoc?.trim(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('rmas')
      .update(payload)
      .eq('id', editingId);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const filteredRmas = rmas.filter(rma => {
    const matchesSearch = 
      rma.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.items?.some(item => 
        item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      rma.odooDoc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rma.seqNumber && `RMA#${rma.seqNumber}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTab = 
      activeFilter === 'all' || 
      (activeFilter === 'open' && rma.supplierStatus !== 'Crédito do Fornecedor' && rma.supplierStatus !== 'Reparado/Substituído') || 
      (activeFilter === 'completed' && (rma.supplierStatus === 'Crédito do Fornecedor' || rma.supplierStatus === 'Reparado/Substituído'));

    return matchesSearch && matchesTab;
  });

  const handleExport = () => {
    const headers = [
      'RMA ID', 
      'Data Criacao', 
      'Cliente', 
      'Fornecedor', 
      'Artigos', 
      'Descricao da Avaria',
      'Estado (Fornecedor)', 
      'Doc. Odoo', 
      'Nota de Credito', 
      'Notas Resolucao'
    ];

    const rows = filteredRmas.map(rma => {
      const articles = rma.items?.map(i => `${i.productReference} (${i.productName}) x${i.quantity}`).join(' | ') || '';
      const faults = rma.items?.map(i => i.faultDescription).filter(Boolean).join(' | ') || '';
      return [
        rma.seqNumber ? `RMA#${rma.seqNumber}/${rma.year}` : rma.id,
        rma.dateCreated,
        rma.clientName || '',
        rma.supplierName || '',
        `"${articles}"`,
        `"${faults}"`,
        rma.supplierStatus || '',
        rma.odooDoc || '',
        rma.supplierCreditNote || '',
        `"${rma.supplierResolutionNote || ''}"`
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RMA_Fornecedores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedRmas = filteredRmas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão RMA Fornecedor"
        description="Controle e acompanhamento de processos ativos com os fornecedores."
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Package size={16} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Enviadas</span>
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                  {rmas.filter(r => r.supplierStatus?.includes('Enviado')).length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Truck size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">A Receber</span>
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                  {rmas.filter(r => r.supplierStatus?.includes('Recebido') || r.supplierStatus?.includes('Análise')).length}
                </span>
              </div>
            </div>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-inner">
          <button 
            onClick={() => setActiveFilter('open')}
            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeFilter === 'open' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Em Aberto
          </button>
          <button 
            onClick={() => setActiveFilter('completed')}
            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeFilter === 'completed' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Concluídas
          </button>
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Todas
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm flex-1 items-center">
          <div className="relative flex-1 w-full">
            <SearchInput 
              placeholder="Pesquisar por fornecedor, equipamento ou doc. odoo..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-all shadow-md hover:shadow-lg active:scale-95 text-xs uppercase tracking-[0.15em]"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
             <div className="flex p-12 justify-center h-full items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : (filteredRmas.length === 0) ? (
             <div className="flex flex-col items-center justify-center p-12 text-slate-400">
               <Truck size={48} className="mb-4 opacity-20" />
               <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nenhum RMA com fornecedor</p>
               <p className="text-sm">Não existem processos ativos com fornecedores no momento.</p>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4 text-center">RMA</th>
                  <th className="px-6 py-4 text-center">CLIENTE</th>
                  <th className="px-6 py-4 text-center">FORNECEDOR</th>
                  <th className="px-6 py-4 text-center">ARTIGO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRmas.map((rma) => (
                  <tr key={rma.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-blue-600 text-xs uppercase">
                          {rma.seqNumber ? `RMA#${rma.seqNumber.toString().padStart(3, '0')}/${rma.year}` : `ID: #${rma.id.split('-')[0]}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {rma.dateCreated}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{rma.clientName || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{rma.supplierName || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-center">
                        {rma.items?.map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setViewingRma(rma); setViewingItemIndex(idx); }}
                            className="w-full max-w-[240px] bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/30 cursor-pointer"
                          >
                             <div className="flex items-start justify-between gap-2 mb-1">
                               <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight flex-1">{item.productName}</span>
                               <span className="shrink-0 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-black">x{item.quantity}</span>
                             </div>
                              <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/60 pt-1 mt-1 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">REF</span>
                                  <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono font-bold">{item.productReference}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">S/N</span>
                                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-medium">{item.serialNumber || 'N/A'}</span>
                                </div>
                                {rma.odooDoc && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">DOC</span>
                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono font-bold">{rma.odooDoc}</span>
                                  </div>
                                )}
                                {item.repairStatus && (
                                  <div className="mt-1">
                                    <StatusBadge 
                                      status={item.repairStatus} 
                                      color={statuses.find(s => s.name === item.repairStatus)?.color} 
                                    />
                                  </div>
                                )}
                                <div className="mt-1">
                                  <StatusBadge 
                                    status={rma.supplierStatus || 'Pendente de Envio'} 
                                    color={statuses.find(s => s.name === rma.supplierStatus)?.color} 
                                  />
                                </div>
                              </div>
                           </div>
                         ))}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {filteredRmas.length > 0 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <Pagination 
              currentPage={currentPage}
              totalPages={Math.ceil(filteredRmas.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={filteredRmas.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {viewingRma && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Eye size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Processo Fornecedor</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {viewingRma.seqNumber ? `RMA#${viewingRma.seqNumber.toString().padStart(3, '0')}/${viewingRma.year}` : `RMA#${viewingRma.id.split('-')[0]}`}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setViewingRma(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</span>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingRma.clientName || '---'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor</span>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingRma.supplierName || '---'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doc. Odoo</span>
                  <p className="text-sm font-mono text-blue-500 font-bold">{viewingRma.odooDoc || '---'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Fornecedor</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={viewingRma.supplierStatus || 'Pendente de Envio'}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'Crédito do Fornecedor' || newStatus === 'Reparado/Substituído') {
                          setResolutionModal({
                            isOpen: true,
                            rmaId: viewingRma.id,
                            status: newStatus,
                            creditNote: viewingRma.supplierCreditNote || '',
                            resolutionNote: viewingRma.supplierResolutionNote || ''
                          });
                        } else {
                          const updatePayload: any = { supplier_status: newStatus };
                          if (supplierToClientStatus[newStatus]) {
                            updatePayload.status = supplierToClientStatus[newStatus];
                          }
                          const { error } = await supabase
                            .from('rmas')
                            .update(updatePayload)
                            .eq('id', viewingRma.id);
                          if (!error) fetchData();
                        }
                      }}
                      className="bg-transparent font-bold text-xs focus:outline-none cursor-pointer text-blue-600"
                    >
                      {statuses.filter(s => s.category === 'supplier').map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <StatusBadge 
                      status={viewingRma.supplierStatus || ''} 
                      color={statuses.find(s => s.name === viewingRma.supplierStatus)?.color} 
                    />
                  </div>
                </div>
              </div>

              {(viewingRma.supplierCreditNote || viewingRma.supplierResolutionNote) && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <ClipboardCheck size={16} className="text-blue-600" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Resolução do Fornecedor</span>
                    </div>
                    <button 
                      onClick={() => setResolutionModal({
                        isOpen: true,
                        rmaId: viewingRma.id,
                        status: viewingRma.supplierStatus || '',
                        creditNote: viewingRma.supplierCreditNote || '',
                        resolutionNote: viewingRma.supplierResolutionNote || ''
                      })}
                      className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 underline decoration-blue-600/30"
                    >
                      Editar Resolução
                    </button>
                  </div>

                  {viewingRma.supplierCreditNote && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nota de Crédito</span>
                      <p className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-slate-700">{viewingRma.supplierCreditNote}</p>
                    </div>
                  )}

                  {viewingRma.supplierResolutionNote && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Detalhes da Intervenção</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-slate-700 italic">"{viewingRma.supplierResolutionNote}"</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-slate-400" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    Artigo {viewingItemIndex !== null ? viewingItemIndex + 1 : 1} de {viewingRma.items?.length}
                  </h4>
                </div>

                {(() => {
                  const item = viewingRma.items?.[viewingItemIndex ?? 0];
                  if (!item) return null;
                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5 text-slate-900 dark:text-white">
                        <Package size={64} />
                      </div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-900 dark:text-white leading-tight">{item.productName}</h5>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                              {item.productReference}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                              QUANT: {item.quantity}
                            </span>
                            {item.serialNumber && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                S/N: {item.serialNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.repairStatus && (
                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Cliente:</span>
                          <StatusBadge 
                            status={item.repairStatus} 
                            color={statuses.find(s => s.name === item.repairStatus)?.color} 
                          />
                        </div>
                      )}

                      <div className="mt-2 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 relative z-10">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Info size={14} className="text-amber-500" />
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Descrição da Avaria</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          {item.faultDescription ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {item.faultDescription}
                            </p>
                          ) : (
                            <p className="text-xs italic text-slate-400">Nenhuma descrição técnica foi fornecida.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-800/50">
              <button 
                onClick={() => {
                  setViewingRma(null);
                  handleEditSingleItem(viewingRma, viewingItemIndex ?? 0);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button 
                onClick={() => {
                  handleDeleteSingleItem(viewingRma, viewingItemIndex ?? 0);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-500 dark:text-rose-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
              <button 
                onClick={() => setViewingRma(null)}
                className="py-3 bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-600/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Edit2 size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Processo Fornecedor</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveRma} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm flex items-start gap-3 border border-rose-100 dark:border-rose-800/50 uppercase tracking-tight font-bold">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</label>
                  <select 
                    required
                    value={newRma.customerId}
                    onChange={e => setNewRma({...newRma, customerId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                  >
                    <option value="">Selecionar Cliente</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</label>
                  <select 
                    required
                    value={newRma.supplierId}
                    onChange={e => setNewRma({...newRma, supplierId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                  >
                    <option value="">Selecionar Fornecedor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento Odoo</label>
                  <input 
                    type="text"
                    value={newRma.odooDoc}
                    onChange={e => setNewRma({...newRma, odooDoc: e.target.value})}
                    placeholder="Ex: SO/2024/001"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado Fornecedor</label>
                  <select 
                    value={newRma.supplierStatus}
                    onChange={e => setNewRma({...newRma, supplierStatus: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                  >
                    {statuses.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-slate-400" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Itens do Processo</h4>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {newRma.items?.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{item.productName}</span>
                        <span className="text-[10px] font-mono text-blue-500 font-bold">{item.productReference}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Qtd</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Série</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.serialNumber || '---'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic text-center">Para alterar os itens do processo, utilize a Gestão RMA Cliente.</p>
              </div>
            </form>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveRma}
                disabled={isSubmitting}
                className="flex-[2] py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <ClipboardCheck size={16} />
                )}
                {isSubmitting ? 'Guardando...' : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolutionModal && resolutionModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <ClipboardCheck size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes da Resolução</h3>
              </div>
              <button 
                onClick={() => setResolutionModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado selecionado:</span>
                <StatusBadge 
                  status={resolutionModal.status} 
                  color={statuses.find(s => s.name === resolutionModal.status)?.color} 
                />
              </div>

              {resolutionModal.status === 'Crédito do Fornecedor' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Número da Nota de Crédito</label>
                  <input 
                    type="text"
                    value={resolutionModal.creditNote}
                    onChange={e => setResolutionModal({...resolutionModal, creditNote: e.target.value})}
                    placeholder="Ex: NC-2024-001"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Reparação/Substituição Realizada</label>
                  <textarea 
                    value={resolutionModal.resolutionNote}
                    onChange={e => setResolutionModal({...resolutionModal, resolutionNote: e.target.value})}
                    placeholder="Detalhes da intervenção..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => setResolutionModal(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  const updatePayload: any = { 
                    supplier_status: resolutionModal.status,
                    supplier_credit_note: resolutionModal.creditNote,
                    supplier_resolution_note: resolutionModal.resolutionNote
                  };
                  if (supplierToClientStatus[resolutionModal.status]) {
                    updatePayload.status = supplierToClientStatus[resolutionModal.status];
                  }
                  const { error } = await supabase
                    .from('rmas')
                    .update(updatePayload)
                    .eq('id', resolutionModal.rmaId);
                  
                  if (!error) {
                    setResolutionModal(null);
                    fetchData();
                  }
                }}
                className="flex-[2] py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Confirmar Resolução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
