import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Save, X, GripVertical } from 'lucide-react';
import { ChecklistItem, Asset } from '../../types';
import { cn } from '../../lib/utils';

interface ChecklistStructureProps {
  items: ChecklistItem[];
  assets: Asset[];
  onAddItem: (item: Partial<ChecklistItem>) => void;
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void;
  onDeleteItem: (id: string) => void;
  canEdit: boolean;
}

export const ChecklistStructure: React.FC<ChecklistStructureProps> = ({
  items,
  assets,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  canEdit
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedEquipments, setExpandedEquipments] = useState<Record<string, boolean>>({});
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [newGroup, setNewGroup] = useState('');
  const [selectedModel, setSelectedModel] = useState<Record<string, string>>({});
  const [selectedEquipments, setSelectedEquipments] = useState<Record<string, string[]>>({});
  const [newTask, setNewTask] = useState<Record<string, string>>({});

  const models = Array.from(new Set(assets.map(a => a.Model))).sort();

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.grupo]) acc[item.grupo] = {};
    if (!acc[item.grupo][item.equipamento]) acc[item.grupo][item.equipamento] = [];
    acc[item.grupo][item.equipamento].push(item);
    return acc;
  }, {} as Record<string, Record<string, ChecklistItem[]>>);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleEquipment = (eq: string) => {
    setExpandedEquipments(prev => ({ ...prev, [eq]: !prev[eq] }));
  };

  const handleAddGroup = () => {
    if (!newGroup.trim()) return;
    onAddItem({
      grupo: newGroup.trim(),
      equipamento: 'Geral',
      tarefa: 'Nova Tarefa',
      sequencia: items.length + 1,
      executado: false,
      status: 'ok',
      observacao: ''
    });
    setNewGroup('');
  };

  const handleAddEquipment = (group: string) => {
    const selectedEqs = selectedEquipments[group] || [];
    if (selectedEqs.length === 0) return;

    selectedEqs.forEach(eqName => {
      onAddItem({
        grupo: group,
        equipamento: eqName,
        tarefa: 'Nova Tarefa',
        sequencia: items.length + 1,
        executado: false,
        status: 'ok',
        observacao: ''
      });
    });

    setSelectedEquipments(prev => ({ ...prev, [group]: [] }));
    setSelectedModel(prev => ({ ...prev, [group]: '' }));
  };

  const handleAddTask = (group: string, eq: string) => {
    const taskName = newTask[`${group}-${eq}`];
    if (!taskName?.trim()) return;
    onAddItem({
      grupo: group,
      equipamento: eq,
      tarefa: taskName.trim(),
      sequencia: items.length + 1,
      executado: false,
      status: 'ok',
      observacao: ''
    });
    setNewTask(prev => ({ ...prev, [`${group}-${eq}`]: '' }));
  };

  return (
    <div className="space-y-4 p-4">
      {canEdit && (
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Novo Grupo..."
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={newGroup}
            onChange={e => setNewGroup(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
          />
          <button
            onClick={handleAddGroup}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Grupo</span>
          </button>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(grouped).sort().map(([group, equipments]) => (
          <div key={group} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div 
              className="flex items-center justify-between bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => toggleGroup(group)}
            >
              <div className="flex items-center gap-3">
                {expandedGroups[group] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">{group}</span>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {canEdit && (
                  <button 
                    onClick={() => {
                      const groupItems = items.filter(i => i.grupo === group);
                      groupItems.forEach(i => onDeleteItem(i.id));
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Grupo</span>
                  </button>
                )}
              </div>
            </div>

            {expandedGroups[group] && (
              <div className="p-4 space-y-4 bg-white">
                {canEdit && (
                  <div className="flex flex-col gap-3 ml-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Tipo de Equipamento</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          value={selectedModel[group] || ''}
                          onChange={e => {
                            setSelectedModel(prev => ({ ...prev, [group]: e.target.value }));
                            setSelectedEquipments(prev => ({ ...prev, [group]: [] }));
                          }}
                        >
                          <option value="">Todos os Tipos</option>
                          {models.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedModel[group] && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Selecione os Equipamentos</label>
                        <div className="max-h-40 overflow-y-auto p-2 bg-white border border-slate-200 rounded-xl space-y-1 custom-scrollbar">
                          {assets
                            .filter(a => a.Model === selectedModel[group])
                            .sort((a, b) => a.Description.localeCompare(b.Description))
                            .map(asset => (
                              <label key={asset.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={(selectedEquipments[group] || []).includes(asset.Description)}
                                  onChange={e => {
                                    const current = selectedEquipments[group] || [];
                                    if (e.target.checked) {
                                      setSelectedEquipments(prev => ({ ...prev, [group]: [...current, asset.Description] }));
                                    } else {
                                      setSelectedEquipments(prev => ({ ...prev, [group]: current.filter(name => name !== asset.Description) }));
                                    }
                                  }}
                                />
                                <span className="text-xs text-slate-600">{asset.Description} <span className="text-[10px] text-slate-400">({asset.Tag})</span></span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleAddEquipment(group)}
                      disabled={!(selectedEquipments[group]?.length > 0)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Selecionados ({selectedEquipments[group]?.length || 0})</span>
                    </button>
                  </div>
                )}

                {Object.entries(equipments).sort().map(([eq, tasks]) => (
                  <div key={eq} className="ml-4 border-l-2 border-slate-100 pl-4 space-y-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleEquipment(`${group}-${eq}`)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedEquipments[`${group}-${eq}`] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <span className="text-sm font-semibold text-slate-600">{eq}</span>
                      </div>
                      {canEdit && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            tasks.forEach(i => onDeleteItem(i.id));
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover Equipamento</span>
                        </button>
                      )}
                    </div>

                    {expandedEquipments[`${group}-${eq}`] && (
                      <div className="space-y-2 ml-2">
                        {tasks.sort((a, b) => a.sequencia - b.sequencia).map((task) => (
                          <div key={task.id} className="flex items-center justify-between bg-slate-50/50 p-2 rounded-xl group hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-3 flex-1">
                              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                              {editingId === task.id ? (
                                <input
                                  autoFocus
                                  className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => {
                                    if (editValue.trim() && editValue !== task.tarefa) {
                                      onUpdateItem(task.id, { tarefa: editValue.trim() });
                                    }
                                    setEditingId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      if (editValue.trim() && editValue !== task.tarefa) {
                                        onUpdateItem(task.id, { tarefa: editValue.trim() });
                                      }
                                      setEditingId(null);
                                    }
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                              ) : (
                                <span className="text-sm text-slate-600">{task.tarefa || (task as any).text || (task as any).task || (task as any).Description || (task as any).Tarefa || (task as any).Atividade || (task as any).atividade || 'Atividade sem descrição'}</span>
                              )}
                            </div>
                            
                            {canEdit && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => {
                                    setEditingId(task.id);
                                    setEditValue(task.tarefa);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => onDeleteItem(task.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {canEdit && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Nova Tarefa..."
                              className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                              value={newTask[`${group}-${eq}`] || ''}
                              onChange={e => setNewTask(prev => ({ ...prev, [`${group}-${eq}`]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleAddTask(group, eq)}
                            />
                            <button
                              onClick={() => handleAddTask(group, eq)}
                              className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Plus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum item no checklist</p>
            <p className="text-xs text-slate-400">Comece adicionando um grupo acima</p>
          </div>
        )}
      </div>
    </div>
  );
};
