import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, X, AlertCircle, ChevronRight } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';
import { Pagination } from './ui/Pagination';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', type: 'Empresarial', contact: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching customers:', error);
      // Fallback in case table doesn't exist to at least not crash
      if (error.code === '42P01') {
         setErrorMsg('Tabela customers não existe na base de dados.');
      }
    } else if (data) {
      const mapped = data.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type || 'Padrão',
        contact: c.contact,
        email: c.email,
      }));
      setCustomers(mapped as Customer[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter and Pagination logic
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.contact && customer.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    setEditingId(null);
    setNewCustomer({ name: '', type: 'Empresarial', contact: '', email: '' });
    setIsModalOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingId(customer.id);
    setNewCustomer({ name: customer.name, type: customer.type, contact: customer.contact || '', email: customer.email || '' });
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o cliente "${name}"?
Esta ação irá remover permanentemente os dados. Os RMAs associados ficarão sem cliente.`)) return;
    
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      alert('Erro ao eliminar cliente: ' + error.message);
    } else {
      fetchCustomers();
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    const trimmedName = newCustomer.name.trim();

    // Check if customer with same name already exists
    const { data: existingCustomers, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', trimmedName);

    if (checkError) {
      setErrorMsg('Erro ao verificar cliente: ' + checkError.message);
      setIsSubmitting(false);
      return;
    }

    if (existingCustomers && existingCustomers.length > 0) {
      const isDuplicate = existingCustomers.some(c => c.id !== editingId);
      if (isDuplicate) {
        setErrorMsg('Cliente já criado');
        setIsSubmitting(false);
        return;
      }
    }

    let error;
    if (editingId) {
      const res = await supabase.from('customers').update({
        name: trimmedName,
        type: newCustomer.type,
        contact: newCustomer.contact,
        email: newCustomer.email
      }).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('customers').insert([{
        name: trimmedName,
        type: newCustomer.type,
        contact: newCustomer.contact,
        email: newCustomer.email
      }]);
      error = res.error;
    }

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsModalOpen(false);
      setNewCustomer({ name: '', type: 'Empresarial', contact: '', email: '' });
      setEditingId(null);
      fetchCustomers();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        description="Faça a gestão dos clientes e do seu histórico de reparações."
        action={
          <button 
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-sm"
          >
            <Plus size={18} />
            Adicionar Novo Cliente
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
          ) : (filteredCustomers.length === 0) ? (
             <div className="flex flex-col items-center justify-center p-12 text-slate-400">
               <Filter size={48} className="mb-4 opacity-20" />
               <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nenhum cliente encontrado</p>
               <p className="text-sm">
                 {searchTerm ? 'Tente ajustar os termos da sua pesquisa' : 'Registe um novo cliente para começar a gerir'}
               </p>
               {errorMsg && <p className="text-red-500 mt-2 text-xs">{errorMsg}</p>}
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Nome do Cliente</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-black text-xs border border-slate-200 dark:border-slate-700">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        customer.type === 'Empresarial' 
                          ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                      } border`}>
                        {customer.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{customer.contact || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar cliente"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id, customer.name); }}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar cliente"
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
        {!loading && (filteredCustomers.length > 0) && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            itemName="clientes" 
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCustomer} className="p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="Ex: João Silva ou Empresa Lda"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Cliente</label>
                <select 
                  value={newCustomer.type}
                  onChange={e => setNewCustomer({...newCustomer, type: e.target.value as 'Empresarial' | 'Padrão' | 'Cliente Final'})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="Empresarial">Empresarial</option>
                  <option value="Padrão">Padrão</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Contacto</label>
                <input 
                  type="text" 
                  value={newCustomer.contact}
                  onChange={e => setNewCustomer({...newCustomer, contact: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="Ex: 912345678"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço de E-mail</label>
                <input 
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="email@exemplo.pt"
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
                  {isSubmitting ? 'A Guardar...' : (editingId ? 'Atualizar Cliente' : 'Guardar Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
