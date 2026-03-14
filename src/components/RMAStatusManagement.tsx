import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle, Palette, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';

interface RMAStatusItem {
  id: string;
  name: string;
  color: string;
  description: string;
  category: 'client' | 'supplier';
  created_at: string;
}

const COLOR_OPTIONS = [
  { name: 'Azul', value: 'azul', class: 'bg-blue-500' },
  { name: 'Âmbar', value: 'ambar', class: 'bg-amber-500' },
  { name: 'Laranja', value: 'laranja', class: 'bg-orange-500' },
  { name: 'Esmeralda', value: 'esmeralda', class: 'bg-emerald-500' },
  { name: 'Rosa', value: 'rosa', class: 'bg-rose-500' },
  { name: 'Roxo', value: 'roxo', class: 'bg-purple-500' },
  { name: 'Ciano', value: 'ciano', class: 'bg-cyan-500' },
  { name: 'Cinza', value: 'cinza', class: 'bg-slate-500' },
  { name: 'Índigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Verde Mar', value: 'teal', class: 'bg-teal-500' },
  { name: 'Lima', value: 'lime', class: 'bg-lime-500' },
  { name: 'Fúcsia', value: 'fuchsia', class: 'bg-fuchsia-500' },
];

const StatusCard: React.FC<{ 
  status: RMAStatusItem; 
  onEdit: (s: RMAStatusItem) => void; 
  onDelete: (id: string, name: string) => void | Promise<void>; 
  getColorClass: (c: string) => string;
}> = ({ status, onEdit, onDelete, getColorClass }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className={`size-10 rounded-lg ${getColorClass(status.color)} flex items-center justify-center text-white shadow-lg`}>
        <CheckCircle2 size={24} />
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(status)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={() => onDelete(status.id, status.name)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">{status.name}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
      {status.description || 'Sem descrição definida.'}
    </p>
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor: {status.color}</span>
      <span className={`size-3 rounded-full ${getColorClass(status.color)} shadow-sm`}></span>
    </div>
  </div>
);

export const RMAStatusManagement = () => {
  const [statuses, setStatuses] = useState<RMAStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    color: 'azul',
    description: '',
    category: 'client' as 'client' | 'supplier'
  });

  const fetchStatuses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rma_statuses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching statuses:', error);
      setErrorMsg('Erro ao carregar estados.');
    } else {
      setStatuses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const dataToSave = {
      name: formData.name,
      color: formData.color,
      description: formData.description,
      category: formData.category
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('rma_statuses')
        .update(dataToSave)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('rma_statuses')
        .insert([dataToSave]);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Já existe um estado com este nome.');
      } else {
        setErrorMsg(error.message);
      }
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', color: 'azul', description: '', category: 'client' });
      setEditingId(null);
      fetchStatuses();
    }
  };

  const handleEdit = (status: RMAStatusItem) => {
    setEditingId(status.id);
    setFormData({
      name: status.name,
      color: status.color,
      description: status.description || '',
      category: status.category || 'client'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o estado "${name}"? RMAs associados a este estado poderão ter problemas de visualização.`)) return;

    const { error } = await supabase
      .from('rma_statuses')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao eliminar estado: ' + error.message);
    } else {
      fetchStatuses();
    }
  };

  const filteredStatuses = statuses.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getColorClass = (colorName: string) => {
    const option = COLOR_OPTIONS.find(o => o.value === colorName);
    return option ? option.class : 'bg-slate-500';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Estados de RMA"
        description="Configure os diferentes passos do processo de RMA e as respetivas cores."
        action={
          <button 
            onClick={() => { setEditingId(null); setFormData({ name: '', color: 'azul', description: '', category: 'client' }); setIsModalOpen(true); }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-sm"
          >
            <Plus size={18} />
            Novo Estado
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1 flex">
          <SearchInput 
            placeholder="Pesquisar estados..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-12">
        {/* Client Statuses Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estados de RMA Cliente</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-400">A carregar estados...</div>
            ) : filteredStatuses.filter(s => s.category === 'client').length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200">Nenhum estado de cliente definido.</div>
            ) : filteredStatuses.filter(s => s.category === 'client').map((status) => (
              <StatusCard key={status.id} status={status} onEdit={handleEdit} onDelete={handleDelete} getColorClass={getColorClass} />
            ))}
          </div>
        </section>

        {/* Supplier Statuses Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estados de RMA Fornecedor</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? null : filteredStatuses.filter(s => s.category === 'supplier').length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200">Nenhum estado de fornecedor definido.</div>
            ) : filteredStatuses.filter(s => s.category === 'supplier').map((status) => (
              <StatusCard key={status.id} status={status} onEdit={handleEdit} onDelete={handleDelete} getColorClass={getColorClass} />
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Estado' : 'Adicionar Novo Estado'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Estado *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none"
                    placeholder="Ex: Recebida, Em Análise..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria *</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none font-bold"
                  >
                    <option value="client">Cliente</option>
                    <option value="supplier">Fornecedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor de Destaque</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: opt.value})}
                      className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                        formData.color === opt.value ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                      } ${opt.class}`}
                      title={opt.name}
                    >
                      {formData.color === opt.value && <div className="size-2 bg-white rounded-full shadow-sm"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none resize-none"
                  placeholder="O que significa este estado?"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? 'A Guardar...' : (editingId ? 'Atualizar' : 'Criar Estado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
