import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { SearchInput } from './ui/SearchInput';
import { Pagination } from './ui/Pagination';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    reference: '',
    brand: '',
    serialRequired: false,
    supplierId: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, supplier:suppliers(id, name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching products:', error);
    } else if (data) {
      const mapped = data.map(p => ({
        id: p.id,
        name: p.name,
        reference: p.reference || '',
        brand: p.brand || '',
        serialRequired: p.serial_required,
        supplierId: p.supplier_id,
        supplierName: p.supplier?.name
      }));
      setProducts(mapped);
    }
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name');
    if (!error && data) {
      setSuppliers(data);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  // Filter and Pagination logic
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.reference && product.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    setEditingId(null);
    setNewProduct({ name: '', reference: '', brand: '', serialRequired: false, supplierId: '' });
    setIsModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name,
      reference: product.reference || '',
      brand: product.brand,
      serialRequired: product.serialRequired,
      supplierId: product.supplierId || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o artigo "${name}"?
Os RMAs associados a este artigo podem ser afetados.`)) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Erro ao eliminar artigo: ' + error.message);
    } else {
      fetchProducts();
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    const trimmedRef = newProduct.reference?.trim() || '';

    if (trimmedRef) {
      // Check if product with same reference already exists
      const { data: existingProducts, error: checkError } = await supabase
        .from('products')
        .select('id')
        .ilike('reference', trimmedRef);

      if (checkError) {
        setErrorMsg('Erro ao verificar artigo: ' + checkError.message);
        setIsSubmitting(false);
        return;
      }

      if (existingProducts && existingProducts.length > 0) {
        const isDuplicate = existingProducts.some(p => p.id !== editingId);
        if (isDuplicate) {
          setErrorMsg('Artigo já criado');
          setIsSubmitting(false);
          return;
        }
      }
    }

    let error;
    const productPayload = {
        name: newProduct.name,
        reference: trimmedRef || null,
        brand: newProduct.brand || null,
        serial_required: newProduct.serialRequired,
        supplier_id: newProduct.supplierId || null
    };

    if (editingId) {
      const res = await supabase.from('products').update(productPayload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([productPayload]);
      error = res.error;
    }

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsModalOpen(false);
      setNewProduct({ name: '', reference: '', brand: '', serialRequired: false, supplierId: '' });
      setEditingId(null);
      fetchProducts();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão de Produtos"
        description="Faça a gestão e organize o seu catálogo mestre de produtos e artigos individuais."
        action={
          <button 
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} />
            Adicionar Produto
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1 flex">
          <SearchInput 
            placeholder="Pesquisar por nome, marca ou referência..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Todas as Categorias
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
           <div className="flex p-8 justify-center h-full items-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mt-12"></div>
           </div>
        ) : (filteredProducts.length === 0) ? (
           <div className="flex flex-col items-center justify-center p-12 text-slate-400">
             <Filter size={48} className="mb-4 opacity-20" />
             <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nenhum artigo encontrado</p>
             <p className="text-sm">
               {searchTerm ? 'Tente ajustar os termos da sua pesquisa' : 'Registe um novo produto no seu inventário.'}
             </p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Nome do Produto</th>
                  <th className="px-6 py-4">Fornecedor</th>
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4 text-center">Série Necessária</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                          <ImageIcon className="text-slate-400" size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{product.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            ID: {product.id.split('-')[0]} {product.reference && `• Ref: ${product.reference}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                      {product.supplierName || <span className="text-slate-400 italic">Sem fornecedor</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">{product.brand}</td>
                    <td className="px-6 py-4 text-center">
                      {product.serialRequired ? (
                        <CheckCircle className="text-emerald-500 mx-auto" size={20} />
                      ) : (
                        <XCircle className="text-slate-300 dark:text-slate-700 mx-auto" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(product)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar Artigo"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar Artigo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (filteredProducts.length > 0) && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            itemName="artigos" 
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar Artigo' : 'Adicionar Novo Produto'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Produto *</label>
                <input 
                  type="text" 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                  placeholder="Ex: NVIDIA RTX 4090"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Referência *</label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.reference}
                    onChange={e => setNewProduct({...newProduct, reference: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                    placeholder="Ex: SKU-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Marca</label>
                  <input 
                    type="text"
                    value={newProduct.brand}
                    onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none"
                    placeholder="Ex: ASUS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Fornecedor</label>
                <select 
                  value={newProduct.supplierId}
                  onChange={e => setNewProduct({...newProduct, supplierId: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="">Nenhum fornecedor selecionado</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-2">
                <input 
                  type="checkbox" 
                  id="serialRequired"
                  checked={newProduct.serialRequired}
                  onChange={e => setNewProduct({...newProduct, serialRequired: e.target.checked})}
                  className="size-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                />
                <label htmlFor="serialRequired" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Exige Número de Série?
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'A Guardar...' : (editingId ? 'Atualizar Artigo' : 'Guardar Produto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
