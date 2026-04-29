import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Layout, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { PreventivePlan, ChecklistItem, UserProfile, Asset } from '../../types';
import { cn } from '../../lib/utils';
import { ChecklistStructure } from './ChecklistStructure';
import { ChecklistExecution } from './ChecklistExecution';
import { calculateProgress } from './ChecklistUtils';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { hasPermission } from '../../lib/permissions';

interface ChecklistModalProps {
  plan: PreventivePlan;
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserProfile['role'];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({
  plan,
  assets,
  isOpen,
  onClose,
  userRole,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'execution'>('execution');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManageStructure = hasPermission(userRole, 'manage_checklist_structure');
  const canExecute = hasPermission(userRole, 'execute_checklist');

  useEffect(() => {
    if (!isOpen || !plan.ID) return;

    const q = query(
      collection(db, `preventive-plans/${plan.ID}/checklist_itens`)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChecklistItem[];
      setItems(newItems.sort((a, b) => a.sequencia - b.sequencia));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching checklist items:", error);
      showToast("Erro ao carregar checklist", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, plan.ID]);

  const handleAddItem = async (item: Partial<ChecklistItem>) => {
    try {
      await addDoc(collection(db, `preventive-plans/${plan.ID}/checklist_itens`), {
        ...item,
        planoId: plan.ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding item:", error);
      showToast("Erro ao adicionar item", "error");
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<ChecklistItem>) => {
    try {
      // Optimistic update
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      
      await updateDoc(doc(db, `preventive-plans/${plan.ID}/checklist_itens`, id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating item:", error);
      showToast("Erro ao atualizar item", "error");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, `preventive-plans/${plan.ID}/checklist_itens`, id));
    } catch (error) {
      console.error("Error deleting item:", error);
      showToast("Erro ao excluir item", "error");
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Since we use real-time updates for individual fields, 
      // "Save" here could be used for a final confirmation or batch processing if needed.
      // For now, we just show a success message as everything is already saved.
      showToast("Checklist salvo com sucesso!");
      onClose();
    } catch (error) {
      showToast("Erro ao salvar checklist", "error");
    } finally {
      setSaving(false);
    }
  };

  const progress = calculateProgress(items);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-slate-50 w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-black text-slate-800 leading-tight truncate max-w-[200px] sm:max-w-md">
                  {plan.Task}
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Checklist de Manutenção
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Salvar</span>
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-400">Progresso de Execução</span>
                <span className="text-blue-600">{progress.total}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress.total}%` }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab('execution')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'execution' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Play className="w-4 h-4" />
                <span>Execução</span>
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'structure' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Layout className="w-4 h-4" />
                <span>Estrutura</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 sm:pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Checklist...</p>
              </div>
            ) : activeTab === 'structure' ? (
              <ChecklistStructure 
                items={items}
                assets={assets}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                canEdit={canManageStructure}
              />
            ) : (
              <ChecklistExecution 
                items={items}
                onUpdateItem={handleUpdateItem}
                canExecute={canExecute}
              />
            )}
          </div>

          {/* Mobile Footer */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex gap-3">
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Salvar Checklist</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
