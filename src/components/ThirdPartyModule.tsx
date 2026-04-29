import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  Pencil, 
  Trash2, 
  Building2, 
  Users, 
  DollarSign, 
  Phone, 
  Mail, 
  FileText,
  Star,
  Calendar,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ThirdPartyCompany, Employee } from '../types';
import { createDocument, updateDocument, deleteDocument } from '../firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ThirdPartyModuleProps {
  companies: ThirdPartyCompany[];
  employees: Employee[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  isAdmin?: boolean;
  currentUserUid?: string;
}

export const ThirdPartyModule = ({
  companies,
  employees,
  onRefresh,
  showToast,
  isAdmin = false,
  currentUserUid = ''
}: ThirdPartyModuleProps) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ThirdPartyCompany | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    contactName: '',
    email: '',
    phone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    type: 'Fixo' as 'Fixo' | 'Temporário',
    contractNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    performanceRating: 5
  });

  useEffect(() => {
    if (editingCompany) {
      setFormData({
        name: editingCompany.name,
        cnpj: editingCompany.cnpj || '',
        contactName: editingCompany.contactName || '',
        email: editingCompany.email || '',
        phone: editingCompany.phone || '',
        status: editingCompany.status,
        type: editingCompany.type || 'Fixo',
        contractNumber: editingCompany.contractNumber || '',
        contractStartDate: editingCompany.contractStartDate || '',
        contractEndDate: editingCompany.contractEndDate || '',
        performanceRating: editingCompany.performanceRating || 5
      });
    } else {
      setFormData({
        name: '',
        cnpj: '',
        contactName: '',
        email: '',
        phone: '',
        status: 'Ativo',
        type: 'Fixo',
        contractNumber: '',
        contractStartDate: '',
        contractEndDate: '',
        performanceRating: 5
      });
    }
  }, [editingCompany, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateDocument('thirdPartyCompanies', editingCompany.id, formData);
        showToast('Empresa atualizada com sucesso!');
      } else {
        const id = `TPC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        await createDocument('thirdPartyCompanies', { 
          ...formData, 
          id, 
          createdAt: new Date().toISOString(),
          createdBy: currentUserUid 
        }, id);
        showToast('Empresa cadastrada com sucesso!');
      }
      setShowModal(false);
      setEditingCompany(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving company:', error);
      showToast('Erro ao salvar empresa', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument('thirdPartyCompanies', id);
      showToast('Empresa excluída com sucesso!');
      setCompanyToDelete(null);
      if (selectedCompanyId === id) {
        setSelectedCompanyId(null);
      }
      onRefresh();
    } catch (error) {
      console.error('Error deleting company:', error);
      showToast('Erro ao excluir empresa', 'error');
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cnpj || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [companies, search]);

  const getCompanyEmployees = (companyId: string) => {
    return employees.filter(emp => emp.companyId === companyId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Empresas</h3>
          <p className="text-sm text-slate-500">Gerencie as empresas parceiras e seus colaboradores</p>
        </div>
        <button 
          onClick={() => {
            setEditingCompany(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Empresa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companies List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar empresas..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full shadow-sm"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
            {filteredCompanies.map(company => (
              <motion.div
                layout
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group",
                  selectedCompanyId === company.id 
                    ? "bg-blue-50 border-blue-200 shadow-md shadow-blue-100" 
                    : "bg-white border-slate-100 hover:border-blue-100 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedCompanyId === company.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{company.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{company.cnpj || 'Sem CNPJ'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCompany(company);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompanyToDelete(company.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-medium",
                        company.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {company.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {company.type || 'Fixo'}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-400 space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{getCompanyEmployees(company.id).length} colaboradores</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Company Details & Employees */}
        <div className="lg:col-span-2">
          {selectedCompanyId ? (
            <div className="space-y-6">
              {/* Company Info Card */}
              {companies.find(c => c.id === selectedCompanyId) && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-slate-900">Informações da Empresa</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">ID: {selectedCompanyId}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Tipo</p>
                          <p className="text-slate-700 font-medium">{companies.find(c => c.id === selectedCompanyId)?.type || 'Fixo'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</p>
                          <p className="text-slate-700 font-medium">{companies.find(c => c.id === selectedCompanyId)?.cnpj || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone</p>
                          <p className="text-slate-700 font-medium">{companies.find(c => c.id === selectedCompanyId)?.phone || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Star className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Avaliação</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star}
                                className={cn(
                                  "w-3 h-3",
                                  star <= (companies.find(c => c.id === selectedCompanyId)?.performanceRating || 0) 
                                    ? "fill-amber-400 text-amber-400" 
                                    : "text-slate-200"
                                )} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                          <p className="text-slate-700 font-medium">{companies.find(c => c.id === selectedCompanyId)?.email || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contato Principal</p>
                          <p className="text-slate-700 font-medium">{companies.find(c => c.id === selectedCompanyId)?.contactName || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contrato</p>
                          <p className="text-slate-700 font-medium">
                            {companies.find(c => c.id === selectedCompanyId)?.contractNumber || 'Sem contrato'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contract Dates Banner */}
                  {companies.find(c => c.id === selectedCompanyId)?.contractStartDate && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Início: <span className="text-slate-700 ml-1">{companies.find(c => c.id === selectedCompanyId)?.contractStartDate}</span></div>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Vencimento: <span className="text-slate-700 ml-1">{companies.find(c => c.id === selectedCompanyId)?.contractEndDate || '-'}</span></div>
                        </div>
                      </div>
                      {companies.find(c => c.id === selectedCompanyId)?.contractEndDate && (
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold",
                          new Date(companies.find(c => c.id === selectedCompanyId)!.contractEndDate!) < new Date() 
                            ? "bg-rose-100 text-rose-700" 
                            : "bg-emerald-100 text-emerald-700"
                        )}>
                          {new Date(companies.find(c => c.id === selectedCompanyId)!.contractEndDate!) < new Date() ? 'VENCIDO' : 'VIGENTE'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Employees List */}
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900">Colaboradores Alocados</h4>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Total H/H: R$ {getCompanyEmployees(selectedCompanyId).reduce((sum, emp) => sum + (emp.hourlyRate || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {getCompanyEmployees(selectedCompanyId).length} Total
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colaborador</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Função</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor H/H</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getCompanyEmployees(selectedCompanyId).length > 0 ? (
                        getCompanyEmployees(selectedCompanyId).map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                  {emp.Name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{emp.Name}</p>
                                  <p className="text-[10px] text-slate-400">{emp.ID}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium text-slate-600">{emp.Function}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-emerald-600 font-bold text-sm">
                                <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                <span>{emp.hourlyRate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                emp.Status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : 
                                emp.Status === 'Férias' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                              )}>
                                {emp.Status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center text-slate-400">
                              <Users className="w-8 h-8 mb-2 opacity-20" />
                              <p className="text-sm">Nenhum colaborador vinculado a esta empresa.</p>
                              <p className="text-xs">Vincule colaboradores na aba de Funcionários.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <Building2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Selecione uma Empresa</h4>
              <p className="text-sm text-slate-500 max-w-xs">
                Escolha uma empresa na lista ao lado para visualizar informações detalhadas e colaboradores alocados.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModal(false);
                setEditingCompany(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex flex-col h-full max-h-[90vh]">
                <div className="p-8 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                      </h3>
                      <p className="text-sm text-slate-500">Preencha os dados cadastrais da empresa</p>
                    </div>
                    <button onClick={() => {
                      setShowModal(false);
                      setEditingCompany(null);
                    }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome da Empresa</label>
                        <input 
                          required
                          type="text"
                          placeholder="Ex: Manutenção Express Ltda"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">CNPJ</label>
                        <input 
                          type="text"
                          placeholder="00.000.000/0000-00"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.cnpj}
                          onChange={e => setFormData({...formData, cnpj: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Tipo de Terceiro</label>
                        <select 
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                          <option value="Fixo">Fixo</option>
                          <option value="Temporário">Temporário</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Status</label>
                        <select 
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Informações de Contrato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nº Contrato</label>
                            <input 
                              type="text"
                              placeholder="Ex: 2024-001"
                              className="w-full px-4 py-2 bg-white border-2 border-transparent rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                              value={formData.contractNumber}
                              onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Início</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-2 bg-white border-2 border-transparent rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                              value={formData.contractStartDate}
                              onChange={e => setFormData({...formData, contractStartDate: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Vencimento</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-2 bg-white border-2 border-transparent rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                              value={formData.contractEndDate}
                              onChange={e => setFormData({...formData, contractEndDate: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Avaliação de Performance</label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormData({...formData, performanceRating: star})}
                              className="focus:outline-none transition-transform active:scale-90"
                            >
                              <Star 
                                className={cn(
                                  "w-5 h-5",
                                  star <= formData.performanceRating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                                )} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Contato Principal</label>
                        <input 
                          type="text"
                          placeholder="Nome do responsável"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.contactName}
                          onChange={e => setFormData({...formData, contactName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Telefone</label>
                        <input 
                          type="text"
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail de Contato</label>
                        <input 
                          type="email"
                          placeholder="contato@empresa.com.br"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="pt-4 sticky bottom-0 bg-white pb-2">
                      <button 
                        type="submit"
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98]"
                      >
                        {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {companyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompanyToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Empresa</h3>
                <p className="text-slate-500 mb-6">
                  Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setCompanyToDelete(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(companyToDelete)}
                    className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
