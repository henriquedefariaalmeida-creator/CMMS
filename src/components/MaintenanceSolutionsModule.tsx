import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Camera, Save, X, Filter, Edit2, Clock, Upload } from 'lucide-react';
import { MaintenanceSolution, Asset } from '../types';
import { createDocument, subscribeToCollection, deleteDocument } from '../firebase';
import { format } from 'date-fns';

export const MaintenanceSolutionsModule = () => {
  const [solutions, setSolutions] = useState<MaintenanceSolution[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    maquina: '',
    grupo: '' as any,
    equipamentoId: '',
    tipo: '' as any,
    problema: '',
    solucao: '',
    tags: '',
    obs: ''
  });
  const [loading, setLoading] = useState(false);

  const filteredAssets = assets.filter(a => {
    if (!formData.grupo) return true;
    const searchString = `${a.Description} ${a.Tag}`.toLowerCase();
    return searchString.includes(formData.grupo.toLowerCase());
  });

  const handleOpenModal = () => {
    setFormData({
        maquina: '',
        grupo: '',
        equipamentoId: '',
        tipo: '',
        problema: '',
        solucao: '',
        tags: '',
        obs: ''
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    const unsubSolutions = subscribeToCollection<MaintenanceSolution>('maintenanceSolutions', setSolutions);
    const unsubAssets = subscribeToCollection<Asset>('assets', setAssets);
    return () => { unsubSolutions(); unsubAssets(); };
  }, []);

  const handleEquipmentChange = (equipamentoId: string) => {
    const selectedAsset = assets.find(a => a.id === equipamentoId);
    if (!selectedAsset) return;

    // Infer group from asset description/tag
    const searchString = `${selectedAsset.Description} ${selectedAsset.Tag}`.toLowerCase();
    
    let grupo: 'Cordeira' | 'Trefila' | 'Monofio' | 'Bead Wire' = 'Cordeira'; // Default
    if (searchString.includes('cordeira')) grupo = 'Cordeira';
    else if (searchString.includes('trefila')) grupo = 'Trefila';
    else if (searchString.includes('monofio')) grupo = 'Monofio';
    else if (searchString.includes('bead wire')) grupo = 'Bead Wire';

    setFormData(prev => ({
      ...prev,
      equipamentoId,
      grupo,
      tags: selectedAsset.Tag
    }));
  };

  const handleSave = async () => {
    if (!formData.equipamentoId || !formData.problema || !formData.solucao || !formData.grupo || !formData.tipo) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    setLoading(true);
    try {
      const selectedAsset = assets.find(a => a.id === formData.equipamentoId);
      const newSolution: Omit<MaintenanceSolution, 'id'> = {
        ...formData,
        maquina: selectedAsset ? selectedAsset.Tag : 'Desconhecido',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(t => t),
        imagens: [],
        createdAt: new Date().toISOString()
      };
      await createDocument('maintenanceSolutions', newSolution);
      setFormData({ maquina: '', grupo: 'Cordeira', equipamentoId: '', tipo: 'Mecânico', problema: '', solucao: '', tags: '', obs: '' });
      setIsModalOpen(false);
      alert('Solução registrada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar solução');
    } finally {
      setLoading(false);
    }
  };

  const filteredSolutions = solutions.filter(s => 
    s.maquina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Soluções de Manutenção</h2>
        <button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition shadow-sm">
          <Plus size={20} /> Nova Solução
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-xl text-gray-800">Registrar Solução</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500"/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Grupo</label>
                    <select className="border border-gray-300 p-2.5 rounded-lg text-sm" value={formData.grupo} onChange={e => setFormData({...formData, grupo: e.target.value as any})}>
                        <option value="">Selecionar Grupo</option>
                        {['Cordeira', 'Trefila', 'Monofio', 'Bead Wire'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Equipamento</label>
                    <select className="border border-gray-300 p-2.5 rounded-lg text-sm" value={formData.equipamentoId} onChange={e => handleEquipmentChange(e.target.value)}>
                        <option value="">Selecione o Equipamento</option>
                        {filteredAssets.map(a => <option key={a.id} value={a.id}>{a.Description.includes(' - ') ? a.Description.split(' - ')[1] : a.Description}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tipo da Solução</label>
                    <select className="border border-gray-300 p-2.5 rounded-lg text-sm" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                        <option value="">Selecionar Tipo</option>
                        {['Mecânico', 'Elétrico', 'Automação', 'Outros'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tags</label>
                    <input className="border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-100" placeholder="Tags (informe o equipamento)" value={formData.tags} readOnly />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Descrição do Problema</label>
                    <textarea className="border border-gray-300 p-2.5 rounded-lg text-sm h-20" placeholder="Descreva o problema aqui..." value={formData.problema} onChange={e => setFormData({...formData, problema: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Solução Aplicada</label>
                    <textarea className="border border-gray-300 p-2.5 rounded-lg text-sm h-20" placeholder="Descreva a solução aplicada..." value={formData.solucao} onChange={e => setFormData({...formData, solucao: e.target.value})} />
                </div>
                <label className="col-span-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-3 rounded-lg text-gray-500 hover:bg-gray-50 text-sm cursor-pointer">
                    <Upload size={18} /> Adicionar Fotos
                    <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => console.log('Files selected:', e.target.files)} />
                </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button className="px-4 py-2 border rounded-lg" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="bg-blue-700 text-white px-6 py-2 rounded-lg" onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input className="w-full pl-10 p-2.5 bg-gray-50 border rounded-lg outline-none" placeholder="Buscar soluções..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="border p-2.5 rounded-lg text-sm bg-gray-50">
            <option>Todas as Máquinas</option>
        </select>
        <select className="border p-2.5 rounded-lg text-sm bg-gray-50">
            <option>Todos os Tipos</option>
        </select>
        <select className="border p-2.5 rounded-lg text-sm bg-gray-50">
            <option>Mais recentes</option>
        </select>
        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium whitespace-nowrap">
          <Filter size={18} /> Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredSolutions.map(s => (
          <div key={s.id} className="bg-white p-6 shadow-sm border border-gray-100 rounded-xl flex items-start gap-4 hover:shadow-md transition">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              <Camera size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg text-gray-900">{s.maquina} <span className="text-sm text-gray-500 font-normal">({s.grupo})</span></h4>
                    <span className="text-sm text-gray-600">Equipamento: {assets.find(a => a.id === s.equipamentoId)?.Tag || s.equipamentoId}</span>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    s.tipo === 'Mecânico' ? 'bg-amber-100 text-amber-800' :
                    s.tipo === 'Elétrico' ? 'bg-blue-100 text-blue-800' :
                    s.tipo === 'Automação' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{s.tipo}</span>
                  <button className="text-gray-400 hover:text-blue-600" onClick={() => {
                        setIsModalOpen(true);
                        setFormData({
                            maquina: s.maquina,
                            grupo: s.grupo,
                            equipamentoId: s.equipamentoId,
                            tipo: s.tipo,
                            problema: s.problema,
                            solucao: s.solucao,
                            tags: s.tags.join(','),
                            obs: s.obs || ''
                        });
                  }}><Edit2 size={16} /></button>
                  <button className="text-gray-400 hover:text-red-600" onClick={() => deleteDocument('maintenanceSolutions', s.id)} title="Excluir"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="mt-2 text-gray-700 font-medium">Problema:</p>
              <p className="text-gray-600">{s.problema}</p>
              <p className="mt-2 text-gray-700 font-medium">Solução:</p>
              <p className="text-gray-600">{s.solucao}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {s.tags.map(t => <span key={t} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-md font-mono">{t}</span>)}
              </div>
              <p className="text-xs text-gray-400 mt-4 flex items-center gap-1"><Clock size={12}/> {format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
