import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Download, MoreHorizontal, ChevronRight, X, AlertCircle, Calendar, CheckCircle2, Eye, Package, Info, FileText } from 'lucide-react';
import { RMA, Customer, Product, Supplier } from '../types';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';
import { Pagination } from './ui/Pagination';
import { StatusBadge } from './ui/StatusBadge';
import { supabase } from '../lib/supabase';

const SKUA_CUSTOMER_ID = 'a6c4fc03-345f-4423-bfcf-680351afc79b';

export const RMAManagement = () => {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingRma, setViewingRma] = useState<RMA | null>(null);
  const [viewingItemIndex, setViewingItemIndex] = useState<number | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statuses, setStatuses] = useState<{name: string, color: string}[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [productRefInput, setProductRefInput] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [activeFilter, setActiveFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [newRma, setNewRma] = useState({
    customerId: '',
    supplierId: '',
    status: '',
    odooDoc: '',
    items: [] as { 
        productId: string, 
        productName: string, 
        productReference: string, 
        quantity: number, 
        serialNumber: string, 
        faultDescription: string, 
        repairDescription?: string,
        repairStatus?: string,
        warranty: 'Ativa' | 'Expirada' 
      }[]
  });

  const [itemInput, setItemInput] = useState({
    productRef: '',
    quantity: 1,
    serialNumber: '',
    faultDescription: '',
    repairDescription: '',
    repairStatus: '',
    warranty: 'Ativa' as 'Ativa' | 'Expirada'
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch RMAs with items
    const { data: rmaData, error: rmaError } = await supabase
      .from('rmas')
      .select(`
        *,
        customers(id, name, email, contact),
        suppliers(id, name, email, contact),
        rma_items(
          id,
          product_id,
          quantity,
          serial_number,
          fault_description,
          repair_description,
          repair_status,
          warranty,
          products(id, name, reference)
        )
      `)
      .order('created_at', { ascending: false });

    if (rmaError) {
      console.error('Error fetching RMAs:', rmaError);
    } else if (rmaData) {
      console.log('[DEBUG] fetchData - rmaData:', rmaData);
      const mapped: RMA[] = (rmaData as any[]).map(r => ({
        id: r.id,
        customerId: r.customer_id,
        clientName: r.customers?.name,
        supplierId: r.supplier_id,
        supplierName: r.suppliers?.name,
        status: r.status,
        supplierStatus: r.supplier_status,
        isSupplierActive: r.is_supplier_active,
        odooDoc: r.odoo_doc || '',
        seqNumber: r.seq_number,
        year: r.year,
        dateCreated: new Date(r.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }),
        updatedAt: r.updated_at,
        items: (r.rma_items as any[] || []).map(item => ({
          id: item.id,
          rmaId: r.id,
          productId: item.product_id,
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

    // Fetch supporting data
    const [custRes, prodRes, suppRes, statRes] = await Promise.all([
      supabase.from('customers').select('id, name, type, contact, email').order('name'),
      supabase.from('products').select('id, name, reference, brand, serial_required').order('name'),
      supabase.from('suppliers').select('id, name, contact, email, active_rmas, initials').order('name'),
      supabase.from('rma_statuses').select('*').eq('category', 'client').order('name')
    ]);

    if (custRes.data) setCustomers(custRes.data as Customer[]);
    if (prodRes.data) {
      const mappedProds: Product[] = (prodRes.data as any[]).map(p => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        brand: p.brand,
        serialRequired: p.serial_required
      }));
      setProducts(mappedProds);
    }
    if (suppRes.data) {
      const mappedSupps: Supplier[] = (suppRes.data as any[]).map(s => ({
        id: s.id,
        name: s.name,
        contact: s.contact,
        email: s.email,
        activeRMAs: s.active_rmas,
        initials: s.initials
      }));
      setSuppliers(mappedSupps);
    }
    if (statRes.data) {
      const statusOrder = [
        'Recebido Cliente',
        'Recebido do Cliente',
        'Recebida do Cliente',
        'Em Análise',
        'Aguarda Entrega ao Cliente',
        'Concluída',
        'Aguarda Envio ao Fornecedor',
        'Enviada Fornecedor',
        'Recebida do Fornecedor',
        'Recusada',
        'Substituido Stock'
      ];

      const sorted = [...statRes.data].sort((a, b) => {
        const indexA = statusOrder.indexOf(a.name);
        const indexB = statusOrder.indexOf(b.name);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setStatuses(sorted);
      if (!editingId && !newRma.status && sorted.length > 0) {
        setNewRma(prev => ({ ...prev, status: sorted[0].name }));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRmas = rmas.filter(rma => {
    const rmaIdFormatted = rma.seqNumber ? `RMA#${rma.seqNumber.toString().padStart(3, '0')}/${rma.year}` : rma.id;
    const itemsMatch = rma.items?.some(item => 
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.faultDescription?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesSearch = rmaIdFormatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rma.clientName && rma.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rma.odooDoc && rma.odooDoc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      itemsMatch;

    const isSkua = rma.customerId === SKUA_CUSTOMER_ID;

    const matchesTab = 
      activeFilter === 'all' || 
      (activeFilter === 'open' && rma.status !== 'Concluída' && rma.status !== 'Recusada' && rma.status !== 'Aguarda Envio ao Fornecedor') || 
      (activeFilter === 'completed' && (rma.status === 'Concluída' || rma.status === 'Recusada'));

    return matchesSearch && !isSkua && matchesTab;
  });

  console.log('[DEBUG] filteredRmas - all rmas:', rmas.length, 'filtered:', filteredRmas.length, 'activeFilter:', activeFilter, 'SKUA_CUSTOMER_ID:', SKUA_CUSTOMER_ID);
  console.log('[DEBUG] filteredRmas - isSkua check will filter:', rmas.filter(r => r.customerId === SKUA_CUSTOMER_ID).length, 'RMAs');

  const totalPages = Math.ceil(filteredRmas.length / itemsPerPage);
  const paginatedRmas = filteredRmas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = () => {
    const headers = [
      'RMA ID', 
      'Data Criacao', 
      'Cliente', 
      'Artigos', 
      'Descricao da Avaria',
      'Estado', 
      'Doc. Odoo'
    ];

    const rows = filteredRmas.map(rma => {
      const articles = rma.items?.map(i => `${i.productReference} (${i.productName}) x${i.quantity}`).join(' | ') || '';
      const faults = rma.items?.map(i => i.faultDescription).filter(Boolean).join(' | ') || '';
      return [
        rma.seqNumber ? `RMA#${rma.seqNumber}/${rma.year}` : rma.id,
        rma.dateCreated,
        rma.clientName || '',
        `"${articles}"`,
        `"${faults}"`,
        rma.status || '',
        rma.odooDoc || ''
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
    link.setAttribute('download', `RMA_Clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddClick = () => {
    setEditingId(null);
    setNewRma({
      customerId: '',
      supplierId: '',
      status: statuses.length > 0 ? statuses[0].name : '',
      odooDoc: '',
      items: []
    });
    setItemInput({
      productRef: '',
      quantity: 1,
      serialNumber: '',
      faultDescription: '',
      repairDescription: '',
      repairStatus: '',
      warranty: 'Ativa'
    });
    setProductRefInput('');
    setFoundProduct(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (rma: RMA) => {
    setEditingId(rma.id);
    setNewRma({
      customerId: rma.customerId,
      supplierId: rma.supplierId || '',
      status: rma.status,
      supplierStatus: rma.supplierStatus,
      odooDoc: rma.odooDoc || '',
      items: rma.items?.map(i => ({
        productId: i.productId,
        productName: i.productName || '',
        productReference: i.productReference || '',
        quantity: i.quantity,
        serialNumber: i.serialNumber || '',
        faultDescription: i.faultDescription || '',
        repairDescription: i.repairDescription || '',
        repairStatus: i.repairStatus || '',
        warranty: i.warranty
      })) || []
    });
    
    setItemInput({
      productRef: '',
      quantity: 1,
      serialNumber: '',
      faultDescription: '',
      repairDescription: '',
      repairStatus: '',
      warranty: 'Ativa'
    });
    setProductRefInput('');
    setFoundProduct(null);
    
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditSingleItem = (rma: RMA, itemIndex: number) => {
    const item = rma.items?.[itemIndex];
    if (!item) return;
    setEditingId(rma.id);
    setNewRma({
      customerId: rma.customerId,
      supplierId: rma.supplierId || '',
      status: rma.status,
      supplierStatus: rma.supplierStatus,
      odooDoc: rma.odooDoc || '',
      items: [{
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
    
    setItemInput({
      productRef: '',
      quantity: 1,
      serialNumber: '',
      faultDescription: '',
      repairDescription: '',
      repairStatus: '',
      warranty: 'Ativa'
    });
    setProductRefInput('');
    setFoundProduct(null);
    
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

  const handleDeleteRma = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este registo de RMA?')) return;
    
    const { error } = await supabase.from('rmas').delete().eq('id', id);
    if (error) {
      alert('Erro ao eliminar RMA: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleSaveRma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRma.items.length === 0) {
      setErrorMsg('Adicione pelo menos um artigo ao RMA.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    console.log('[DEBUG] handleSaveRma - newRma:', newRma);

    const payload: any = {
      customer_id: newRma.customerId,
      supplier_id: newRma.supplierId || null,
      status: newRma.status,
      odoo_doc: newRma.odooDoc.trim(),
      updated_at: new Date().toISOString()
    };

    console.log('[DEBUG] handleSaveRma - payload:', payload);

    const hasSupplierStatus = newRma.items.some(item => item.repairStatus === 'Aguarda Envio ao Fornecedor');

    if (hasSupplierStatus || newRma.status === 'Aguarda Envio ao Fornecedor') {
      payload.is_supplier_active = true;
      if (!editingId || !newRma.supplierStatus) {
        payload.supplier_status = 'Pendente de Envio';
      }
    } else if (editingId) {
      payload.is_supplier_active = false;
    }

    // Automation for "Substituido Stock"
    if (newRma.status === 'Substituido Stock') {
      payload.status = 'Aguarda Entrega ao Cliente';
    }

    let error;
    let rmaId = editingId;

    if (editingId) {
      const res = await supabase.from('rmas').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const currentYear = new Date().getFullYear();
      const { data: lastRma } = await supabase
        .from('rmas')
        .select('seq_number')
        .eq('year', currentYear)
        .order('seq_number', { ascending: false })
        .limit(1);
      
      const nextSeq = lastRma && lastRma.length > 0 ? (lastRma[0].seq_number + 1) : 1;
      
      const res = await supabase.from('rmas').insert([{
        ...payload,
        seq_number: nextSeq,
        year: currentYear
      }]).select();
      console.log('[DEBUG] handleSaveRma - insert result:', res);
      error = res.error;
      if (res.data && res.data[0]) rmaId = res.data[0].id;
    }

    if (!error && rmaId) {
      // Handle items: drop and recreate for simplicity in editing, or more complex diffing
      if (editingId) {
        await supabase.from('rma_items').delete().eq('rma_id', rmaId);
      }
      
      const itemsPayload = newRma.items.map(item => ({
        rma_id: rmaId,
        product_id: item.productId,
        quantity: item.quantity,
        serial_number: item.serialNumber.trim(),
        fault_description: item.faultDescription?.trim(),
        repair_status: item.repairStatus || null,
        warranty: item.warranty
      }));

      const { error: itemsError } = await supabase.from('rma_items').insert(itemsPayload);
      error = itemsError;
    }

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      // If was "Substituido Stock", and it's a NEW RMA, we create the Skua copy
      if (!editingId && newRma.status === 'Substituido Stock') {
        const currentYear = new Date().getFullYear();
        const { data: lastRma } = await supabase
          .from('rmas')
          .select('seq_number')
          .eq('year', currentYear)
          .order('seq_number', { ascending: false })
          .limit(1);
        
        const nextSeq = (lastRma?.[0]?.seq_number || 0) + 1;

        const { data: skuaRma, error: skuaError } = await supabase
          .from('rmas')
          .insert({
            customer_id: SKUA_CUSTOMER_ID,
            supplier_id: newRma.supplierId || null,
            status: 'Concluída', // Our part with the client is done
            is_supplier_active: true,
            supplier_status: 'Pendente de Envio',
            year: currentYear,
            seq_number: nextSeq,
            odoo_doc: newRma.odooDoc
          })
          .select()
          .single();

        if (!skuaError && skuaRma) {
          const itemsPayload = newRma.items?.map(item => ({
            rma_id: skuaRma.id,
            product_id: item.productId,
            quantity: item.quantity,
            serial_number: item.serialNumber,
            fault_description: item.faultDescription,
            repair_status: item.repairStatus || null,
            warranty: item.warranty
          }));
          if (itemsPayload) await supabase.from('rma_items').insert(itemsPayload);
        }
      }

      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleAddItem = () => {
    if (!foundProduct) return;
    
    setNewRma(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: foundProduct.id,
          productName: foundProduct.name,
          productReference: foundProduct.reference || '',
          quantity: itemInput.quantity,
          serialNumber: itemInput.serialNumber,
          faultDescription: itemInput.faultDescription,
          repairDescription: itemInput.repairDescription,
          repairStatus: itemInput.repairStatus as any,
          warranty: itemInput.warranty
        }
      ]
    }));

    // Reset item input
    setItemInput({
      productRef: '',
      quantity: 1,
      serialNumber: '',
      faultDescription: '',
      repairDescription: '',
      repairStatus: '',
      warranty: 'Ativa'
    });
    setProductRefInput('');
    setFoundProduct(null);
  };

  const handleRemoveItem = (index: number) => {
    setNewRma(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleRefChange = (ref: string) => {
    setProductRefInput(ref);
    if (ref.trim().length > 1) {
      const filtered = products.filter(p => 
        p.reference?.toLowerCase().includes(ref.toLowerCase()) ||
        p.name.toLowerCase().includes(ref.toLowerCase())
      ).slice(0, 5);
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }

    const prod = products.find(p => p.reference?.toLowerCase() === ref.trim().toLowerCase());
    if (prod) {
      setFoundProduct(prod);
    } else {
      setFoundProduct(null);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setFoundProduct(product);
    setProductRefInput(product.reference || '');
    setShowSuggestions(false);
    setFilteredProducts([]);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão RMA Cliente"
        description="Acompanhe e gira todo o ciclo de vida das devoluções e reparações dos clientes."
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Ativas</span>
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                  {rmas.filter(r => r.status !== 'Concluída' && r.status !== 'Recusada' && r.customerId !== SKUA_CUSTOMER_ID).length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Concluídas</span>
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                  {rmas.filter(r => (r.status === 'Concluída' || r.status === 'Recusada') && r.customerId !== SKUA_CUSTOMER_ID).length}
                </span>
              </div>
            </div>

            <button 
              onClick={handleAddClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-widest active:scale-95 ml-2"
            >
              <Plus size={18} />
              Novo Registro RMA
            </button>
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

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm items-center flex-1">
          <div className="relative flex-1 w-full">
            <SearchInput 
              placeholder="Pesquisar por ID, cliente, equipamento ou série..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-all shadow-md hover:shadow-lg active:scale-95 text-[10px] uppercase tracking-[0.15em]"
            >
              <Download size={16} />
              Exportar
            </button>
          </div>
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
               <Filter size={48} className="mb-4 opacity-20" />
               <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nenhum RMA encontrado</p>
               <p className="text-sm">
                 {searchTerm ? 'Tente ajustar os termos da sua pesquisa' : 'Inicie um novo processo de RMA para começar'}
               </p>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4 text-center">RMA</th>
                  <th className="px-6 py-4 text-center">CLIENTE</th>
                  <th className="px-6 py-4 text-center">ARTIGO</th>
                  <th className="px-6 py-4 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRmas.map((rma) => (
                  <tr key={rma.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setViewingRma(rma)}
                        className="flex flex-col items-center group/id mx-auto"
                      >
                        <span className="font-bold text-blue-600 text-xs uppercase group-hover/id:underline">
                          {rma.seqNumber ? `RMA#${rma.seqNumber.toString().padStart(3, '0')}/${rma.year}` : `ID: #${rma.id.split('-')[0]}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {rma.dateCreated}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{rma.clientName}</span>
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
                               <div className="flex flex-col items-end gap-1 shrink-0">
                                 <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-black">x{item.quantity}</span>
                                 <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter ${item.warranty === 'Ativa' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                   {item.warranty === 'Ativa' ? 'GARANTIA' : 'EXPIRADA'}
                                 </span>
                               </div>
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
                              </div>
                           </div>
                         ))}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewingRma(rma)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Visualização Rápida"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEditClick(rma)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar RMA"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRma(rma.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar RMA"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && (filteredRmas.length > 0) && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRmas.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            itemName="RMAs" 
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Registro RMA' : 'Novo Registro RMA'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRma} className="flex flex-col max-h-[85vh] overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {errorMsg && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{errorMsg}</p>
                  </div>
                )}

                {/* Section 1: General Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Informação Geral</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Cliente *</label>
                      <select 
                        required
                        value={newRma.customerId}
                        onChange={e => setNewRma({...newRma, customerId: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                      >
                        <option value="">Selecionar Cliente</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                {/* Section 2: Item Addition */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Adicionar Artigo</h4>
                  </div>

                  <div className="p-5 bg-emerald-50/30 dark:bg-emerald-900/5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 relative">
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Referência / Artigo *</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={productRefInput}
                            onChange={e => handleRefChange(e.target.value)}
                            onFocus={() => { if (filteredProducts.length > 0) setShowSuggestions(true); }}
                            placeholder="Pesquisar REF ou Nome..."
                            className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border ${foundProduct ? 'border-emerald-500 shadow-sm shadow-emerald-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white font-mono transition-all`}
                          />
                          {showSuggestions && filteredProducts.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 z-[70] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                              {filteredProducts.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(p)}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b last:border-0 border-slate-50 dark:border-slate-800 group"
                                >
                                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5 group-hover:text-blue-600 transition-colors">{p.name}</p>
                                  <p className="text-[10px] font-mono text-blue-500 font-bold">{p.reference}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {foundProduct && (
                            <div className="absolute right-3 top-[38px] text-emerald-500">
                              <CheckCircle2 size={16} />
                            </div>
                          )}
                        </div>
                        {foundProduct && (
                          <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg">
                            <Package size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight line-clamp-1">{foundProduct.name}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Quantidade</label>
                        <input 
                          type="number" 
                          min="1"
                          value={itemInput.quantity}
                          onChange={e => setItemInput({...itemInput, quantity: parseInt(e.target.value) || 1})}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">N.º Série</label>
                        <input 
                          type="text" 
                          value={itemInput.serialNumber}
                          onChange={e => setItemInput({...itemInput, serialNumber: e.target.value})}
                          placeholder="Ex: SN-123456"
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white font-mono transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Garantia</label>
                        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 h-[42px]">
                          <button 
                            type="button"
                            onClick={() => setItemInput({...itemInput, warranty: 'Ativa'})}
                            className={`flex-1 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${itemInput.warranty === 'Ativa' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Ativa
                          </button>
                          <button 
                            type="button"
                            onClick={() => setItemInput({...itemInput, warranty: 'Expirada'})}
                            className={`flex-1 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${itemInput.warranty === 'Expirada' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Expirada
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Estado RMA Cliente</label>
                        <select 
                          value={itemInput.repairStatus}
                          onChange={e => setItemInput({...itemInput, repairStatus: e.target.value})}
                          className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-blue-700 dark:text-blue-400 font-bold transition-all"
                        >
                          <option value="">Selecionar Estado</option>
                          {statuses.map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Fornecedor</label>
                        <select 
                          value={newRma.supplierId}
                          onChange={e => setNewRma({...newRma, supplierId: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white transition-all"
                        >
                          <option value="">Selecionar Fornecedor</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Doc. Odoo</label>
                        <input 
                          type="text" 
                          value={newRma.odooDoc}
                          onChange={e => setNewRma({...newRma, odooDoc: e.target.value})}
                          placeholder="Ex: INV/2024/001"
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white font-mono transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 font-mono">Descrição Avaria</label>
                      <textarea 
                        value={itemInput.faultDescription}
                        onChange={e => setItemInput({...itemInput, faultDescription: e.target.value})}
                        placeholder="Descreva o problema..."
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white resize-none transition-all"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleAddItem}
                      disabled={!foundProduct}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Plus size={16} />
                      Adicionar Artigo à Lista
                    </button>
                  </div>
                </div>

                {/* Section 3: Added Items List */}
                {newRma.items.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Artigos no RMA ({newRma.items.length})</h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {newRma.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] bg-slate-900 dark:bg-slate-700 text-white px-2 py-0.5 rounded-full font-black">#{idx + 1}</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white underline decoration-slate-200 dark:decoration-slate-700 underline-offset-4">{item.productName}</span>
                              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800/50 font-black">x{item.quantity}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] mb-2 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono">REF:</span>
                                <span className="text-blue-500 font-mono font-bold tracking-tight">{item.productReference}</span>
                              </div>
                              {item.serialNumber && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-mono">SN:</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">{item.serialNumber}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono">WTY:</span>
                                <span className={`font-black uppercase tracking-widest ${item.warranty === 'Ativa' ? 'text-emerald-500' : 'text-rose-500'}`}>{item.warranty}</span>
                              </div>
                            </div>

                            <div className="mb-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Estado RMA Cliente</label>
                              <select 
                                value={item.repairStatus || ''}
                                onChange={e => {
                                  const updated = [...newRma.items];
                                  updated[idx] = { ...updated[idx], repairStatus: e.target.value };
                                  setNewRma({ ...newRma, items: updated });
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-blue-700 dark:text-blue-400 font-bold transition-all"
                              >
                                <option value="">Selecionar Estado</option>
                                {statuses.map(s => (
                                  <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            {(item.faultDescription || item.repairStatus) && (
                              <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                {item.faultDescription && (
                                  <div className="flex gap-2">
                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter shrink-0 pt-0.5">AVARIA:</span>
                                    <p className="text-[10px] text-slate-500 italic line-clamp-2">{item.faultDescription}</p>
                                  </div>
                                )}
                                {item.repairStatus && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter shrink-0">ESTADO:</span>
                                    <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                                      {item.repairStatus}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all ml-4"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="hidden md:block">
                  {newRma.items.length > 0 && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total de Artigos: <span className="text-slate-900 dark:text-white">{newRma.items.reduce((acc, curr) => acc + curr.quantity, 0)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 md:flex-none px-6 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || newRma.items.length === 0}
                    className="flex-[2] md:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmitting ? 'A Processar...' : (editingId ? 'Salvar Alterações' : 'Finalizar RMA')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick View Sidebar (Drawer) */}
      {viewingRma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Eye size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Detalhes do Pedido</span>
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
                  <p className="font-bold text-slate-900 dark:text-white">{viewingRma.clientName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{viewingRma.supplierName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doc. Odoo</span>
                  <p className="text-sm font-mono text-blue-500 font-bold">{viewingRma.odooDoc || '---'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{viewingRma.dateCreated}</p>
                </div>
              </div>

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
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${
                          item.warranty === 'Ativa' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-500/20 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-500/20 dark:text-rose-400'
                        }`}>
                          {item.warranty === 'Ativa' ? 'Garantia OK' : 'Sem Garantia'}
                        </span>
                      </div>

                      {item.repairStatus && (
                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado:</span>
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

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-800/50">
              <button 
                onClick={() => {
                  setViewingRma(null);
                  handleEditSingleItem(viewingRma, viewingItemIndex ?? 0);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                <Edit2 size={16} />
                Editar Artigo
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
    </div>
  );
};

