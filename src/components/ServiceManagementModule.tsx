import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Pencil, 
  History, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Calendar as CalendarIcon,
  User as UserIcon,
  Filter,
  MoreVertical,
  Box,
  Eye,
  Trash2,
  FileText,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, differenceInDays, isAfter, isBefore, addDays, startOfMonth, eachDayOfInterval, isToday, addMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import type { ServiceDemand, Employee, UserProfile, MaterialRequisition, ServiceDemandScopeChange, ServiceDemandStatusChange, ThirdPartyCompany } from '../types';

const safeParseISO = (dateStr: string | undefined | null) => {
  if (!dateStr) return new Date();
  try {
    return parseISO(dateStr);
  } catch (e) {
    return new Date();
  }
};
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ServiceManagementModuleProps {
  demands: ServiceDemand[];
  employees: Employee[];
  companies: ThirdPartyCompany[];
  userProfile: UserProfile | null;
  onSave: (demand: Partial<ServiceDemand>) => Promise<void>;
  onDelete?: (demandId: string) => Promise<void>;
  onUpdateStatus: (demandId: string, status: ServiceDemand['status']) => Promise<void>;
  onAddScopeChange: (demandId: string, description: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  selectedDemandId?: string | null;
  onClearSelectedDemandId?: () => void;
}

interface GanttViewProps {
  filteredDemands: ServiceDemand[];
  ptBR: any;
}

const GanttView = ({ filteredDemands, ptBR }: GanttViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const [selectedDemand, setSelectedDemand] = useState<ServiceDemand | null>(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const goToToday = () => setCurrentMonth(new Date());
  
  const goToMonth = (month: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(month);
    setCurrentMonth(newDate);
  };
  const goToYear = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
  };

  return (
    <div className="p-6 pdf-table-container overflow-x-auto relative min-h-[600px]">
      {/* Nav & Legend integrated style */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button onClick={prevMonth} className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          
          <div className="flex items-center gap-1">
            <select 
              value={currentMonth.getMonth()} 
              onChange={(e) => goToMonth(parseInt(e.target.value))}
              className="bg-transparent border-none py-1.5 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>{format(new Date(2000, i, 1), 'MMMM', { locale: ptBR })}</option>
              ))}
            </select>
            <select 
              value={currentMonth.getFullYear()} 
              onChange={(e) => goToYear(parseInt(e.target.value))}
              className="bg-transparent border-none py-1.5 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          
          <button onClick={nextMonth} className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="w-px h-4 bg-slate-200 mx-1" />
          
          <button 
            onClick={goToToday}
            className="px-4 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            Hoje
          </button>
        </div>
        
        <div className="flex items-center gap-6 px-4">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm shadow-blue-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Prazo</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concluído</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm shadow-rose-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencida</span>
           </div>
        </div>
      </div>

      <div className="min-w-[1240px] border border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <div className="w-64 flex-shrink-0 p-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest border-r border-slate-100 bg-slate-50 flex items-center">
            Descrição da Atividade
          </div>
          <div className="flex-1 flex overflow-hidden">
            {days.map((day, i) => (
              <div key={i} className={cn(
                "flex-1 text-center py-2 text-[9px] font-bold border-l border-slate-100 flex flex-col justify-center min-w-[30px] transition-colors",
                isToday(day) ? "text-blue-600 bg-blue-50/50" : "text-slate-400"
              )}>
                <span className="text-[7px] opacity-70 mb-0.5">{format(day, 'EEE', { locale: ptBR }).toUpperCase()}</span>
                <span className="text-xs font-black">{format(day, 'dd')}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="divide-y divide-slate-100 bg-white">
          {filteredDemands.length > 0 ? filteredDemands.map(demand => {
            const start = safeParseISO(demand.startDate || demand.openedAt);
            const end = safeParseISO(demand.estimatedDeliveryDate);
                          
            const isVisible = !(isAfter(start, endDate) || isBefore(end, startDate));
            if (!isVisible) return null;

            const effectiveStart = isBefore(start, startDate) ? startDate : start;
            const effectiveEnd = isAfter(end, endDate) ? endDate : end;
            
            const startOffset = differenceInDays(effectiveStart, startDate);
            const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;
            const totalDaysInMonth = days.length;
            
            const left = (startOffset / totalDaysInMonth) * 100;
            const width = (duration / totalDaysInMonth) * 100;

            return (
              <div key={demand.id} className="flex items-stretch hover:bg-slate-50/30 transition-all">
                <div className="w-64 flex-shrink-0 p-3 border-r border-slate-100 overflow-hidden bg-white/50">
                  <div className="text-xs font-bold text-slate-900 truncate" title={demand.description}>
                    {demand.description}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <div className="w-4 h-4 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100">
                        <UserIcon className="w-2.5 h-2.5 text-blue-500" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold truncate tracking-tight">{demand.responsibleName}</span>
                    </div>
                    <span className={cn(
                      "text-[7px] font-black uppercase px-1.5 py-0 rounded-full border",
                      demand.priority === 'Alta' ? "bg-rose-50 border-rose-100 text-rose-600" :
                      demand.priority === 'Média' ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    )}>
                      {demand.priority}
                    </span>
                  </div>
                </div>
                <div className="flex-1 h-12 relative group">
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map((_, idx) => (
                      <div key={idx} className="flex-1 border-l border-slate-50/50" />
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedDemand(demand)}
                    className={cn(
                      "absolute top-2.5 bottom-2.5 rounded-lg shadow-sm transition-all hover:scale-[1.01] hover:shadow-xl hover:brightness-110 flex items-center px-3 text-[10px] text-white font-bold overflow-hidden z-10 border-2 border-white/20",
                      demand.status === 'Concluído' ? "bg-emerald-500 shadow-emerald-100" :
                      demand.status === 'Cancelado' ? "bg-slate-400" :
                      isBefore(end, new Date()) ? "bg-rose-500 shadow-rose-100" : "bg-blue-600 shadow-blue-200"
                    )}
                    style={{ 
                      left: `calc(${left}% + 4px)`, 
                      width: `calc(${width}% - 8px)`,
                      minWidth: '32px'
                    }}
                  >
                    <span className="truncate drop-shadow-sm">{demand.description}</span>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="p-20 text-center bg-slate-50/50">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <CalendarIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-black text-lg">Sem atividades este mês</p>
              <p className="text-slate-400 text-sm mt-1">Ajuste os filtros ou navegue para outro período.</p>
            </div>
          )}
        </div>
      </div>


      <AnimatePresence>
        {selectedDemand && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-hidden" 
            onClick={() => setSelectedDemand(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[24px] p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" 
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedDemand(null)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg",
                  selectedDemand.status === 'Concluído' ? "bg-emerald-500 text-white shadow-emerald-200" :
                  selectedDemand.status === 'Cancelado' ? "bg-slate-400 text-white" :
                  isBefore(safeParseISO(selectedDemand.estimatedDeliveryDate), new Date()) ? "bg-rose-500 text-white shadow-rose-200" : "bg-blue-600 text-white shadow-blue-200"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                    <span className="font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      O.S. #{selectedDemand.id.replace('SD-', '')}
                    </span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      selectedDemand.priority === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100" :
                      selectedDemand.priority === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {selectedDemand.priority}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">{selectedDemand.description}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 mb-6">
                <div className="p-3.5 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Responsável</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{selectedDemand.responsibleName}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tight mt-0.5">{selectedDemand.area}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Status Atual</p>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
                      selectedDemand.status === 'Concluído' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                      selectedDemand.status === 'Cancelado' ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-blue-50 border-blue-100 text-blue-600"
                    )}>
                      {selectedDemand.status === 'Concluído' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedDemand.status}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <div className="flex items-center gap-3.5 text-slate-600">
                    <CalendarIcon className="w-4 h-4 text-blue-500 opacity-60" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Período Planejado</p>
                      <p className="text-xs font-bold text-slate-900">
                        {format(safeParseISO(selectedDemand.startDate || selectedDemand.openedAt), "dd/MM/yyyy")} → {format(safeParseISO(selectedDemand.estimatedDeliveryDate), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                onClick={() => setSelectedDemand(null)}
              >
                Fechar Detalhes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ServiceManagementModule = ({
  demands,
  employees,
  companies,
  userProfile,
  onSave,
  onDelete,
  onUpdateStatus,
  onAddScopeChange,
  showToast,
  selectedDemandId,
  onClearSelectedDemandId
}: ServiceManagementModuleProps) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDemand, setEditingDemand] = useState<ServiceDemand | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState<string>('Todas');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPriority, setFilterPriority] = useState<string>('Todas');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    if (selectedDemandId) {
      const demand = demands.find(d => d.id === selectedDemandId);
      if (demand) {
        setEditingDemand(demand);
        setIsEditing(true);
        if (onClearSelectedDemandId) {
          onClearSelectedDemandId();
        }
      }
    }
  }, [selectedDemandId, demands, onClearSelectedDemandId]);

  useEffect(() => {
    if (editingDemand && !isEditing) {
      const updatedDemand = demands.find(d => d.id === editingDemand.id);
      if (updatedDemand) {
        setEditingDemand(updatedDemand);
      }
    }
  }, [demands, editingDemand?.id, isEditing]);

  const [formData, setFormData] = useState<Partial<ServiceDemand>>({
    description: '',
    area: 'Trefila',
    executorType: 'Próprio',
    responsibleId: '',
    priority: 'Média',
    estimatedDeliveryDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    executorName: '',
    companyId: '',
    companyName: '',
    needsMaterial: false,
    materialRequisition: {
      item: '',
      requisitionNumber: '',
      deliveryDate: ''
    },
    collaborators: []
  });

  const areas = ['Trefila', 'Cordeira Car', 'Cordeira Truck', 'Semi Pronto', 'Logistica', 'Centralizado', 'Área externa', 'Utilidades'];
  const priorities = ['Alta', 'Média', 'Baixa'];
  const statuses = ['Não Iniciado', 'Em andamento', 'Parado', 'Cancelado', 'Concluído'];

  const getStatusInfo = (demand: ServiceDemand) => {
    if (demand.status === 'Concluído') return { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' };
    if (demand.status === 'Cancelado') return { label: 'Cancelado', color: 'bg-slate-100 text-slate-700' };
    
    const today = new Date();
    const deliveryDate = safeParseISO(demand.estimatedDeliveryDate);
    const daysDiff = differenceInDays(deliveryDate, today);

    if (isBefore(deliveryDate, today)) return { label: 'Vencida', color: 'bg-rose-100 text-rose-700' };
    if (daysDiff <= 3) return { label: 'A vencer', color: 'bg-amber-100 text-amber-700' };
    return { label: 'No prazo', color: 'bg-blue-100 text-blue-700' };
  };

  const filteredDemands = useMemo(() => {
    let result = demands.filter(d => {
      const matchesSearch = (d.description || '').toLowerCase().includes(search.toLowerCase()) || 
                           (d.responsibleName || '').toLowerCase().includes(search.toLowerCase());
      const matchesArea = filterArea === 'Todas' || d.area === filterArea;
      const matchesStatus = filterStatus === 'Todos' || d.status === filterStatus;
      const matchesPriority = filterPriority === 'Todas' || d.priority === filterPriority;
      return matchesSearch && matchesArea && matchesStatus && matchesPriority;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (sortConfig.key === 'priority') {
          const priorityOrder = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
          const aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aVal = String(a[sortConfig.key as keyof ServiceDemand] || '').toLowerCase();
        const bVal = String(b[sortConfig.key as keyof ServiceDemand] || '').toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [demands, search, filterArea, filterStatus, filterPriority, sortConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      const demandData: Partial<ServiceDemand> = {
        ...formData,
        requesterUid: userProfile.uid,
        requesterName: userProfile.displayName || 'Usuário',
        responsibleName: formData.responsibleName || '',
        responsibleId: formData.responsibleId || '',
        collaborators: formData.collaborators || [],
        status: 'Não Iniciado',
        openedAt: new Date().toISOString(),
        scopeChanges: [],
        statusHistory: [{
          id: Math.random().toString(36).substr(2, 9),
          status: 'Não Iniciado',
          date: new Date().toISOString(),
          user: userProfile.displayName || 'Usuário'
        }]
      };

      await onSave(demandData);
      setShowModal(false);
      setFormData({
        description: '',
        area: 'Trefila',
        executorType: 'Próprio',
        responsibleId: '',
        priority: 'Média',
        estimatedDeliveryDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        needsMaterial: false,
        materialRequisition: {
          item: '',
          requisitionNumber: '',
          deliveryDate: ''
        }
      });
    } catch (error) {
      console.error('Error saving demand:', error);
      showToast('Erro ao salvar demanda', 'error');
    }
  };

  const GanttChart = ({ demand }: { demand: ServiceDemand }) => {
    const start = safeParseISO(demand.startDate || demand.openedAt);
    const end = safeParseISO(demand.estimatedDeliveryDate);
    const today = new Date();
    
    const totalDays = Math.max(differenceInDays(end, start), 1);
    const elapsedDays = Math.max(differenceInDays(today, start), 0);
    const progress = Math.min((elapsedDays / totalDays) * 100, 100);

    return (
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative">
        <div 
          className={cn(
            "h-full transition-all duration-500",
            demand.status === 'Concluído' ? "bg-emerald-500" :
            demand.status === 'Cancelado' ? "bg-slate-400" :
            progress >= 100 ? "bg-rose-500" : "bg-blue-500"
          )}
          style={{ width: `${progress}%` }}
        />
        {demand.status !== 'Concluído' && demand.status !== 'Cancelado' && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
            style={{ left: `${progress}%` }}
          />
        )}
      </div>
    );
  };

  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');

  const handleGenerateReport = async () => {
    if (filteredDemands.length === 0) {
      if (showToast) showToast('Não há demandas para gerar o PDF.', 'error');
      return;
    }

    if (showToast) showToast('Gerando relatório da tela atual...', 'success');
    
    setIsGeneratingPDF(true);

    try {
      // Espera o DOM atualizar com o estado isGeneratingPDF = true
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = document.getElementById('pdf-print-area');
      if (!element) throw new Error('Área de impressão não encontrada');

      const blocks = Array.from(element.querySelectorAll('.pdf-block')).filter(el => {
        return window.getComputedStyle(el).display !== 'none';
      });
      
      if (blocks.length === 0) {
        blocks.push(element);
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const renderWidth = pageWidth - (margin * 2);

      let currentY = margin;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i] as HTMLElement;

        const imgData = await toPng(block, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#f8fafc',
          skipFonts: true,
          style: {
            margin: '0',
            transform: 'none'
          },
          filter: (node) => {
            if (node instanceof HTMLElement && node.dataset && node.dataset.html2canvasIgnore === 'true') {
              return false;
            }
            return true;
          }
        });

        if (!imgData || imgData === 'data:,' || !imgData.startsWith('data:image/')) {
          console.warn('Erro ao gerar imagem de um bloco HTML (toPng retornou valor inválido), pulando...');
          continue;
        }

        const imgProps = doc.getImageProperties(imgData);
        const imgHeightMm = (imgProps.height * renderWidth) / imgProps.width;

        if (currentY + imgHeightMm <= pageHeight - margin) {
          doc.addImage(imgData, 'PNG', margin, currentY, renderWidth, imgHeightMm);
          currentY += imgHeightMm + 5;
        } 
        else if (imgHeightMm <= pageHeight - margin * 2) {
          doc.addPage();
          currentY = margin;
          doc.addImage(imgData, 'PNG', margin, currentY, renderWidth, imgHeightMm);
          currentY += imgHeightMm + 5;
        } 
        else {
          let yOffsetPixels = 0;
          const pxToMm = renderWidth / imgProps.width;

          while (yOffsetPixels < imgProps.height) {
            const availableMm = pageHeight - currentY - margin;
            
            if (availableMm < 20) {
              doc.addPage();
              currentY = margin;
              continue;
            }

            const availablePx = availableMm / pxToMm;
            const sliceHeightPx = Math.max(1, Math.floor(Math.min(availablePx, imgProps.height - yOffsetPixels)));

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(imgProps.width));
            canvas.height = sliceHeightPx;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const sourceImage = new Image();
              sourceImage.src = imgData;
              await new Promise(resolve => {
                sourceImage.onload = () => {
                  ctx.fillStyle = '#f8fafc';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(sourceImage, 0, yOffsetPixels, imgProps.width, canvas.height, 0, 0, canvas.width, canvas.height);
                  resolve(null);
                };
              });
              
              const sliceData = canvas.toDataURL('image/png', 1.0);
              
              if (!sliceData || sliceData === 'data:,' || !sliceData.startsWith('data:image/')) {
                console.warn('Fatia inválida, encerrando este bloco');
                break;
              }

              const sliceRenderHeight = canvas.height * pxToMm;
              doc.addImage(sliceData, 'PNG', margin, currentY, renderWidth, sliceRenderHeight);
              yOffsetPixels += canvas.height;
              currentY += sliceRenderHeight;
              
              if (yOffsetPixels < imgProps.height) {
                 doc.addPage();
                 currentY = margin;
              }
            } else {
              break;
            }
          }
          currentY += 5;
        }
      }

      doc.save(`Relatorio_Servicos_${new Date().getTime()}.pdf`);
      if (showToast) showToast('Relatório PDF gerado com sucesso!', 'success');

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      if (showToast) showToast('Erro ao gerar relatório PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateIndividualReport = (demand: ServiceDemand) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Header Color Bar
    doc.setFillColor(30, 64, 175); // Blue-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GESTÃO DE SERVIÇOS | RELATÓRIO DE DEMANDA', margin, 15);
    
    // ID and Title
    doc.setFontSize(18);
    const demandId = demand.id.replace('SD-', '');
    doc.text(`DEMANDA #${demandId}`, margin, 25);
    
    // Header Info Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, 45, contentWidth, 35, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, 45, contentWidth, 35, 3, 3, 'D');

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('RESPONSÁVEL', margin + 5, 53);
    doc.text('STATUS', margin + 65, 53);
    doc.text('ÁREA', margin + 125, 53);
    doc.text('PRIORIDADE', margin + 5, 68);
    doc.text('DATA ABERTURA', margin + 65, 68);
    doc.text('PREVISÃO ENTREGA', margin + 125, 68);

    doc.setTextColor(30, 41, 59); // slate-900
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(demand.responsibleName || '-', margin + 5, 58);
    doc.text(demand.status || '-', margin + 65, 58);
    doc.text(demand.area || '-', margin + 125, 58);
    doc.text(demand.priority || '-', margin + 5, 73);
    doc.text(demand.openedAt ? format(safeParseISO(demand.openedAt), 'dd/MM/yyyy HH:mm') : '-', margin + 65, 73);
    doc.text(demand.estimatedDeliveryDate ? format(safeParseISO(demand.estimatedDeliveryDate), 'dd/MM/yyyy') : '-', margin + 125, 73);

    let y = 90;

    // Descrição
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('Descrição da Demanda', margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(demand.description || '-', contentWidth);
    doc.text(descLines, margin, y);
    y += (descLines.length * 5) + 10;
    
    // Status History Table
    if (demand.statusHistory && demand.statusHistory.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Movimentações', margin, y);
      autoTable(doc, {
        head: [['Data / Hora', 'Status', 'Usuário / Responsável']],
        body: demand.statusHistory.map(h => [
          format(safeParseISO(h.date), 'dd/MM/yyyy HH:mm'),
          h.status,
          h.user
        ]),
        startY: y + 3,
        headStyles: { fillColor: [71, 85, 105] }, // slate-600
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Scope Changes Table
    if (demand.scopeChanges && demand.scopeChanges.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.text('Alterações de Escopo e Prazos', margin, y);
      autoTable(doc, {
        head: [['Data', 'Descrição da Alteração', 'Responsável']],
        body: demand.scopeChanges.map(s => [
          format(safeParseISO(s.date), 'dd/MM/yyyy'),
          s.description,
          s.user
        ]),
        startY: y + 3,
        headStyles: { fillColor: [51, 65, 85] }, // slate-700
        styles: { fontSize: 8, cellPadding: 3 }
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Material Requisition
    if (demand.needsMaterial && demand.materialRequisition) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.text('Requisição de Material', margin, y);
      y += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text('Item:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(demand.materialRequisition.item || '-', margin + 15, y);
      y += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Nº Req:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(demand.materialRequisition.requisitionNumber || '-', margin + 15, y);
      y += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Entrega:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(demand.materialRequisition.deliveryDate ? format(safeParseISO(demand.materialRequisition.deliveryDate), 'dd/MM/yyyy') : '-', margin + 15, y);
    }
    
    doc.save(`Demanda_Servico_#${demandId}.pdf`);
    showToast('Relatório PDF gerado com sucesso!');
  };



  return (
    <>
      <style>{`
        ${isGeneratingPDF ? `
          #pdf-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 1200px !important;
            min-width: 1200px !important;
            max-width: 1200px !important;
            margin: 0 auto !important;
            background: white !important;
            padding: 30px !important;
            z-index: -9999 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
          }
          #pdf-print-area .md\\:flex-row { flex-direction: row !important; }
          #pdf-print-area .md\\:items-center { align-items: center !important; }
          #pdf-print-area .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          #pdf-print-area select, #pdf-print-area button, #pdf-print-area input { display: none !important; }
          #pdf-print-area .pdf-table-container { overflow: visible !important; width: 100% !important; }
          /* Provide visible headers/spans specifically for PDF instead of just hiding inputs */
          .pdf-only-text { display: inline-block !important; }
        ` : `
          .pdf-only-text { display: none !important; }
        `}
      `}</style>
      
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-blue-50 border-t-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Gerando Relatório...</h2>
            <p className="text-slate-500 text-sm">Preparando formatação visual para o documento</p>
          </div>
        </div>
      )}

      <div className="space-y-6 relative" id="pdf-print-area">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pdf-block border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1">
              {viewMode === 'table' ? 'Gestão de Serviços' : 'Planejamento de Manutenção'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Relatório Emitido em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
            <p className="text-slate-500 text-sm">
              {viewMode === 'table' ? 'Acompanhamento e situação de demandas.' : 'Cronograma e cronograma físico de atividades.'}
            </p>
          </div>
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-xl border border-slate-100 flex">
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'table' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Tabela
            </button>
            <button 
              onClick={() => setViewMode('gantt')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'gantt' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Gantt
            </button>
          </div>
          <button 
            onClick={handleGenerateReport}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <FileText className="w-5 h-5" />
            <span>Relatório PDF</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pdf-block">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs font-medium">Total</span>
            <Box className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{demands.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs font-medium">Em Andamento</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {demands.filter(d => d.status === 'Em andamento').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs font-medium">Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {demands.filter(d => d.status === 'Concluído').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 pdf-block">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <span className="pdf-only-text px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700 font-bold mb-2 inline-block">Filtros Aplicados</span>
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" data-html2canvas-ignore="true" />
            <input 
              type="text" 
              placeholder="Buscar por descrição ou responsável..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
            />
            {search && <span className="pdf-only-text ml-4 text-sm font-bold text-slate-700">Busca: "{search}"</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="pdf-only-text px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700 font-bold">Área: {filterArea}</span>
              <select 
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todas">Todas as Áreas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            
            <div className="relative">
              <span className="pdf-only-text px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700 font-bold">Status: {filterStatus}</span>
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos os Status</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="relative">
               <span className="pdf-only-text px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700 font-bold">Prioridade: {filterPriority}</span>
              <select 
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todas">Todas as Prioridades</option>
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="w-full pdf-table-container overflow-x-auto touch-pan-x">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('id')}>
                  <div className="flex items-center gap-1">
                    OS
                    {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('description')}>
                  <div className="flex items-center gap-1">
                    Título
                    {sortConfig?.key === 'description' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('responsibleName')}>
                  <div className="flex items-center gap-1">
                    Responsável
                    {sortConfig?.key === 'responsibleName' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('executorName')}>
                  <div className="flex items-center gap-1">
                    Técnico
                    {sortConfig?.key === 'executorName' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('priority')}>
                  <div className="flex items-center gap-1">
                    Prioridade
                    {sortConfig?.key === 'priority' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase text-center" data-html2canvas-ignore="true">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDemands.map((demand) => {
                const statusInfo = getStatusInfo(demand);
                return (
                  <tr key={demand.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-blue-700">#{demand.id.replace('SD-', '')}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-slate-900">{demand.description}</div>
                      <div className="text-xs text-slate-500">{demand.area}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200">
                        {demand.responsibleName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{demand.executorName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold text-white",
                        statusInfo.color.replace('bg-', 'bg-').replace('text-', 'text-') // Assuming color mapping needs adjustment
                      )}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold text-white",
                        demand.priority === 'Alta' ? "bg-rose-600" :
                        demand.priority === 'Média' ? "bg-amber-500" :
                        "bg-emerald-600"
                      )}>
                        {demand.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3" data-html2canvas-ignore="true">
                      <div className="flex items-center justify-center space-x-1">
                        <button 
                          onClick={() => {
                            setEditingDemand(demand);
                            setIsEditing(false);
                          }}
                          className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(userProfile?.role === 'admin' || 
                          demand.requesterUid === userProfile?.uid || 
                          employees.find(emp => emp.ID === demand.responsibleId)?.userUid === userProfile?.uid || 
                          demand.responsibleId === userProfile?.uid ||
                          userProfile?.workOrderRole === 'planner') && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingDemand(demand);
                                setIsEditing(true);
                              }}
                              className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-all"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {onDelete && (userProfile?.role === 'admin' || demand.requesterUid === userProfile?.uid || userProfile?.workOrderRole === 'planner') && (
                              <button 
                                onClick={() => onDelete(demand.id)}
                                className="p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-all"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        ) : (
          <GanttView filteredDemands={filteredDemands} ptBR={ptBR} />
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Nova Demanda de Serviço</h3>
                    <p className="text-slate-500 text-sm">Preencha os dados para abrir uma nova solicitação</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição da Demanda</label>
                      <textarea 
                        required
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Descreva detalhadamente o serviço necessário..."
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Área</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.area || 'Trefila'}
                        onChange={e => setFormData({...formData, area: e.target.value as any})}
                      >
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Executor</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.executorType || 'Próprio'}
                        onChange={e => setFormData({
                          ...formData, 
                          executorType: e.target.value as any,
                          companyId: '',
                          companyName: '',
                          responsibleId: '',
                          responsibleName: '',
                          collaborators: []
                        })}
                      >
                        <option value="Próprio">Próprio</option>
                        <option value="Terceiro">Terceiro</option>
                      </select>
                    </div>

                    {formData.executorType === 'Terceiro' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Empresa Terceira</label>
                        <select 
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={formData.companyId || ''}
                          onChange={e => {
                            const company = companies.find(c => c.id === e.target.value);
                            setFormData({
                              ...formData, 
                              companyId: e.target.value,
                              companyName: company?.name || '',
                              responsibleId: '',
                              responsibleName: '',
                              collaborators: []
                            });
                          }}
                        >
                          <option value="">Selecione a Empresa</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Responsável</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.responsibleId || ''}
                        onChange={e => {
                          const emp = employees.find(emp => emp.ID === e.target.value);
                          setFormData({
                            ...formData,
                            responsibleId: e.target.value,
                            responsibleName: emp?.Name || ''
                          });
                        }}
                      >
                        <option value="">Selecione o Responsável</option>
                        {employees
                          .filter(emp => {
                            if (formData.executorType === 'Próprio') {
                              return emp.Type === 'Próprio';
                            } else {
                              return emp.Type === 'Terceiro' && emp.companyId === formData.companyId;
                            }
                          })
                          .map(emp => (
                            <option key={emp.ID} value={emp.ID}>{emp.Name}</option>
                          ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Colaboradores Adicionais</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                          onChange={e => {
                            const emp = employees.find(emp => emp.ID === e.target.value);
                            if (emp && !formData.collaborators?.find(c => c.id === emp.ID)) {
                              setFormData({
                                ...formData,
                                collaborators: [...(formData.collaborators || []), { id: emp.ID, name: emp.Name }]
                              });
                            }
                          }}
                        >
                          <option value="">Adicionar colaborador</option>
                          {employees
                            .filter(emp => {
                              const isRightType = formData.executorType === 'Próprio' 
                                ? emp.Type === 'Próprio' 
                                : (emp.Type === 'Terceiro' && emp.companyId === formData.companyId);
                              return isRightType && emp.ID !== formData.responsibleId;
                            })
                            .map(emp => (
                              <option key={emp.ID} value={emp.ID}>
                                {emp.Name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(formData.collaborators || []).map((collab, index) => (
                          <span key={index} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                            {collab.name}
                            <button 
                              type="button" 
                              onClick={() => setFormData({
                                ...formData,
                                collaborators: formData.collaborators?.filter((_, i) => i !== index)
                              })}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Prioridade</label>
                      <div className="flex gap-2">
                        {priorities.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({...formData, priority: p as any})}
                            className={cn(
                              "flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2",
                              formData.priority === p 
                                ? p === 'Alta' ? "bg-rose-50 border-rose-500 text-rose-600" :
                                  p === 'Média' ? "bg-amber-50 border-amber-500 text-amber-600" :
                                  "bg-emerald-50 border-emerald-500 text-emerald-600"
                                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data Provável de Entrega</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.estimatedDeliveryDate || ''}
                        onChange={e => setFormData({...formData, estimatedDeliveryDate: e.target.value})}
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
                      <input 
                        type="checkbox"
                        id="needsMaterial"
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.needsMaterial}
                        onChange={e => setFormData({...formData, needsMaterial: e.target.checked})}
                      />
                      <label htmlFor="needsMaterial" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Necessita requisição de material?
                      </label>
                    </div>

                    {formData.needsMaterial && (
                      <div className="md:col-span-2 p-6 bg-blue-50 rounded-3xl space-y-4 border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Dados da Requisição
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Item</label>
                            <input 
                              type="text"
                              className="w-full px-4 py-2 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                              value={formData.materialRequisition?.item ?? ''}
                              onChange={e => setFormData({
                                ...formData, 
                                materialRequisition: { ...(formData.materialRequisition || { item: '', requisitionNumber: '', deliveryDate: '' }), item: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Nº Requisição</label>
                            <input 
                              type="text"
                              className="w-full px-4 py-2 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                              value={formData.materialRequisition?.requisitionNumber ?? ''}
                              onChange={e => setFormData({
                                ...formData, 
                                materialRequisition: { ...(formData.materialRequisition || { item: '', requisitionNumber: '', deliveryDate: '' }), requisitionNumber: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Data Entrega</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-2 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                              value={formData.materialRequisition?.deliveryDate ?? ''}
                              onChange={e => setFormData({
                                ...formData, 
                                materialRequisition: { ...(formData.materialRequisition || { item: '', requisitionNumber: '', deliveryDate: '' }), deliveryDate: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    Abrir Demanda
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingDemand && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDemand(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 sm:p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Detalhes da Demanda</h3>
                    <p className="text-slate-500 text-sm">ID: {editingDemand.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => generateIndividualReport(editingDemand)}
                      className="px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-900 transition-all"
                    >
                      <FileText className="w-4 h-4" /> Relatório PDF
                    </button>
                    <button onClick={() => { setEditingDemand(null); setIsEditing(false); }} className="p-2 hover:bg-slate-100 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição</label>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-2xl text-sm leading-relaxed">
                        {editingDemand.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Área</label>
                        <p className="text-sm font-bold text-slate-900">{editingDemand.area}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Executor</label>
                        {isEditing ? (
                          <select 
                            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={editingDemand.executorType}
                            onChange={e => setEditingDemand({
                              ...editingDemand, 
                              executorType: e.target.value as any,
                              companyId: '',
                              companyName: '',
                              responsibleId: '',
                              responsibleName: '',
                              collaborators: []
                            })}
                          >
                            <option value="Próprio">Próprio</option>
                            <option value="Terceiro">Terceiro</option>
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{editingDemand.executorType}</p>
                        )}
                      </div>
                    </div>

                    {editingDemand.executorType === 'Terceiro' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa Terceira</label>
                        {isEditing ? (
                          <select 
                            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={editingDemand.companyId}
                            onChange={e => {
                              const company = companies.find(c => c.id === e.target.value);
                              setEditingDemand({
                                ...editingDemand, 
                                companyId: e.target.value,
                                companyName: company?.name || '',
                                responsibleId: '',
                                responsibleName: '',
                                collaborators: []
                              });
                            }}
                          >
                            <option value="">Selecione a Empresa</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{editingDemand.companyName || 'Não informada'}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Prevista</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={editingDemand.estimatedDeliveryDate || ''}
                          onChange={e => setEditingDemand({...editingDemand, estimatedDeliveryDate: e.target.value})}
                          disabled={!isEditing || userProfile?.role !== 'admin'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Responsável</label>
                        {isEditing ? (
                          <select 
                            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={editingDemand.responsibleId}
                            onChange={e => {
                              const emp = employees.find(emp => emp.ID === e.target.value);
                              setEditingDemand({
                                ...editingDemand,
                                responsibleId: e.target.value,
                                responsibleName: emp?.Name || '',
                                responsibleHourlyRate: emp?.hourlyRate || 0
                              });
                            }}
                          >
                            <option value="">Selecione o Responsável</option>
                            {employees
                              .filter(emp => {
                                if (editingDemand.executorType === 'Próprio') {
                                  return emp.Type === 'Próprio';
                                } else {
                                  return emp.Type === 'Terceiro' && emp.companyId === editingDemand.companyId;
                                }
                              })
                              .map(emp => (
                                <option key={emp.ID} value={emp.ID}>
                                  {emp.Name} {emp.hourlyRate ? `(R$ ${emp.hourlyRate}/h)` : ''}
                                </option>
                              ))
                            }
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{editingDemand.responsibleName}</p>
                            {editingDemand.responsibleHourlyRate && editingDemand.responsibleHourlyRate > 0 && (
                              <span className="text-[10px] text-emerald-600 font-bold">R$ {editingDemand.responsibleHourlyRate}/h</span>
                            )}
                          </div>
                        )}
                        {isEditing && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Horas do Responsável:</label>
                              <input 
                                type="number"
                                step="0.5"
                                className="w-20 px-2 py-1 bg-slate-50 border-none rounded-lg text-xs"
                                value={editingDemand.responsibleHoursWorked || 0}
                                onChange={e => setEditingDemand({...editingDemand, responsibleHoursWorked: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                          </div>
                        )}
                        {!isEditing && editingDemand.responsibleHoursWorked ? (
                          <p className="text-xs text-slate-500 mt-1">Horas: {editingDemand.responsibleHoursWorked}h</p>
                        ) : null}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Colaboradores</label>
                        <div className="space-y-2 mb-2">
                          {(editingDemand.collaborators || []).map((collab, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">{collab.name}</span>
                                {collab.hourlyRate && collab.hourlyRate > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-bold">R$ {collab.hourlyRate}/h</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <input 
                                      type="number"
                                      step="0.5"
                                      placeholder="Hrs"
                                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px]"
                                      value={collab.hoursWorked || 0}
                                      onChange={e => {
                                        const newCollabs = [...(editingDemand.collaborators || [])];
                                        newCollabs[index] = { ...collab, hoursWorked: parseFloat(e.target.value) || 0 };
                                        setEditingDemand({ ...editingDemand, collaborators: newCollabs });
                                      }}
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setEditingDemand({
                                        ...editingDemand,
                                        collaborators: editingDemand.collaborators?.filter((_, i) => i !== index)
                                      })}
                                      className="p-1 text-rose-400 hover:bg-rose-50 rounded-lg"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-500">{collab.hoursWorked || 0}h</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {isEditing && (
                          <select 
                            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            onChange={e => {
                              const emp = employees.find(emp => emp.ID === e.target.value);
                              if (emp) {
                                setEditingDemand({
                                  ...editingDemand,
                                  collaborators: [...(editingDemand.collaborators || []), { 
                                    id: emp.ID, 
                                    name: emp.Name,
                                    hourlyRate: emp.hourlyRate || 0,
                                    hoursWorked: 0
                                  }]
                                });
                              }
                            }}
                          >
                            <option value="">Adicionar colaborador</option>
                            {employees
                              .filter(emp => emp.Type === editingDemand.executorType && emp.ID !== editingDemand.responsibleId && !(editingDemand.collaborators || []).find(c => c.id === emp.ID))
                              .map(emp => (
                                <option key={emp.ID} value={emp.ID}>
                                  {emp.Name} {emp.hourlyRate ? `(R$ ${emp.hourlyRate}/h)` : ''}
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                    </div>

                    {editingDemand.executorType === 'Terceiro' && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Custo Estimado de Mão de Obra</h4>
                          <p className="text-lg font-bold text-emerald-900">
                            R$ {((editingDemand.responsibleHoursWorked || 0) * (editingDemand.responsibleHourlyRate || 0) + 
                                (editingDemand.collaborators || []).reduce((acc, c) => acc + (c.hoursWorked || 0) * (c.hourlyRate || 0), 0))
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-emerald-200" />
                      </div>
                    )}

                    {editingDemand.executorType === 'Terceiro' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Executante (Terceiro)</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={editingDemand.executorName || ''}
                          onChange={e => setEditingDemand({...editingDemand, executorName: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                        <p className="text-sm font-bold text-slate-900">{editingDemand.status}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Solicitante</label>
                        <p className="text-sm font-bold text-slate-900">{editingDemand.requesterName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Início</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={editingDemand.startDate || ''}
                          onChange={e => setEditingDemand({...editingDemand, startDate: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Conclusão</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={editingDemand.closedAt || ''}
                          onChange={e => setEditingDemand({...editingDemand, closedAt: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Status</label>
                      <div className="flex gap-2">
                        {['Não Iniciado', 'Em andamento', 'Concluído'].map(status => (
                          <button
                            key={status}
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setEditingDemand({...editingDemand, status: status as any})}
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                              editingDemand.status === status 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                              !isEditing && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editingDemand.needsMaterial && editingDemand.materialRequisition && (
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Requisição de Material
                        </h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <p><span className="text-blue-400 font-medium">Item:</span> {editingDemand.materialRequisition.item}</p>
                          <p><span className="text-blue-400 font-medium">Nº:</span> {editingDemand.materialRequisition.requisitionNumber}</p>
                          <p><span className="text-blue-400 font-medium">Entrega:</span> {format(safeParseISO(editingDemand.materialRequisition.deliveryDate), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Histórico de Status
                      </label>
                      <div className="space-y-3">
                        {(Array.isArray(editingDemand.statusHistory) ? editingDemand.statusHistory : []).map((h, i) => (
                          <div key={h.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5",
                                i === 0 ? "bg-blue-600" : "bg-slate-300"
                              )} />
                              {i < (Array.isArray(editingDemand.statusHistory) ? editingDemand.statusHistory : []).length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{h.status}</p>
                              <p className="text-[10px] text-slate-400">
                                {format(safeParseISO(h.date), 'dd/MM/yyyy HH:mm')} por {h.user}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                          <Pencil className="w-4 h-4" />
                          Alterações de Escopo
                        </label>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="Descreva a alteração..."
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          id="new-scope-change"
                        />
                        <button 
                          onClick={async () => {
                            const input = document.getElementById('new-scope-change') as HTMLInputElement;
                            if (input && input.value && editingDemand) {
                              const description = input.value;
                              
                              const newScopeEntry = {
                                id: Math.random().toString(36).substr(2, 9),
                                description,
                                date: new Date().toISOString(),
                                user: userProfile?.displayName || 'Usuário'
                              };
                              
                              const updatedDemand = {
                                ...editingDemand,
                                scopeChanges: [...(Array.isArray(editingDemand.scopeChanges) ? editingDemand.scopeChanges : []), newScopeEntry]
                              };
                              
                              // Update local state immediately
                              setEditingDemand(updatedDemand);
                              
                              // If not in edit mode, persist immediately
                              if (!isEditing) {
                                try {
                                  await onAddScopeChange(editingDemand.id, description);
                                } catch (error) {
                                  console.error('Error adding scope change:', error);
                                  showToast('Erro ao adicionar alteração de escopo', 'error');
                                }
                              }
                              
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                        >
                          Adicionar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(Array.isArray(editingDemand.scopeChanges) ? editingDemand.scopeChanges : []).length > 0 ? (
                          (Array.isArray(editingDemand.scopeChanges) ? editingDemand.scopeChanges : []).map((s) => (
                            <div key={s.id} className="p-3 bg-slate-50 rounded-xl">
                              <p className="text-sm text-slate-700 mb-1">{s.description}</p>
                              <p className="text-[10px] text-slate-400">
                                {format(safeParseISO(s.date), 'dd/MM/yyyy')} por {s.user}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">Nenhuma alteração registrada.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  onClick={() => { setEditingDemand(null); setIsEditing(false); }}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Fechar
                </button>
                {isEditing && (
                  <button 
                    onClick={async () => {
                      const totalCost = ((editingDemand.responsibleHoursWorked || 0) * (editingDemand.responsibleHourlyRate || 0) + 
                                        (editingDemand.collaborators || []).reduce((acc, c) => acc + (c.hoursWorked || 0) * (c.hourlyRate || 0), 0));
                      await onSave({ ...editingDemand, totalCost });
                      setEditingDemand(null);
                      setIsEditing(false);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Salvar Alterações
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
