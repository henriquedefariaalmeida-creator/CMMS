import { ChecklistItem } from '../../types';

/**
 * Prepares checklist items from a raw structure (e.g., from Excel import).
 * Structure: Grupo | Equipamento | Tarefa | Sequência
 */
export const prepareChecklistFromRaw = (
  planoId: string,
  rawItems: { grupo: string; equipamento: string; tarefa: string; sequencia: number }[]
): Partial<ChecklistItem>[] => {
  return rawItems.map(item => ({
    planoId,
    grupo: item.grupo,
    equipamento: item.equipamento,
    tarefa: item.tarefa,
    sequencia: item.sequencia,
    executado: false,
    status: 'ok',
    observacao: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

/**
 * Groups checklist items by Group and then by Equipment for hierarchical display.
 */
export const groupChecklistItems = (items: ChecklistItem[]) => {
  const grouped: Record<string, Record<string, ChecklistItem[]>> = {};

  items.sort((a, b) => a.sequencia - b.sequencia).forEach(item => {
    if (!grouped[item.grupo]) {
      grouped[item.grupo] = {};
    }
    if (!grouped[item.grupo][item.equipamento]) {
      grouped[item.grupo][item.equipamento] = [];
    }
    grouped[item.grupo][item.equipamento].push(item);
  });

  return grouped;
};

/**
 * Calculates progress percentages.
 */
export const calculateProgress = (items: ChecklistItem[]) => {
  if (items.length === 0) return { total: 0, byGroup: {} };

  const totalExecuted = items.filter(i => i.executado).length;
  const totalPercent = Math.round((totalExecuted / items.length) * 100);

  const byGroup: Record<string, number> = {};
  const itemsByGroup: Record<string, ChecklistItem[]> = {};

  items.forEach(item => {
    if (!itemsByGroup[item.grupo]) itemsByGroup[item.grupo] = [];
    itemsByGroup[item.grupo].push(item);
  });

  Object.entries(itemsByGroup).forEach(([group, groupItems]) => {
    const executed = groupItems.filter(i => i.executado).length;
    byGroup[group] = Math.round((executed / groupItems.length) * 100);
  });

  return {
    total: totalPercent,
    byGroup
  };
};
