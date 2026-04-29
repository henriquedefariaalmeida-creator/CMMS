import { differenceInHours, parse, isValid, startOfMonth, format } from 'date-fns';

export interface FailureAnalysisOutput {
  indicadoresEquipamentos: any[];
  rankingFalhas: any[];
  paretoCausas: any[];
  paretoProblemas: any[];
  paretoPartes: any[];
  analiseTurno: any[];
  analiseTecnico: any[];
  tendenciaMensal: any[];
  resumo: {
    totalFalhas: number;
    tempoTotalReparo: number;
    mtbfMedio: number;
    equipamentosCriticos: number;
  };
}

export const parseHours = (val: any) => {
  if (val === undefined || val === null || val === '-' || val === '') return 0;
  
  if (typeof val === 'number') {
    return val;
  }
  
  if (typeof val === 'string') {
    const s = val.trim().replace(',', '.');
    
    if (s.includes(':')) {
      const parts = s.split(':').map(Number);
      if (parts.length >= 2 && !parts.some(isNaN)) {
        const h = parts[0];
        const m = parts[1];
        const sec = parts[2] || 0;
        return h + (m / 60) + (sec / 3600);
      }
    }
    
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
};

export const processarAnaliseFalhas = (rawData: any[], horasColName?: string): FailureAnalysisOutput => {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return {
      indicadoresEquipamentos: [],
      rankingFalhas: [],
      paretoCausas: [],
      paretoProblemas: [],
      paretoPartes: [],
      analiseTurno: [],
      analiseTecnico: [],
      tendenciaMensal: [],
      resumo: { totalFalhas: 0, tempoTotalReparo: 0, mtbfMedio: 0, equipamentosCriticos: 0 }
    };
  }

  // 1. LIMPEZA E PADRONIZAÇÃO
  const cleanData = rawData.filter(row => {
    if (!row || typeof row !== 'object') return false;
    // Ignorar linhas vazias (pelo menos uma coluna chave deve existir)
    return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
  });

  const getCol = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    const foundKey = rowKeys.find(rk => keys.some(k => rk.toLowerCase().includes(k.toLowerCase())));
    return foundKey ? row[foundKey] : null;
  };

  // 2. NORMALIZAÇÃO E CÁLCULOS
  const normalizedData = cleanData.map(row => {
    const equipamento = getCol(row, ['máquina', 'maquina', 'equipamento', 'codigo', 'código', 'tag']) || 'N/A';
    const dataStr = getCol(row, ['data', 'dia', 'date']);
    const horaInicioStr = getCol(row, ['hora nota', 'hora inicio', 'hora início', 'inicio', 'início']);
    const horaFimStr = getCol(row, ['hora fim', 'fim', 'conclusão', 'conclusao']);
    const turno = getCol(row, ['turno']) || 'N/A';
    const causa = getCol(row, ['causa']) || 'N/A';
    const problema = getCol(row, ['problema']) || 'N/A';
    const parte = getCol(row, ['parte', 'componente']) || 'N/A';
    const executante = getCol(row, ['executante', 'técnico', 'tecnico', 'nome']) || 'N/A';
    const descricao = getCol(row, ['descrição', 'descricao']) || '';

    // Parsing dates and times
    let dataInicio: Date | null = row._parsedDate || null;
    let dataFim: Date | null = null;

    const parseDateTime = (d: any, t: any) => {
      if (!d) return null;
      let dateBase: Date;
      if (d instanceof Date) {
        dateBase = d;
      } else if (typeof d === 'number') {
        dateBase = new Date((d - 25569) * 86400 * 1000);
      } else {
        dateBase = new Date(d);
      }

      if (!isValid(dateBase)) return null;

      if (!t) return dateBase;

      let timeStr = String(t);
      if (typeof t === 'number') {
        // Excel time
        const totalSeconds = Math.round(t * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      const timeParts = timeStr.split(':').map(Number);
      if (timeParts.length >= 2) {
        const newDate = new Date(dateBase);
        newDate.setHours(timeParts[0], timeParts[1], timeParts[2] || 0);
        return newDate;
      }
      return dateBase;
    };

    if (!dataInicio) {
      dataInicio = parseDateTime(dataStr, horaInicioStr);
    }
    dataFim = parseDateTime(dataStr, horaFimStr);

    let tempoReparo = 0;
    
    // First try to use the explicit duration column if provided
    let duracaoVal = horasColName ? row[horasColName] : null;
    
    // Fallback to searching for a duration column
    if (duracaoVal === undefined || duracaoVal === null || duracaoVal === '') {
      duracaoVal = getCol(row, ['hora', 'duração', 'duracao', 'tempo', 'hr', 'parada']);
    }

    if (duracaoVal !== undefined && duracaoVal !== null && duracaoVal !== '') {
      tempoReparo = parseHours(duracaoVal);
    } else if (dataInicio && dataFim && isValid(dataInicio) && isValid(dataFim) && horaInicioStr && horaFimStr) {
      // If no duration column is found, calculate from start and end times
      tempoReparo = Math.max(0, differenceInHours(dataFim, dataInicio) + (dataFim.getMinutes() - dataInicio.getMinutes()) / 60);
    }

    return {
      equipamento,
      data: dataInicio,
      tempoReparo,
      turno,
      causa,
      problema,
      parte,
      executante,
      descricao
    };
  });

  // 4. AGRUPAMENTO POR EQUIPAMENTO
  const equipamentosMap: Record<string, any> = {};
  
  // Find period range
  const dates = normalizedData.map(d => d.data).filter(d => d && isValid(d)) as Date[];
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  const totalPeriodHours = Math.max(24, differenceInHours(maxDate, minDate)) || 720; // Default to 1 month if same day

  normalizedData.forEach(item => {
    if (!equipamentosMap[item.equipamento]) {
      equipamentosMap[item.equipamento] = {
        name: item.equipamento,
        totalFalhas: 0,
        tempoTotalReparo: 0,
        falhas: []
      };
    }
    equipamentosMap[item.equipamento].totalFalhas += 1;
    equipamentosMap[item.equipamento].tempoTotalReparo += item.tempoReparo;
    equipamentosMap[item.equipamento].falhas.push(item);
  });

  const indicadoresEquipamentos = Object.values(equipamentosMap).map(eq => {
    const mtbf = eq.totalFalhas > 0 ? totalPeriodHours / eq.totalFalhas : totalPeriodHours;
    const mttr = eq.totalFalhas > 0 ? eq.tempoTotalReparo / eq.totalFalhas : 0;
    const indiceFalha = eq.totalFalhas / totalPeriodHours;
    
    let status: 'Normal' | 'Atenção' | 'Crítico' = 'Normal';
    if (eq.totalFalhas >= 6) status = 'Crítico';
    else if (eq.totalFalhas >= 3) status = 'Atenção';

    return {
      ...eq,
      mtbf: Number(mtbf.toFixed(2)),
      mttr: Number(mttr.toFixed(2)),
      indiceFalha: Number(indiceFalha.toFixed(4)),
      status
    };
  });

  // RANKING
  const rankingFalhas = [...indicadoresEquipamentos].sort((a, b) => b.totalFalhas - a.totalFalhas);
  const rankingTempoParado = [...indicadoresEquipamentos].sort((a, b) => b.tempoTotalReparo - a.tempoTotalReparo);

  // PARETO
  const calculatePareto = (key: keyof typeof normalizedData[0]) => {
    const counts: Record<string, number> = {};
    normalizedData.forEach(item => {
      const val = String(item[key] || 'N/A');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // ANALISE TURNO
  const analiseTurnoMap: Record<string, any> = {};
  normalizedData.forEach(item => {
    if (!analiseTurnoMap[item.turno]) {
      analiseTurnoMap[item.turno] = { name: item.turno, totalFalhas: 0, tempoTotalReparo: 0 };
    }
    analiseTurnoMap[item.turno].totalFalhas += 1;
    analiseTurnoMap[item.turno].tempoTotalReparo += item.tempoReparo;
  });
  const analiseTurno = Object.values(analiseTurnoMap).map(t => ({
    ...t,
    tempoMedio: t.totalFalhas > 0 ? Number((t.tempoTotalReparo / t.totalFalhas).toFixed(2)) : 0
  }));

  // ANALISE TECNICO
  const analiseTecnicoMap: Record<string, any> = {};
  normalizedData.forEach(item => {
    if (!analiseTecnicoMap[item.executante]) {
      analiseTecnicoMap[item.executante] = { name: item.executante, atendimentos: 0, tempoTotalReparo: 0 };
    }
    analiseTecnicoMap[item.executante].atendimentos += 1;
    analiseTecnicoMap[item.executante].tempoTotalReparo += item.tempoReparo;
  });
  const analiseTecnico = Object.values(analiseTecnicoMap).map(t => ({
    ...t,
    tempoMedio: t.atendimentos > 0 ? Number((t.tempoTotalReparo / t.atendimentos).toFixed(2)) : 0
  }));

  // TENDENCIA MENSAL
  const tendenciaMap: Record<string, number> = {};
  normalizedData.forEach(item => {
    if (item.data && isValid(item.data)) {
      const monthKey = format(item.data, 'yyyy-MM');
      tendenciaMap[monthKey] = (tendenciaMap[monthKey] || 0) + 1;
    }
  });
  const tendenciaMensal = Object.entries(tendenciaMap)
    .map(([month, falhas]) => ({ month, falhas }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // RESUMO
  const totalFalhas = normalizedData.length;
  const tempoTotalReparo = normalizedData.reduce((acc, curr) => acc + curr.tempoReparo, 0);
  const mtbfMedio = indicadoresEquipamentos.length > 0 
    ? indicadoresEquipamentos.reduce((acc, curr) => acc + curr.mtbf, 0) / indicadoresEquipamentos.length 
    : 0;
  const equipamentosCriticos = indicadoresEquipamentos.filter(e => e.status === 'Crítico').length;

  return {
    indicadoresEquipamentos,
    rankingFalhas,
    paretoCausas: calculatePareto('causa'),
    paretoProblemas: calculatePareto('problema'),
    paretoPartes: calculatePareto('parte'),
    analiseTurno,
    analiseTecnico,
    tendenciaMensal,
    resumo: {
      totalFalhas,
      tempoTotalReparo: Number(tempoTotalReparo.toFixed(2)),
      mtbfMedio: Number(mtbfMedio.toFixed(2)),
      equipamentosCriticos
    }
  };
};
