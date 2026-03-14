import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';
import { Pagination } from './ui/Pagination';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching suppliers:', error);
    } else if (data) {
      const mapped = data.map(s => ({
        id: s.id,
        name: s.name,
        contact: s.contact,
        email: s.email,
        activeRMAs: s.active_rmas || 0,
        initials: s.initials || 'SP'
      }));
      setSuppliers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter and Pagination logic
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    setEditingId(null);
    setNewSupplier({ name: '', contact: '', email: '' });
    setIsModalOpen(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setNewSupplier({ name: supplier.name, contact: supplier.contact || '', email: supplier.email || '' });
    setIsModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o fornecedor "${name}"?
Esta ação irá remover permanentemente os dados. Os RMAs associados ficarão sem fornecedor.`)) return;
    
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      alert('Erro ao eliminar fornecedor: ' + error.message);
    } else {
      fetchSuppliers();
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    const trimmedName = newSupplier.name.trim();

    // Check if supplier with same name already exists
    const { data: existingSuppliers, error: checkError } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', trimmedName);

    if (checkError) {
      setErrorMsg('Erro ao verificar fornecedor: ' + checkError.message);
      setIsSubmitting(false);
      return;
    }

    if (existingSuppliers && existingSuppliers.length > 0) {
      const isDuplicate = existingSuppliers.some(s => s.id !== editingId);
      if (isDuplicate) {
        setErrorMsg('Fornecedor já criado');
        setIsSubmitting(false);
        return;
      }
    }

    const words = trimmedName.split(' ').filter(Boolean);
    let init = '';
    if (words.length > 0) init += words[0][0];
    if (words.length > 1) init += words[words.length - 1][0];
    const initials = init.toUpperCase() || 'SP';

    let error;
    if (editingId) {
      const res = await supabase.from('suppliers').update({
        name: trimmedName,
        contact: newSupplier.contact,
        email: newSupplier.email,
        initials: initials
      }).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('suppliers').insert([{
        name: trimmedName,
        contact: newSupplier.contact,
        email: newSupplier.email,
        initials: initials
      }]);
      error = res.error;
    }

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsModalOpen(false);
      setNewSupplier({ name: '', contact: '', email: '' });
      setEditingId(null);
      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fornecedores"
        description="Gerir e acompanhar os intervenientes da cadeia de abastecimento."
        action={
          <button 
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-sm"
          >
            <Plus size={18} />
            Adicionar Novo Fornecedor
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1 flex">
          <SearchInput 
            placeholder="Pesquisar por nome, contacto ou e-mail..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
            <Filter size={16} />
            Filtros
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
             <div className="flex p-8 justify-center h-full items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : (filteredSuppliers.length === 0) ? (
             <div className="flex flex-col items-center justify-center p-12 text-slate-400">
               <Filter size={48} className="mb-4 opacity-20" />
               <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nenhum fornecedor encontrado</p>
               <p className="text-sm">
                 {searchTerm ? 'Tente ajustar os termos da sua pesquisa' : 'Registe um novo fornecedor para começar a gerir'}
               </p>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Nome do Fornecedor</th>
                  <th className="px-6 py-4">Contacto Principal</th>
                  <th className="px-6 py-4">Endereço de E-mail</th>
                  <th className="px-6 py-4">RMAs Associados</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs border border-blue-200 dark:border-blue-800">
                          {supplier.initials}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{supplier.contact}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{supplier.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        {supplier.activeRMAs} ativos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(supplier)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar fornecedor"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar fornecedor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && (filteredSuppliers.length > 0) && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSuppliers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            itemName="fornecedores" 
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSupplier} className="p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa *</label>
                <input 
                  type="text" 
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="Ex: Tech Solutions Lda"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Contacto Principal</label>
                <input 
                  type="text" 
                  value={newSupplier.contact}
                  onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="Ex: João Silva - 912345678"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço de E-mail</label>
                <input 
                  type="email"
                  value={newSupplier.email}
                  onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="geral@techsolutions.pt"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'A Guardar...' : (editingId ? 'Atualizar Fornecedor' : 'Guardar Fornecedor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
