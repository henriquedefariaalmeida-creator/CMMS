import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Tag,
  ArrowRight,
  X,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PreventivePlan, Asset } from '../types';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PreventiveAssetsModuleProps {
  plans: PreventivePlan[];
  assets: Asset[];
  onUpdateDate?: (planId: string, assetId: string, newDate: string, type: 'last') => Promise<void>;
  isAdmin?: boolean;
  isPlanner?: boolean;
}

export const PreventiveAssetsModule: React.FC<PreventiveAssetsModuleProps> = ({ 
  plans, 
  assets, 
  onUpdateDate,
  isAdmin,
  isPlanner
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'last' | 'next' | null>(null);
  const [tempDate, setTempDate] = useState('');

  const canEdit = isAdmin || isPlanner;

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEditDate = (item: any, type: 'last') => {
    if (!canEdit) return;
    setEditingId(`${item.planId}-${item.assetId}`);
    setEditingType(type);
    setTempDate(item.lastDate);
  };

  const handleSaveDate = async (planId: string, assetId: string) => {
    if (onUpdateDate && editingType === 'last') {
      await onUpdateDate(planId, assetId, tempDate, 'last');
    }
    setEditingId(null);
    setEditingType(null);
  };

  const getAssetStatus = (nextDate: string) => {
    if (!nextDate) return 'upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      const next = parseISO(nextDate);
      if (isNaN(next.getTime())) return 'upcoming';
      
      const nextTime = next.getTime();
      const todayTime = today.getTime();

      if (nextTime < todayTime) return 'overdue';
      
      // Check if it's today without using format()
      const isToday = next.getFullYear() === today.getFullYear() &&
                      next.getMonth() === today.getMonth() &&
                      next.getDate() === today.getDate();
      
      if (isToday) return 'today';
    } catch (e) {
      return 'upcoming';
    }
    return 'upcoming';
  };

  const allAssetsByPlan = useMemo(() => {
    // Create a map for O(1) asset lookup
    const assetMap = new Map(assets.map(a => [a.ID, a]));

    return plans.flatMap(plan => {
      let planAssets = plan.assets || [];
      
      if (planAssets.length === 0 && plan.AssetIDs && plan.AssetIDs.length > 0) {
        planAssets = plan.AssetIDs.map(id => ({
          assetId: id,
          nextDate: plan.AssetNextDues?.[id] || plan.NextDue || '',
          lastDate: plan.AssetLastDones?.[id] || plan.LastDone || null
        }));
      }

      return planAssets.map(pa => {
        const asset = assetMap.get(pa.assetId);
        return {
          planId: plan.ID,
          planTask: plan.Task,
          assetId: pa.assetId,
          assetTag: asset?.Tag || pa.assetId,
          assetDescription: asset?.Description || 'Sem descrição',
          assetModel: asset?.Model || 'N/A',
          assetLocation: asset?.Location || 'N/A',
          lastDate: pa.lastDate,
          nextDate: pa.nextDate,
          status: getAssetStatus(pa.nextDate)
        };
      });
    });
  }, [plans, assets]);

  const filteredData = useMemo(() => {
    const searchTerm = debouncedSearch.toLowerCase();
    return allAssetsByPlan.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.assetTag.toLowerCase().includes(searchTerm) ||
        item.assetDescription.toLowerCase().includes(searchTerm) ||
        item.planTask.toLowerCase().includes(searchTerm) ||
        item.assetModel.toLowerCase().includes(searchTerm);
      
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'overdue' && item.status === 'overdue') ||
        (filterStatus === 'upcoming' && (item.status === 'upcoming' || item.status === 'today'));

      return matchesSearch && matchesStatus;
    }).sort((a, b) => a.assetDescription.localeCompare(b.assetDescription));
  }, [allAssetsByPlan, debouncedSearch, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Equipamentos por Plano</h3>
          <p className="text-sm text-slate-500">Acompanhamento de datas de manutenção por ativo</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar ativo ou plano..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          >
            <option value="all">Todos Status</option>
            <option value="overdue">Atrasados</option>
            <option value="upcoming">Próximos</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipamento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plano / Tarefa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próxima</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredData.map((item, idx) => (
                  <motion.tr
                    key={`${item.planId}-${item.assetId}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          item.status === 'overdue' ? "bg-rose-50 text-rose-600" : 
                          item.status === 'today' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.assetDescription}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.assetTag} • {item.assetModel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-slate-600 line-clamp-1">{item.planTask}</p>
                      <p className="text-[10px] text-slate-400">{item.assetLocation}</p>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === `${item.planId}-${item.assetId}` && editingType === 'last' ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="date" 
                            value={tempDate}
                            onChange={(e) => setTempDate(e.target.value)}
                            className="text-xs p-1 border rounded bg-white"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveDate(item.planId, item.assetId)}
                            className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingId(null);
                              setEditingType(null);
                            }}
                            className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className={cn(
                            "flex items-center gap-2 p-1 rounded transition-colors",
                            canEdit ? "cursor-pointer hover:bg-slate-100" : ""
                          )}
                          onClick={() => canEdit && handleEditDate(item, 'last')}
                          title={canEdit ? "Clique para editar a data da última manutenção" : ""}
                        >
                          <p className="text-xs font-bold text-slate-500">
                            {item.lastDate && !isNaN(parseISO(item.lastDate).getTime()) ? format(parseISO(item.lastDate), 'dd/MM/yyyy') : '--/--/----'}
                          </p>
                          {canEdit && <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 p-1">
                        <Calendar className={cn(
                          "w-3 h-3",
                          item.status === 'overdue' ? "text-rose-400" : "text-slate-400"
                        )} />
                        <p className={cn(
                          "text-xs font-bold",
                          item.status === 'overdue' ? "text-rose-600" : "text-slate-900"
                        )}>
                          {item.nextDate && !isNaN(parseISO(item.nextDate).getTime()) ? format(parseISO(item.nextDate), 'dd/MM/yyyy') : '--/--/----'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                          item.status === 'overdue' ? "bg-rose-100 text-rose-700" : 
                          item.status === 'today' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {item.status === 'overdue' ? 'Atrasado' : item.status === 'today' ? 'Hoje' : 'Em Dia'}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-4">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum equipamento encontrado com os filtros atuais.</p>
        </div>
      )}
    </div>
  );
};
