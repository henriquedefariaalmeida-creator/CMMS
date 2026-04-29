import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Trash2, Camera, Save, X, Filter, Edit2, 
  Clock, Upload, FileText, Printer, BookOpen, AlertCircle, 
  ChevronRight, ArrowRight, CheckCircle2, Image as ImageIcon,
  MoreVertical, Download, Eye, LayoutGrid, List,
  Settings, RefreshCw, Activity
} from 'lucide-react';
import { TechnicalKnowledge, Asset, KnowledgeStep, UserProfile } from '../types';
import { createDocument, subscribeToCollection, deleteDocument, updateDocument, db, collection, getDocs, query } from '../firebase';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

interface TechnicalKnowledgeModuleProps {
  assets: Asset[];
  userProfile: UserProfile | null;
}

export const TechnicalKnowledgeModule: React.FC<TechnicalKnowledgeModuleProps> = ({ assets, userProfile }) => {
  const [knowledgeList, setKnowledgeList] = useState<TechnicalKnowledge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<TechnicalKnowledge | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cascade State
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');

  const [formData, setFormData] = useState<Partial<TechnicalKnowledge>>({
    title: '',
    followUpLead: userProfile?.displayName || '',
    dateTime: new Date().toISOString().slice(0, 16),
    failureSummary: '',
    actionSummary: '',
    rootCause: '',
    solutionSummary: '',
    specialty: 'Mecânica',
    steps: [],
    problemPhoto: '',
    resultPhoto: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Asset Cascade Data
  const regions = useMemo(() => Array.from(new Set(assets.map(a => a.Location || 'Não Definido'))).sort(), [assets]);
  const models = useMemo(() => {
    if (!selectedLocation) return [];
    return Array.from(new Set(assets.filter(a => (a.Location || 'Não Definido') === selectedLocation).map(a => a.Model || 'Genérico'))).sort();
  }, [assets, selectedLocation]);
  const equipments = useMemo(() => {
    if (!selectedLocation || !selectedModel) return [];
    return assets.filter(a => 
      (a.Location || 'Não Definido') === selectedLocation && 
      (a.Model || 'Genérico') === selectedModel
    ).sort((a, b) => (a.Tag || '').localeCompare(b.Tag || ''));
  }, [assets, selectedLocation, selectedModel]);

  useEffect(() => {
    const unsub = subscribeToCollection<TechnicalKnowledge>('technicalKnowledge', (records) => {
      setKnowledgeList(records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, []);

  const handleCreateStep = () => {
    const newStep: KnowledgeStep = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      image: ''
    };
    setFormData(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));
  };

  const handleUpdateStep = (id: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).map(step => step.id === id ? { ...step, text } : step)
    }));
  };

  const handleRemoveStep = (id: string) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).filter(step => step.id !== id)
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string, stepId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (stepId) {
        setFormData(prev => ({
          ...prev,
          steps: (prev.steps || []).map(step => step.id === stepId ? { ...step, image: base64 } : step)
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const openForm = (record?: TechnicalKnowledge) => {
    if (record) {
      setEditingId(record.id);
      setFormData(record);
      setSelectedLocation(record.location);
      setSelectedModel(record.model);
      setSelectedEquipment(record.equipmentTag);
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        followUpLead: userProfile?.displayName || '',
        dateTime: new Date().toISOString().slice(0, 16),
        failureSummary: '',
        actionSummary: '',
        rootCause: '',
        solutionSummary: '',
        specialty: 'Mecânica',
        steps: [],
        problemPhoto: '',
        resultPhoto: '',
      });
      setSelectedLocation('');
      setSelectedModel('');
      setSelectedEquipment('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !selectedEquipment) {
      alert('Por favor, preencha o título e selecione o equipamento.');
      return;
    }

    setLoading(true);
    try {
      const selectedAsset = assets.find(a => a.Tag === selectedEquipment);
      const data: Omit<TechnicalKnowledge, 'id'> = {
        ...(formData as TechnicalKnowledge),
        location: selectedLocation,
        model: selectedModel,
        equipment: selectedAsset ? selectedAsset.Description : '',
        equipmentTag: selectedEquipment,
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userProfile?.uid || 'anon',
      };

      if (editingId) {
        await updateDocument('technicalKnowledge', editingId, data);
      } else {
        await createDocument('technicalKnowledge', data);
      }

      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar registro.');
    } finally {
      setLoading(false);
    }
  };

  const filteredKnowledge = knowledgeList.filter(k => 
    k.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.followUpLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.equipmentTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.equipment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateReport = (record: TechnicalKnowledge) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CONHECIMENTO TÉCNICO', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 28);

    // Basic Info Table
    const basicInfo = [
      ['Título', record.title],
      ['Ativo', `${record.equipmentTag} - ${record.equipment}`],
      ['Localização', `${record.location} / ${record.model}`],
      ['Responsável', record.followUpLead],
      ['Data/Hora', format(new Date(record.dateTime), 'dd/MM/yyyy HH:mm')],
      ['Especialidade', record.specialty]
    ];

    (doc as any).autoTable({
      startY: 45,
      head: [['Campo', 'Informação']],
      body: basicInfo,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Summaries
    const summaries = [
      ['Resumo da Falha', record.failureSummary],
      ['Causa Raiz', record.rootCause],
      ['Ação de Bloqueio', record.actionSummary],
      ['Resumo da Solução', record.solutionSummary]
    ];

    (doc as any).autoTable({
      startY: currentY,
      head: [['Seção', 'Conteúdo']],
      body: summaries,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Photos Section
    if (record.problemPhoto || record.resultPhoto) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('EVIDÊNCIAS GERAIS', 15, currentY);
      currentY += 10;

      if (record.problemPhoto) {
        try {
          doc.addImage(record.problemPhoto, 'JPEG', 15, currentY, 80, 60);
          doc.setFontSize(8);
          doc.text('SITUAÇÃO ANTERIOR / PROBLEMA', 15, currentY + 65);
        } catch (e) {
          doc.text('[Erro ao carregar imagem do problema]', 15, currentY + 30);
        }
      }

      if (record.resultPhoto) {
        try {
          doc.addImage(record.resultPhoto, 'JPEG', 105, currentY, 80, 60);
          doc.setFontSize(8);
          doc.text('SITUAÇÃO ATUAL / RESULTADO', 105, currentY + 65);
        } catch (e) {
          doc.text('[Erro ao carregar imagem do resultado]', 105, currentY + 30);
        }
      }
      currentY += 75;
    }

    // Steps Section
    if (record.steps && record.steps.length > 0) {
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PASSO A PASSO TÉCNICO', 15, currentY);
      currentY += 10;

      record.steps.forEach((step, index) => {
        if (currentY > 230) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Passo ${index + 1}:`, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(step.text, 35, currentY, { maxWidth: 150 });
        
        const textHeight = doc.getTextDimensions(step.text, { maxWidth: 150 }).h;
        currentY += Math.max(10, textHeight + 5);

        if (step.image) {
          if (currentY > 220) { doc.addPage(); currentY = 20; }
          try {
            doc.addImage(step.image, 'JPEG', 15, currentY, 60, 45);
            currentY += 55;
          } catch (e) {
            currentY += 10;
          }
        } else {
          currentY += 5;
        }
      });
    }

    doc.save(`Conhecimento_${record.equipmentTag}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const generateGlobalReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Inventário de Conhecimento Técnico', 15, 20);
    
    const tableData = filteredKnowledge.map(k => [
      format(new Date(k.dateTime), 'dd/MM/yyyy'),
      k.title,
      `${k.equipmentTag} - ${k.equipment}`,
      k.specialty,
      k.followUpLead
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Data', 'Título', 'Ativo', 'Especialidade', 'Responsável']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save('Inventario_Conhecimento_Tecnico.pdf');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Gestão de Conhecimento</h1>
            <p className="text-slate-500 text-sm font-medium">Documentação técnica industrial PRO</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar lições aprendidas..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
          <button 
            onClick={generateGlobalReport}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            title="Exportar Lista"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => openForm()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="popLayout">
          {viewMode === 'grid' ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredKnowledge.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id}
                  className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-slate-200 overflow-hidden">
                    {item.problemPhoto ? (
                      <img src={item.problemPhoto} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                        item.specialty === 'Mecânica' ? 'bg-amber-500/80 text-white' :
                        item.specialty === 'Elétrica' ? 'bg-blue-500/80 text-white' :
                        item.specialty === 'Automação' ? 'bg-purple-500/80 text-white' :
                        'bg-slate-500/80 text-white'
                      }`}>
                        {item.specialty}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                       <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openForm(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteDocument('technicalKnowledge', item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.equipmentTag}</span>
                    </div>

                    <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 italic">
                      "{item.failureSummary}"
                    </p>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold uppercase">
                            {item.followUpLead.substring(0, 2)}
                          </div>
                          <div className="text-[10px]">
                            <p className="font-bold text-slate-800 leading-none mb-0.5">{item.followUpLead}</p>
                            <p className="text-slate-400">{format(new Date(item.dateTime), 'dd/MM/yyyy')}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => setViewingRecord(item)}
                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-100"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Título</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Equipamento</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Especialidade</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKnowledge.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{format(new Date(item.dateTime), 'dd/MM/yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.followUpLead}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{item.equipmentTag}</span>
                           <span className="text-xs text-slate-500">{item.equipment}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.specialty === 'Mecânica' ? 'bg-amber-100 text-amber-800' :
                          item.specialty === 'Elétrica' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {item.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewingRecord(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openForm(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteDocument('technicalKnowledge', item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[60]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
          >
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                   <Plus className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Editar Conhecimento' : 'Novo Registro de Conhecimento'}</h2>
                   <p className="text-slate-500 text-sm font-medium">Preencha todos os detalhes técnicos da lição aprendida</p>
                 </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                 <X className="w-6 h-6 text-slate-500" />
               </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-white space-y-10">
               {/* Seção 1: Informações Básicas */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                         <FileText className="w-4 h-4 text-indigo-600" />
                         Título do Conhecimento
                       </label>
                       <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Melhoria no resfriamento do motor principal da trefila..."
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                       />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Responsável</label>
                          <input 
                            type="text" 
                            disabled
                            value={formData.followUpLead}
                            className="w-full px-5 py-3 bg-slate-100 border-none rounded-xl text-slate-500 font-medium cursor-not-allowed"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Data e Hora</label>
                          <input 
                            type="datetime-local" 
                            value={formData.dateTime}
                            onChange={e => setFormData({...formData, dateTime: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                       <Settings className="w-4 h-4 text-indigo-600" />
                       Vinculação de Ativo
                     </h4>
                     <div className="space-y-4">
                        <select 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={selectedLocation}
                          onChange={e => { setSelectedLocation(e.target.value); setSelectedModel(''); setSelectedEquipment(''); }}
                        >
                          <option value="">1. Localização</option>
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                          disabled={!selectedLocation}
                          value={selectedModel}
                          onChange={e => { setSelectedModel(e.target.value); setSelectedEquipment(''); }}
                        >
                          <option value="">2. Modelo/Família</option>
                          {models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                          disabled={!selectedModel}
                          value={selectedEquipment}
                          onChange={e => setSelectedEquipment(e.target.value)}
                        >
                          <option value="">3. Equipamento (Tag)</option>
                          {equipments.map(e => <option key={e.Tag} value={e.Tag}>{e.Tag} - {e.Description}</option>)}
                        </select>

                        <div className="pt-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Especialidade</label>
                           <div className="flex flex-wrap gap-2">
                              {['Mecânica', 'Elétrica', 'Automação', 'Hidráulica', 'Pneumática'].map(s => (
                                <button 
                                  key={s}
                                  onClick={() => setFormData({...formData, specialty: s as any})}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    formData.specialty === s 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Seção 2: Resumos Técnicos */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Resumo da Falha / Problema</label>
                    <textarea 
                      value={formData.failureSummary}
                      onChange={e => setFormData({...formData, failureSummary: e.target.value})}
                      placeholder="Identulação inicial do defeito..."
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Causa Raiz</label>
                    <textarea 
                      value={formData.rootCause}
                      onChange={e => setFormData({...formData, rootCause: e.target.value})}
                      placeholder="Por que ocorreu o problema? (Análise técnica)"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Ação de Bloqueio</label>
                    <textarea 
                      value={formData.actionSummary}
                      onChange={e => setFormData({...formData, actionSummary: e.target.value})}
                      placeholder="Ação imediata para conter a falha..."
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Resumo da Solução Definitiva</label>
                    <textarea 
                      value={formData.solutionSummary}
                      onChange={e => setFormData({...formData, solutionSummary: e.target.value})}
                      placeholder="Procedimento realizado para solução final..."
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none min-h-[120px]"
                    />
                  </div>
               </div>

               {/* Seção 3: Galeria de Fotos Gerais */}
               <div className="space-y-4 pt-6">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    Evidências Fotográficas Gerais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foto do Problema (Antes)</p>
                      <label className="relative flex flex-col items-center justify-center h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all overflow-hidden group">
                        {formData.problemPhoto ? (
                          <>
                            <img src={formData.problemPhoto} alt="Problema" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <Camera className="w-10 h-10 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Upload className="w-8 h-8" />
                            <span className="text-sm font-medium">Upload de Foto do Problema</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'problemPhoto')} />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foto do Resultado (Depois)</p>
                      <label className="relative flex flex-col items-center justify-center h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all overflow-hidden group">
                        {formData.resultPhoto ? (
                          <>
                            <img src={formData.resultPhoto} alt="Resultado" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <Camera className="w-10 h-10 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Upload className="w-8 h-8" />
                            <span className="text-sm font-medium">Upload de Foto do Resultado</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'resultPhoto')} />
                      </label>
                    </div>
                  </div>
               </div>

               {/* Seção 4: Passo a Passo Técnico */}
               <div className="space-y-6 pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                       <LayoutGrid className="w-5 h-5 text-indigo-600" />
                       Passo a Passo do Procedimento
                    </h4>
                    <button 
                      onClick={handleCreateStep}
                      className="px-4 py-2 bg-slate-100 text-indigo-600 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Adicionar Passo
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.steps?.map((step, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={step.id} 
                        className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-6 relative group"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <textarea 
                            value={step.text}
                            placeholder={`Descreva o que foi feito no passo ${index + 1}...`}
                            onChange={e => handleUpdateStep(step.id, e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]"
                          />
                          
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                              <Camera className="w-4 h-4 text-indigo-500" />
                              {step.image ? 'Alterar Imagem' : 'Vincular Imagem'}
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, '', step.id)} />
                            </label>
                            {step.image && (
                              <div className="h-12 w-20 rounded-lg overflow-hidden border border-slate-200">
                                <img src={step.image} alt="Passo" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveStep(step.id)}
                          className="absolute -top-3 -right-3 p-2 bg-white text-rose-500 border border-slate-100 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}

                    {(!formData.steps || formData.steps.length === 0) && (
                      <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                        <List className="w-12 h-12 opacity-10 mb-4" />
                        <p className="font-medium">Nenhum passo definido para este procedimento.</p>
                        <button onClick={handleCreateStep} className="mt-4 text-indigo-600 font-bold hover:underline">Adicionar o primeiro passo</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
               <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-all font-inter"
               >
                 Descartar
               </button>
               <button 
                onClick={handleSave}
                disabled={loading}
                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
               >
                 {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 {editingId ? 'Atualizar Registro' : 'Salvar Conhecimento'}
               </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-[60]">
           <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col print:m-0 print:rounded-none print:shadow-none"
           >
              {/* Toolbar Viewer */}
              <div className="px-8 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
                 <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Visualização de Documento Tecnico</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => generateReport(viewingRecord)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button 
                      onClick={() => setViewingRecord(null)}
                      className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              {/* Document Proper */}
              <div className="flex-1 overflow-y-auto p-12 bg-white print:bg-white print:p-0">
                 {/* Print Header */}
                 <div className="hidden print:flex items-center justify-between mb-8 pb-4 border-b-4 border-slate-900">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 uppercase">Relatório de Conhecimento Técnico</h1>
                      <p className="text-xs text-slate-500 font-bold">Documento de Engenharia de Manutenção</p>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-slate-900">{viewingRecord.equipmentTag} - {viewingRecord.equipment}</p>
                       <p className="text-[10px] text-slate-500 uppercase">{viewingRecord.location} / {viewingRecord.model}</p>
                    </div>
                 </div>

                 {/* Head info */}
                 <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                       <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-100 print:bg-slate-900">
                         {viewingRecord.specialty}
                       </span>
                       <span className="text-sm font-bold text-slate-400">#KNOW-{viewingRecord.id.substring(0,6).toUpperCase()}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-6 leading-tight">{viewingRecord.title}</h1>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 print:bg-white print:border-slate-200">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Responsável</p>
                          <p className="font-bold text-slate-800">{viewingRecord.followUpLead}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Equipamento</p>
                          <p className="font-bold text-slate-800">{viewingRecord.equipmentTag}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data</p>
                          <p className="font-bold text-slate-800">{format(new Date(viewingRecord.dateTime), 'dd/MM/yyyy')}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                          <div className="flex items-center gap-1.5 text-emerald-600">
                             <CheckCircle2 className="w-4 h-4" />
                             <span className="font-bold">Consolidado</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Content sections */}
                 <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b-2 border-slate-100 pb-2 uppercase tracking-wide">
                            <AlertCircle className="w-5 h-5 text-indigo-600" />
                            Defeito Encontrado
                          </h2>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            {viewingRecord.failureSummary}
                          </p>
                       </div>
                       <div className="space-y-4">
                          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b-2 border-slate-100 pb-2 uppercase tracking-wide">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Causa Raiz
                          </h2>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            {viewingRecord.rootCause}
                          </p>
                       </div>
                    </div>

                    {/* Step by step Viewer */}
                    <div className="space-y-8">
                       <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-4">
                         Procedimento Técnico Detalhado
                       </h2>
                       <div className="space-y-8">
                          {viewingRecord.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-8 group">
                               <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-slate-200">
                                 {idx + 1}
                               </div>
                               <div className="flex-1 space-y-6">
                                 <p className="text-lg font-bold text-slate-800 leading-snug pt-1">
                                   {step.text}
                                 </p>
                                 {step.image && (
                                   <div className="max-w-2xl rounded-3xl overflow-hidden border border-slate-100 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                                      <img src={step.image} alt={`Passo ${idx+1}`} className="w-full object-contain max-h-[400px] bg-slate-50" />
                                   </div>
                                 )}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Final Evidences */}
                    {(viewingRecord.problemPhoto || viewingRecord.resultPhoto) && (
                      <div className="pt-12 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 print:pt-6">
                         {viewingRecord.problemPhoto && (
                           <div className="space-y-4">
                              <p className="text-center font-black text-slate-400 text-xs uppercase tracking-[0.2em]">Evidência: Problema</p>
                              <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
                                <img src={viewingRecord.problemPhoto} alt="Problema" className="w-full h-full object-cover aspect-video" />
                              </div>
                           </div>
                         )}
                         {viewingRecord.resultPhoto && (
                           <div className="space-y-4">
                              <p className="text-center font-black text-indigo-600 text-xs uppercase tracking-[0.2em]">Evidência: Solução Aplicada</p>
                              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-50">
                                <img src={viewingRecord.resultPhoto} alt="Resultado" className="w-full h-full object-cover aspect-video" />
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                 </div>

                 {/* Print Footer */}
                 <div className="hidden print:flex justify-between items-center mt-20 pt-8 border-t border-slate-200">
                    <div className="text-center">
                       <div className="w-48 border-b border-slate-400 mb-2"></div>
                       <p className="text-[10px] font-bold text-slate-500 uppercase">Assinatura do Responsável</p>
                       <p className="text-xs font-black text-slate-900">{viewingRecord.followUpLead}</p>
                    </div>
                    <div className="text-center">
                       <div className="w-48 border-b border-slate-400 mb-2"></div>
                       <p className="text-[10px] font-bold text-slate-500 uppercase">Assinatura do Coordenador</p>
                    </div>
                    <div className="text-right text-[8px] text-slate-400 italic">
                       Documento gerado pelo sistema CMMS Pro. <br /> ID: {viewingRecord.id}
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:border-slate-200 { border-color: #e2e8f0 !important; }
          .fixed.inset-0 { visibility: visible !important; background: white !important; position: absolute !important; }
          .fixed.inset-0 > div { visibility: visible !important; width: 100% !important; max-width: 100% !important; height: auto !important; max-height: none !important; overflow: visible !important; position: static !important; }
          .fixed.inset-0 div, .fixed.inset-0 h1, .fixed.inset-0 h2, .fixed.inset-0 p, .fixed.inset-0 span, .fixed.inset-0 img { visibility: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
};
