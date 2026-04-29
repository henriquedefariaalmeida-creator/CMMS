import React from 'react';
import { CheckCircle2, Circle, AlertCircle, RefreshCcw, XCircle, Info, Package, Hash } from 'lucide-react';
import { ChecklistItem } from '../../types';
import { cn } from '../../lib/utils';
import { groupChecklistItems, calculateProgress } from './ChecklistUtils';

interface ChecklistExecutionProps {
  items: ChecklistItem[];
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void;
  canExecute: boolean;
}

export const ChecklistExecution: React.FC<ChecklistExecutionProps> = ({
  items,
  onUpdateItem,
  canExecute
}) => {
  const grouped = groupChecklistItems(items);
  const progress = calculateProgress(items);

  return (
    <div className="space-y-6 p-4">
      {/* Overall Progress */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso Geral</span>
          <span className="text-lg font-black text-blue-600">{progress.total}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progress.total}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([group, equipments]) => (
          <div key={group} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                {group}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {progress.byGroup[group]}%
              </span>
            </div>

            <div className="space-y-6">
              {Object.entries(equipments).map(([eq, tasks]) => (
                <div key={eq} className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-500 flex items-center gap-2 ml-2">
                    <Package className="w-3 h-3" />
                    {eq}
                  </h5>

                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "bg-white p-4 rounded-2xl border transition-all duration-200",
                          task.executado ? "border-emerald-100 bg-emerald-50/10 shadow-sm" : "border-slate-200 hover:border-blue-200"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            disabled={!canExecute}
                            onClick={() => onUpdateItem(task.id, { executado: !task.executado })}
                            className={cn(
                              "mt-1 transition-transform active:scale-90",
                              task.executado ? "text-emerald-500" : "text-slate-300 hover:text-blue-400"
                            )}
                          >
                            {task.executado ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </button>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className={cn(
                                "text-sm font-bold leading-tight",
                                task.executado ? "text-slate-500 line-through" : "text-slate-800"
                              )}>
                                {task.tarefa || (task as any).text || (task as any).task || (task as any).Description || (task as any).Tarefa || (task as any).Atividade || (task as any).atividade || 'Atividade sem descrição'}
                              </span>
                              
                              <select
                                disabled={!canExecute}
                                value={task.status}
                                onChange={(e) => onUpdateItem(task.id, { status: e.target.value as any })}
                                className={cn(
                                  "text-[10px] font-bold uppercase py-1 px-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500 outline-none",
                                  task.status === 'ok' ? "bg-emerald-100 text-emerald-700" :
                                  task.status === 'regularizado' ? "bg-amber-100 text-amber-700" :
                                  "bg-rose-100 text-rose-700"
                                )}
                              >
                                <option value="ok">OK</option>
                                <option value="regularizado">Regularizado</option>
                                <option value="substituido">Substituído</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="relative">
                                <Info className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  disabled={!canExecute}
                                  type="text"
                                  placeholder="Observação..."
                                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={task.observacao}
                                  onChange={(e) => onUpdateItem(task.id, { observacao: e.target.value })}
                                />
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    disabled={!canExecute}
                                    type="text"
                                    placeholder="Qtd..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={task.quantidade || ''}
                                    onChange={(e) => onUpdateItem(task.id, { quantidade: e.target.value })}
                                  />
                                </div>
                                <div className="relative flex-[2]">
                                  <RefreshCcw className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    disabled={!canExecute}
                                    type="text"
                                    placeholder="Material..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={task.material || ''}
                                    onChange={(e) => onUpdateItem(task.id, { material: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
