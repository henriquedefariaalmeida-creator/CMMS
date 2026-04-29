import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LabelList 
} from 'recharts';
import { Upload, FileSpreadsheet, Filter, X, Eye, Clock, User, Settings, Info, Download, Printer, TrendingUp, Award, PieChart as PieChartIcon, Users, ListFilter, Activity, AlertTriangle as AlertIcon, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import autoTable from 'jspdf-autotable';
import { processarAnaliseFalhas, FailureAnalysisOutput, parseHours } from '../services/failureAnalysisService';
import { db, createDocument } from '../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

export const FailureAnalysisModule = ({ 
  showToast, 
  handleFileUpload, 
  data = [], 
  onDataUpdate,
  loading = false
}: { 
  showToast?: (msg: string, type?: 'success' | 'error') => void, 
  handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void,
  data?: any[],
  onDataUpdate?: (data: any[]) => void,
  loading?: boolean
}) => {
  const [rawData, setRawData] = useState<any[]>(Array.isArray(data) ? data : []);
  const [filters, setFilters] = useState<Record<string, string>>({
    Ano: '',
    Mês: '',
    Turno: '',
    Setor: '',
    Grupo: '', // Mapped from 'Tipo' as per user request
    Máquina: '',
    Parte: '',
    startDate: '',
    endDate: ''
  });
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'indicadores' | 'ranking' | 'pareto' | 'tendencia' | 'tecnicos' | 'turno'>('resumo');
  const [summaryFocus, setSummaryFocus] = useState<'horas' | 'chamados'>('horas');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    header: true,
    filters: true,
    currentTab: true,
    chartGrupo: true,
    chartSetor: true,
    chartMaquina: true,
    chartParte: true,
    chartCausa: true,
    history: true
  });

  // Pre-calculate column names once when rawData changes
  const colNames = useMemo(() => {
    if (!rawData || rawData.length === 0) return {};
    const keys = Object.keys(rawData[0]);
    const findCol = (possibleNames: string[]) => {
      const upperPossible = possibleNames.map(n => n.toUpperCase());
      const exact = keys.find(k => upperPossible.includes(k.toUpperCase()));
      if (exact) return exact;
      const partial = keys.find(k => {
        const s = k.toUpperCase();
        return upperPossible.some(p => s.includes(p));
      });
      return partial || possibleNames[0];
    };

    return {
      data: findCol(['Data', 'Dia', 'Date', 'Day', 'Ocorrência', 'Ocorrencia', 'Início', 'Inicio']),
      ano: findCol(['Ano', 'Year']),
      mes: findCol(['Mês', 'Mes', 'Month']),
      dia: findCol(['Dia', 'Day']),
      grupo: findCol(['Grupo', 'Tipo', 'Tipo (Grupo)', 'Categoria']),
      maquina: findCol(['Máquina', 'Maquina', 'Equipamento', 'Ativo']),
      parte: findCol(['Parte', 'Componente', 'Subconjunto']),
      causa: findCol(['Causa', 'Motivo', 'Falha']),
      setor: findCol(['Setor', 'Área', 'Area', 'Departamento']),
      executante: findCol(['Executante', 'Técnico', 'Tecnico', 'Nome', 'Pessoa']),
      problema: findCol(['Problema', 'Defeito', 'Sintoma'])
    };
  }, [rawData]);

  // Pre-parse dates for better performance
  const rawDataWithDates = useMemo(() => {
    if (!Array.isArray(rawData) || !colNames.data) return [];
    
    const monthsNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const monthsMap: Record<string, number> = {};
    monthsNames.forEach((name, i) => { monthsMap[name] = i; });

    return rawData.map(row => {
      let date: Date | null = null;
      const val = row[colNames.data];
      
      if (val) {
        if (val instanceof Date) {
          date = val;
        } else if (typeof val === 'number') {
          // Excel serial date
          date = new Date((val - 25569) * 86400 * 1000);
          if (val < 61) date.setDate(date.getDate() + 1);
          date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        } else if (typeof val === 'string') {
          const s = val.trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const [y, m, d] = s.split(/[-T ]/).map(Number);
            date = new Date(y, m - 1, d);
          } else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
            const [d, m, y] = s.split('/').map(Number);
            date = new Date(y, m - 1, d);
          } else if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
            const [d, m, y] = s.split('-').map(Number);
            date = new Date(y, m - 1, d);
          } else {
            date = new Date(s);
          }
        }
      }

      // Fallback to separate columns
      if ((!date || isNaN(date.getTime())) && row[colNames.ano] && row[colNames.mes]) {
        const monthStr = String(row[colNames.mes]);
        const month = monthsMap[monthStr] !== undefined ? monthsMap[monthStr] : (parseInt(monthStr) - 1);
        const day = parseInt(row[colNames.dia]) || 1;
        date = new Date(parseInt(row[colNames.ano]), month, day);
      }

      const normalizedDate = (date && !isNaN(date.getTime())) 
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
        : null;

      // Derive year and month for filtering
      const derivedYear = normalizedDate ? String(normalizedDate.getFullYear()) : String(row[colNames.ano] || '');
      const derivedMonth = normalizedDate ? monthsNames[normalizedDate.getMonth()] : String(row[colNames.mes] || '');

      return { 
        ...row, 
        _parsedDate: normalizedDate,
        _derivedYear: derivedYear,
        _derivedMonth: derivedMonth
      };
    });
  }, [rawData, colNames]);

  // Helper to find the actual column name in the data
  const getColName = (possibleNames: string[]) => {
    if (rawData.length === 0) return possibleNames[0];
    const keys = Object.keys(rawData[0]);
    const upperPossible = possibleNames.map(n => n.toUpperCase());
    
    // Exact match (case insensitive)
    const exact = keys.find(k => upperPossible.includes(k.toUpperCase()));
    if (exact) return exact;
    
    // Partial match
    const partial = keys.find(k => {
      const s = k.toUpperCase();
      return upperPossible.some(p => s.includes(p));
    });
    return partial || possibleNames[0];
  };

  useEffect(() => {
    console.log("FailureAnalysisModule: Received data length:", Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length > 0) {
      // Fallback: if data is array of arrays (header: 1), convert to objects
      if (Array.isArray(data[0])) {
        console.log("FailureAnalysisModule: Received array of arrays, converting to objects...");
        const headers = data[0];
        const objects = data.slice(1).map(row => {
          const obj: any = {};
          if (Array.isArray(row)) {
            headers.forEach((h: any, i: number) => {
              if (h !== undefined && h !== null) {
                obj[String(h)] = row[i];
              }
            });
          }
          return obj;
        }).filter(obj => Object.keys(obj).length > 0);
        setRawData(objects);
        // Notify parent about the converted data if needed
        if (onDataUpdate) {
          setTimeout(() => onDataUpdate(objects), 0);
        }
      } else {
        setRawData(data);
      }
    } else {
      setRawData([]);
    }
  }, [data, onDataUpdate]);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    
    // If it's a number (Excel serial date)
    if (typeof dateVal === 'number') {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      
      // Correcting for Excel's 1900 leap year bug
      if (dateVal < 61) {
        date.setDate(date.getDate() + 1);
      }
      
      // Adjust for timezone offset to keep the same day
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toLocaleDateString('pt-BR');
    }
    
    // If it's a string
    if (typeof dateVal === 'string') {
      // Handle YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        const [y, m, d] = dateVal.split(/[-T ]/).map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
      }
      // Handle DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dateVal)) {
        return dateVal;
      }
    }

    const date = new Date(dateVal);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }
    
    return String(dateVal);
  };

  const parseToDate = (row: any) => {
    const dataCol = getColName(['Data', 'Dia', 'Date', 'Day', 'Ocorrência', 'Ocorrencia', 'Início', 'Inicio']);
    const val = row[dataCol];
    if (!val) return null;

    let date: Date | null = null;
    
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === 'number') {
      date = new Date((val - 25569) * 86400 * 1000);
      if (val < 61) date.setDate(date.getDate() + 1);
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    } else if (typeof val === 'string') {
      const s = val.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.split(/[-T ]/).map(Number);
        date = new Date(y, m - 1, d);
      } else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        const [d, m, y] = s.split('/').map(Number);
        date = new Date(y, m - 1, d);
      } else if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
        const [d, m, y] = s.split('-').map(Number);
        date = new Date(y, m - 1, d);
      } else {
        date = new Date(s);
      }
    } else {
      date = new Date(val);
    }
    
    if (!date || isNaN(date.getTime())) {
      const anoCol = getColName(['Ano', 'Year']);
      const mesCol = getColName(['Mês', 'Mes', 'Month']);
      const diaCol = getColName(['Dia', 'Day']);
      
      if (row[anoCol] && row[mesCol]) {
        const monthsNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthsMap: Record<string, number> = {};
        monthsNames.forEach((name, i) => { monthsMap[name] = i; });

        const monthStr = String(row[mesCol]);
        const month = monthsMap[monthStr] !== undefined ? monthsMap[monthStr] : (parseInt(monthStr) - 1);
        const day = parseInt(row[diaCol]) || 1;
        date = new Date(parseInt(row[anoCol]), month, day);
      }
    }

    if (date && !isNaN(date.getTime())) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    return null;
  };

  const parseInputDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const COLORS = ['#1e3a8a', '#f97316', '#10b981', '#6366f1', '#8b5cf6', '#ec4899'];
  const SECTOR_COLORS: Record<string, string> = {
    'Elétrico': '#1e3a8a',
    'Eletrico': '#1e3a8a',
    'Mecânico': '#f97316',
    'Mecanico': '#f97316'
  };

  const localHandleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (handleFileUpload) {
      handleFileUpload(e);
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const sheetName = workbook.SheetNames.find(name => 
        name.toUpperCase().includes('BDITSS') ||
        name.toLowerCase().includes('falha') || 
        name.toLowerCase().includes('failure') || 
        name.toLowerCase().includes('dados')
      ) || workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];
      
      // Read as array of arrays first to find header
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          // Look for a row that has at least 2 of our key columns
          const matches = row.filter(h => {
            const s = String(h || '').toUpperCase();
            return s.includes('HORA') || s.includes('MAQUINA') || s.includes('MÁQUINA') || s.includes('GRUPO') || s.includes('SETOR') || s.includes('CAUSA') || s.includes('DESCRIÇÃO') || s.includes('STATUS');
          }).length;
          
          if (matches >= 2) {
            headerRowIdx = i;
            break;
          }
        }
      }

      const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, raw: true });
      console.log('FailureAnalysisModule: Parsed data:', data);
      setRawData(data);
      if (onDataUpdate) onDataUpdate(data);
      localStorage.setItem('failureAnalysisData', JSON.stringify(data));
      if (showToast) showToast('Arquivo carregado e salvo localmente!', 'success');
    } catch (error) {
      console.error('Error reading file:', error);
      if (showToast) showToast('Erro ao ler arquivo.', 'error');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleChartClick = (key: string, value: any) => {
    const strValue = String(value).trim();
    if (!strValue || strValue === 'N/A' || strValue === 'undefined') return;
    
    const isSelected = filters[key] === strValue;
    const newValue = isSelected ? '' : strValue;
    
    if (showToast) {
      if (isSelected) showToast(`Filtro de ${key} removido`, 'success');
      else showToast(`Filtrando por ${key}: ${strValue}`, 'success');
    }
    
    setFilters(prev => ({ ...prev, [key]: newValue }));
  };

  const clearFilters = () => {
    setFilters({
      Ano: '', Mês: '', Turno: '', Setor: '', Grupo: '', Máquina: '', Parte: '', startDate: '', endDate: ''
    });
  };

  const generatePDF = async () => {
    if (filteredData.length === 0) {
      if (showToast) showToast('Não há dados para gerar o PDF.', 'error');
      return;
    }

    if (showToast) showToast('Gerando relatório da aba atual...', 'success');
    
    setIsGeneratingPDF(true);

    try {
      // Wait for React to apply isGeneratingPDF state
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = document.getElementById('pdf-print-area');
      if (!element) throw new Error('Área de impressão não encontrada');

      const blocks = Array.from(element.querySelectorAll('.pdf-block')).filter(el => {
        // Ignora blocos que estão explicitamente com 'display: none' via classe 'hidden'
        return window.getComputedStyle(el).display !== 'none';
      });
      
      if (blocks.length === 0) {
        // Fallback pra tela inteira se não houver blocos
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

        // Caso 1: O bloco cabe perfeitamente no espaço que sobrou da página atual
        if (currentY + imgHeightMm <= pageHeight - margin) {
          doc.addImage(imgData, 'PNG', margin, currentY, renderWidth, imgHeightMm);
          currentY += imgHeightMm + 5;
        } 
        // Caso 2: O bloco é menor que uma página inteira, mas NÃO cabe no espaço que sobrou.
        // Solução: Pula para a próxima página para não fatiar o gráfico no meio.
        else if (imgHeightMm <= pageHeight - margin * 2) {
          doc.addPage();
          currentY = margin;
          doc.addImage(imgData, 'PNG', margin, currentY, renderWidth, imgHeightMm);
          currentY += imgHeightMm + 5;
        } 
        // Caso 3: O bloco é GIGANTE (ex: Tabela Histórico com 50 itens). Maior que uma folha inteira.
        // Solução: Fatiar inteligentemente, aproveitando o espaço da página atual para não deixar um buraco branco.
        else {
          let yOffsetPixels = 0;
          const pxToMm = renderWidth / imgProps.width;

          while (yOffsetPixels < imgProps.height) {
            const availableMm = pageHeight - currentY - margin;
            
            // Se o espaço restante for muito pequeno (menos de 2cm), melhor ir para a próxima página 
            // logo para não fatiar de forma feia (ex: pegar só a ponta do cabeçalho da tabela)
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
          currentY += 5; // espaço após terminar a tabela gigante
        }
      }

      doc.save(`Relatorio_${activeSubTab}_${new Date().getTime()}.pdf`);

      if (showToast) showToast('Relatório PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (showToast) showToast('Erro ao gerar relatório PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Pre-calculate column mappings for filters to improve performance
  const filterColMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    Object.keys(filters).forEach(key => {
      if (key === 'startDate' || key === 'endDate') return;
      let possibleNames = [key, key.toUpperCase(), key.toLowerCase()];
      if (key === 'Grupo') possibleNames = ['Grupo', 'Tipo', 'Tipo (Grupo)', 'Categoria'];
      if (key === 'Máquina') possibleNames = ['Máquina', 'Maquina', 'Equipamento', 'Ativo'];
      if (key === 'Parte') possibleNames = ['Parte', 'Componente', 'Subconjunto'];
      if (key === 'Causa') possibleNames = ['Causa', 'Motivo', 'Falha'];
      if (key === 'Setor') possibleNames = ['Setor', 'Área', 'Area', 'Departamento'];
      mapping[key] = getColName(possibleNames);
    });
    return mapping;
  }, [rawData, filters]);

  const getUniqueValues = (key: string) => {
    if (!Array.isArray(rawDataWithDates)) return [];
    
    const actualKey = filterColMapping[key];
    
    // Filter rawDataWithDates by other active filters to show only relevant options (cascading)
    const dataForOptions = rawDataWithDates.filter(row => {
      return Object.entries(filters).every(([fKey, fValue]) => {
        if (!fValue || fKey === key || fKey === 'startDate' || fKey === 'endDate') return true;
        
        if (fKey === 'Ano') return row._derivedYear === String(fValue);
        if (fKey === 'Mês') return row._derivedMonth === String(fValue);
        
        const fActualKey = filterColMapping[fKey];
        if (!fActualKey) return true;
        return String(row[fActualKey]) === String(fValue);
      });
    });

    let values: any[] = [];
    if (key === 'Ano') {
      values = dataForOptions.map(row => row._derivedYear);
    } else if (key === 'Mês') {
      values = dataForOptions.map(row => row._derivedMonth);
    } else if (actualKey) {
      values = dataForOptions.map(row => row[actualKey]);
    }

    const cleanValues = values.filter(val => val !== undefined && val !== null && val !== '');
    return Array.from(new Set(cleanValues)).sort((a: any, b: any) => {
      if (key === 'Mês') {
        const monthsOrder = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return monthsOrder.indexOf(a) - monthsOrder.indexOf(b);
      }
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  };

  // Filter data
  const filteredData = useMemo(() => {
    if (!Array.isArray(rawDataWithDates)) return [];
    
    const start = filters.startDate ? parseInputDate(filters.startDate) : null;
    const end = filters.endDate ? parseInputDate(filters.endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const activeFilterEntries = Object.entries(filters).filter(([key, value]) => 
      value !== '' && key !== 'startDate' && key !== 'endDate'
    );

    return rawDataWithDates.filter(row => {
      // Date range filter
      if (start || end) {
        const rowDate = row._parsedDate;
        if (!rowDate) return false;
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
      }

      return activeFilterEntries.every(([key, value]) => {
        if (key === 'Ano') return row._derivedYear === String(value);
        if (key === 'Mês') return row._derivedMonth === String(value);
        
        const actualKey = filterColMapping[key];
        if (!actualKey) return true;
        return String(row[actualKey]) === String(value);
      });
    });
  }, [rawDataWithDates, filters, filterColMapping]);

  // Prepare chart data
  const horasCol = useMemo(() => {
    if (rawData.length === 0) return 'Horas';
    const keys = Object.keys(rawData[0]);
    // Prioritize exact matches or common names
    const priorityKeys = ['HORA', 'HORAS', 'DURAÇÃO', 'DURACAO', 'TEMPO', 'HR', 'HORA PARADA', 'HORA DE PARADA'];
    const foundPriority = keys.find(k => priorityKeys.includes(k.toUpperCase()));
    if (foundPriority) return foundPriority;

    const found = keys.find(k => {
      const s = k.toLowerCase();
      return s.includes('hora') || s.includes('duração') || s.includes('duracao') || s.includes('tempo') || s.includes('parada');
    });
    return found || 'Horas';
  }, [rawData]);

  // Advanced Analysis
  const advancedAnalysis = useMemo(() => {
    return processarAnaliseFalhas(filteredData, horasCol);
  }, [filteredData, horasCol]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedIndicadores = useMemo(() => {
    let sortableItems = [...advancedAnalysis.indicadoresEquipamentos];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string' && !isNaN(Number(aVal))) aVal = Number(aVal);
        if (typeof bVal === 'string' && !isNaN(Number(bVal))) bVal = Number(bVal);

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [advancedAnalysis.indicadoresEquipamentos, sortConfig]);

  // Save indicators to Firestore when data changes
  useEffect(() => {
    if (advancedAnalysis.indicadoresEquipamentos.length > 0) {
      const saveIndicators = async () => {
        try {
          const indicadoresToSave = advancedAnalysis.indicadoresEquipamentos.map(({ falhas, ...rest }) => rest);
          await createDocument('indicadores_manutencao', {
            indicadores: indicadoresToSave,
            resumo: advancedAnalysis.resumo,
            updatedAt: serverTimestamp(),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error saving indicators to Firestore:', error);
        }
      };
      saveIndicators();
    }
  }, [advancedAnalysis]);

  const activeFiltersDesc = useMemo(() => {
    const active = [];
    if (filters.startDate && filters.endDate) {
      active.push(`Período de ${filters.startDate} a ${filters.endDate}`);
    } else if (filters.startDate) {
      active.push(`A partir de ${filters.startDate}`);
    } else if (filters.endDate) {
      active.push(`Até ${filters.endDate}`);
    }
    
    Object.entries(filters).forEach(([fKey, fValue]) => {
      if (fValue && fKey !== 'startDate' && fKey !== 'endDate') {
        active.push(`${fKey}: ${fValue}`);
      }
    });
    
    if (active.length === 0) return "Visão Geral (Todos os dados)";
    return `Filtrando por: ${active.join(' • ')}`;
  }, [filters]);

  const macroAnalysis = useMemo(() => {
    if (filteredData.length === 0) return null;

    const setorCol = filterColMapping['Setor'] || 'Setor';
    const processoAgg: Record<string, { falhas: number, horas: number }> = {};
    
    filteredData.forEach(row => {
      const processo = String(row[setorCol] || 'N/A').trim();
      const horas = Number(row[horasCol]) || 0;
      
      if (!processoAgg[processo]) processoAgg[processo] = { falhas: 0, horas: 0 };
      processoAgg[processo].falhas += 1;
      processoAgg[processo].horas += horas;
    });

    const processosSorted = Object.entries(processoAgg).sort((a, b) => {
      return summaryFocus === 'horas' ? b[1].horas - a[1].horas : b[1].falhas - a[1].falhas;
    });
    const criticoProcesso = processosSorted[0] ? { name: processosSorted[0][0], ...processosSorted[0][1] } : null;

    return criticoProcesso;
  }, [filteredData, filterColMapping, horasCol, summaryFocus]);

  const topEquipamentoInfo = useMemo(() => {
    if (!advancedAnalysis.indicadoresEquipamentos || advancedAnalysis.indicadoresEquipamentos.length === 0) return { primary: null, isTie: false, tiedWith: null };
    
    const sorted = [...advancedAnalysis.indicadoresEquipamentos].sort((a, b) => {
        return summaryFocus === 'horas' ? b.tempoTotalReparo - a.tempoTotalReparo : b.totalFalhas - a.totalFalhas;
    });
    
    const primary = sorted[0];
    let isTie = false;
    let tiedWith = null;

    if (summaryFocus === 'chamados' && sorted.length > 1) {
        if (sorted[0].totalFalhas === sorted[1].totalFalhas) {
            isTie = true;
            tiedWith = sorted[1];
        }
    }

    return { primary, isTie, tiedWith };
  }, [advancedAnalysis.indicadoresEquipamentos, summaryFocus]);

  const rootCauseAnalysis = useMemo(() => {
    if (filteredData.length === 0) return { topCausa: null, topParte: null, isCauseTie: false, tiedCause: null };

    const causaCol = filterColMapping['Causa'] || 'Causa';
    const parteCol = filterColMapping['Parte'] || 'Parte';

    const causasAgg: Record<string, number> = {};
    const partesAgg: Record<string, number> = {};

    filteredData.forEach(row => {
      const causa = String(row[causaCol] || row['Causa'] || 'N/A').trim();
      const parte = String(row[parteCol] || row['Parte'] || 'N/A').trim();
      const value = summaryFocus === 'horas' ? (Number(row[horasCol]) || 0) : 1;

      causasAgg[causa] = (causasAgg[causa] || 0) + value;
      partesAgg[parte] = (partesAgg[parte] || 0) + value;
    });

    const sortedCausas = Object.entries(causasAgg).sort((a, b) => b[1] - a[1]);
    const topCausaEntry = sortedCausas[0];
    
    let isCauseTie = false;
    let tiedCause = null;

    if (summaryFocus === 'chamados' && sortedCausas.length > 1) {
       if (sortedCausas[0][1] === sortedCausas[1][1]) {
           isCauseTie = true;
           tiedCause = { name: sortedCausas[1][0], value: sortedCausas[1][1] };
       }
    }

    const topParteEntry = Object.entries(partesAgg).sort((a, b) => b[1] - a[1])[0];

    const totalValue = Object.values(causasAgg).reduce((acc, curr) => acc + curr, 0);

    return {
      topCausa: topCausaEntry ? { name: topCausaEntry[0], value: topCausaEntry[1], percent: totalValue ? (topCausaEntry[1] / totalValue) * 100 : 0 } : null,
      topParte: topParteEntry ? { name: topParteEntry[0], value: topParteEntry[1] } : null,
      isCauseTie,
      tiedCause
    };
  }, [filteredData, filterColMapping, horasCol, summaryFocus]);

  const aggregateData = (groupBy: string, sumBy: string, countBy?: string) => {
    const result: Record<string, any> = {};
    
    filteredData.forEach(row => {
      const key = row[groupBy] || 'N/A';
      if (!result[key]) {
        result[key] = { name: key, [sumBy]: 0 };
        if (countBy) result[key][countBy] = 0;
      }
      
      const hours = parseHours(row[sumBy]);
      result[key][sumBy] += hours;
      if (countBy) result[key][countBy] += 1;
    });
    
    // Format numbers to 2 decimal places
    return Object.values(result)
      .map(item => ({
        ...item,
        [sumBy]: Number(item[sumBy].toFixed(2))
      }))
      .sort((a, b) => b[sumBy] - a[sumBy]);
  };

  const totalHoras = useMemo(() => {
    const total = filteredData.reduce((acc, row) => {
      const hours = parseHours(row[horasCol]);
      return acc + hours;
    }, 0);
    return Number(total.toFixed(2));
  }, [filteredData, horasCol]);
  
  const grupoCol = useMemo(() => getColName(['Grupo', 'Tipo', 'Tipo (Grupo)', 'Categoria']), [rawData]);
  const maquinaCol = useMemo(() => getColName(['Máquina', 'Maquina', 'Equipamento', 'Ativo']), [rawData]);
  const parteCol = useMemo(() => getColName(['Parte', 'Componente', 'Subconjunto']), [rawData]);
  const causaCol = useMemo(() => getColName(['Causa', 'Motivo', 'Falha']), [rawData]);
  const setorCol = useMemo(() => getColName(['Setor', 'Área', 'Area', 'Departamento']), [rawData]);

  const grupoData = useMemo(() => aggregateData(grupoCol, horasCol).slice(0, 10), [filteredData, horasCol, grupoCol]);
  const maquinaData = useMemo(() => aggregateData(maquinaCol, horasCol, 'paradas').slice(0, 10), [filteredData, horasCol, maquinaCol]);
  const parteData = useMemo(() => aggregateData(parteCol, horasCol, 'paradas').slice(0, 10), [filteredData, horasCol, parteCol]);
  const causaData = useMemo(() => aggregateData(causaCol, horasCol).slice(0, 10), [filteredData, horasCol, causaCol]);
  const setorData = useMemo(() => aggregateData(setorCol, horasCol).slice(0, 10), [filteredData, horasCol, setorCol]);

  const lastUpdateDate = useMemo(() => {
    if (!Array.isArray(rawData) || rawData.length === 0) return null;
    let maxDate: Date | null = null;
    rawData.forEach(row => {
      const date = parseToDate(row);
      if (date && (!maxDate || date > maxDate)) {
        maxDate = date;
      }
    });
    return maxDate;
  }, [rawData]);

  return (
    <>
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Configurar Impressão PDF</h3>
              <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 mb-4">Selecione quais seções você deseja incluir no relatório.</p>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pdfConfig.header} onChange={(e) => setPdfConfig({...pdfConfig, header: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Cabeçalho (Resumo Global)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pdfConfig.filters} onChange={(e) => setPdfConfig({...pdfConfig, filters: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Filtros Aplicados</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pdfConfig.currentTab} onChange={(e) => setPdfConfig({...pdfConfig, currentTab: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Aba Atual: <span className="capitalize">{activeSubTab}</span></span>
                </label>
              </div>

              <div className="pt-3 pb-1 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gráficos de Pareto</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={pdfConfig.chartGrupo} onChange={(e) => setPdfConfig({...pdfConfig, chartGrupo: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm text-slate-600">Por Grupo</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={pdfConfig.chartSetor} onChange={(e) => setPdfConfig({...pdfConfig, chartSetor: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm text-slate-600">Por Setor</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={pdfConfig.chartMaquina} onChange={(e) => setPdfConfig({...pdfConfig, chartMaquina: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm text-slate-600">Por Máquina</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={pdfConfig.chartParte} onChange={(e) => setPdfConfig({...pdfConfig, chartParte: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm text-slate-600">Por Parte</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer col-span-2">
                    <input type="checkbox" checked={pdfConfig.chartCausa} onChange={(e) => setPdfConfig({...pdfConfig, chartCausa: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span className="text-sm text-slate-600">Por Causa</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 pb-1 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tabela de Eventos</p>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pdfConfig.history} onChange={(e) => setPdfConfig({...pdfConfig, history: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Histórico de Ações (Últimos 50)</span>
                </label>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowPdfModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
              <button 
                onClick={() => {
                  setShowPdfModal(false);
                  generatePDF();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for PDF Generation - MUST be outside the print area */}
      {isGeneratingPDF && (
        <>
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6 shadow-lg"></div>
            <h2 className="text-3xl font-black text-slate-800">Montando Relatório Profissional...</h2>
            <p className="text-slate-500 mt-3 font-medium text-lg text-center px-4">Por favor, aguarde a captura dos gráficos e tabelas.<br/><span className="text-sm opacity-70">Não minimize o navegador</span></p>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            #pdf-print-area {
              width: 1200px !important;
              min-width: 1200px !important;
              max-width: 1200px !important;
              margin: 0 auto !important;
            }
            /* Force Tailwind layout classes as if it were a desktop screen, ignoring actual device width */
            #pdf-print-area .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            #pdf-print-area .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            #pdf-print-area .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            #pdf-print-area .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            #pdf-print-area .lg\\:flex-row { flex-direction: row !important; }
            #pdf-print-area .lg\\:items-center { align-items: center !important; }
            #pdf-print-area .lg\\:col-span-2 { grid-column: span 2 / span 2 !important; }
            #pdf-print-area .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            #pdf-print-area .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          `}} />
        </>
      )}

      <div className="space-y-6 relative" id="pdf-print-area">
        {/* CABEÇALHO */}
        <div className={cn("flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm pdf-block", isGeneratingPDF && !pdfConfig.header && "hidden")}>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900">Análise de Falhas (BI)</h3>
          {rawData.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <div>
                  <p className="text-[9px] font-bold text-orange-400 uppercase leading-none">Total de Horas</p>
                  <p className="text-lg font-black text-orange-600">{totalHoras}h</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <div>
                  <p className="text-[9px] font-bold text-blue-400 uppercase leading-none">Total de Registros</p>
                  <p className="text-lg font-black text-blue-600">{filteredData.length}</p>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase leading-none">Dados Atualizados Até</p>
                  <p className="text-lg font-black text-emerald-600">{lastUpdateDate ? formatDate(lastUpdateDate) : '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {rawData.length === 0 ? (
        loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Carregando dados...</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Aguarde enquanto buscamos suas informações no servidor.
            </p>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma base de dados importada</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Faça o upload da sua planilha contendo o histórico de falhas para visualizar os dashboards dinâmicos.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Filtros Dinâmicos */}
          <div className={cn("bg-white p-4 rounded-2xl border border-slate-100 shadow-sm pdf-block", isGeneratingPDF && !pdfConfig.filters && "hidden")}>
            {/* ... existing filters ... */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                <Filter className="w-4 h-4" />
                <span>Filtros Dinâmicos</span>
              </div>
            <div className="flex items-center space-x-4" data-html2canvas-ignore="true">
              <button 
                onClick={() => setShowPdfModal(true)}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Gerar PDF</span>
              </button>
              <button 
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            </div>
            </div>
            <div className="space-y-3">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                    Intervalo de Datas (Dia)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="date"
                      className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <span className="text-slate-400 text-xs">até</span>
                    <input 
                      type="date"
                      className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Ano */}
                <div className="flex flex-col col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Ano</label>
                  <select 
                    className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters['Ano']}
                    onChange={(e) => handleFilterChange('Ano', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {getUniqueValues('Ano').map((val: any, idx) => (
                      <option key={idx} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                {/* Mês */}
                <div className="flex flex-col col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Mês</label>
                  <select 
                    className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters['Mês']}
                    onChange={(e) => handleFilterChange('Mês', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {getUniqueValues('Mês').map((val: any, idx) => (
                      <option key={idx} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {/* Filtro Agrupado: Tipo e Máquina */}
                <div className="flex flex-col col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1 flex items-center">
                    <Filter className="w-3 h-3 mr-1" /> Filtro Combinado (Tipo & Máquina)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tipo (Grupo)</label>
                      <select 
                        className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filters['Grupo']}
                        onChange={(e) => handleFilterChange('Grupo', e.target.value)}
                      >
                        <option value="">Todos</option>
                        {getUniqueValues('Grupo').map((val: any, idx) => (
                          <option key={idx} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Máquina</label>
                      <select 
                        className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filters['Máquina']}
                        onChange={(e) => handleFilterChange('Máquina', e.target.value)}
                      >
                        <option value="">Todas</option>
                        {getUniqueValues('Máquina').map((val: any, idx) => (
                          <option key={idx} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Turno, Setor, Parte */}
                {['Turno', 'Setor', 'Parte'].map(filterKey => (
                  <div key={filterKey} className="flex flex-col col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                      {filterKey}
                    </label>
                    <select 
                      className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={filters[filterKey]}
                      onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    >
                      <option value="">Todos</option>
                      {getUniqueValues(filterKey).map((val: any, idx) => (
                        <option key={idx} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 text-right">
              Mostrando {filteredData.length} de {rawData.length} registros
            </div>
          </div>

          {/* Sub-Tabs Navigation (Always hide during PDF to not clutter) */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto pdf-block" data-html2canvas-ignore="true">
            {[
              { id: 'resumo', label: 'Resumo', icon: Activity },
              { id: 'indicadores', label: 'Indicadores', icon: ListFilter },
              { id: 'ranking', label: 'Ranking', icon: Award },
              { id: 'pareto', label: 'Pareto', icon: PieChartIcon },
              { id: 'tendencia', label: 'Tendência', icon: TrendingUp },
              { id: 'tecnicos', label: 'Técnicos', icon: Users },
              { id: 'turno', label: 'Turno', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeSubTab === tab.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-Tabs Content */}
          <div className={cn("space-y-6", isGeneratingPDF && !pdfConfig.currentTab && "hidden")}>
            {activeSubTab === 'resumo' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pdf-block">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total de Falhas</p>
                    <h4 className="text-2xl font-black text-slate-900">{advancedAnalysis.resumo.totalFalhas}</h4>
                    <div className="mt-2 text-[10px] text-slate-500">Ocorrências no período</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tempo Total Reparo</p>
                    <h4 className="text-2xl font-black text-orange-600">{advancedAnalysis.resumo.tempoTotalReparo}h</h4>
                    <div className="mt-2 text-[10px] text-slate-500">Horas paradas totais</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">MTBF Médio</p>
                    <h4 className="text-2xl font-black text-blue-600">{advancedAnalysis.resumo.mtbfMedio}h</h4>
                    <div className="mt-2 text-[10px] text-slate-500">Média entre equipamentos</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Equipamentos Críticos</p>
                    <h4 className="text-2xl font-black text-rose-600">{advancedAnalysis.resumo.equipamentosCriticos}</h4>
                    <div className="mt-2 text-[10px] text-slate-500">Mais de 6 falhas no período</div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'indicadores' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden pdf-block">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="font-bold text-slate-700">Indicadores por Equipamento</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Equipamento</span>
                            {sortConfig?.key === 'name' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('totalFalhas')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Falhas</span>
                            {sortConfig?.key === 'totalFalhas' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('mtbf')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>MTBF</span>
                            {sortConfig?.key === 'mtbf' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('mttr')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>MTTR</span>
                            {sortConfig?.key === 'mttr' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('indiceFalha')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Índice Falha</span>
                            {sortConfig?.key === 'indiceFalha' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Status</span>
                            {sortConfig?.key === 'status' && (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedIndicadores.map((eq, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-700">{eq.name}</td>
                          <td className="px-4 py-3 text-center">{eq.totalFalhas}</td>
                          <td className="px-4 py-3 text-center font-mono">{eq.mtbf}h</td>
                          <td className="px-4 py-3 text-center font-mono">{eq.mttr}h</td>
                          <td className="px-4 py-3 text-center font-mono">{eq.indiceFalha}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                              eq.status === 'Crítico' ? "bg-rose-100 text-rose-600" :
                              eq.status === 'Atenção' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {eq.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'ranking' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pdf-block">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4">Top 10 Mais Falhas</h4>
                  <div className="failure-analysis-chart min-h-[320px]" data-pdf-title="Ranking: Top 10 Mais Falhas">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <BarChart data={advancedAnalysis.rankingFalhas.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="totalFalhas" 
                          fill="#1e3a8a" 
                          radius={[0, 4, 4, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Máquina', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="totalFalhas" position="right" fontSize={10} fill="#64748b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4">Top 10 Maior Tempo Parado</h4>
                  <div className="failure-analysis-chart min-h-[320px]" data-pdf-title="Ranking: Top 10 Maior Tempo Parado">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <BarChart data={[...advancedAnalysis.indicadoresEquipamentos].sort((a,b) => b.tempoTotalReparo - a.tempoTotalReparo).slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="tempoTotalReparo" 
                          fill="#f97316" 
                          radius={[0, 4, 4, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Máquina', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="tempoTotalReparo" position="right" fontSize={10} fill="#64748b" formatter={(val: number) => val.toFixed(1) + 'h'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'pareto' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pdf-block">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4">Pareto por Causa</h4>
                  <div className="failure-analysis-chart min-h-[256px]" data-pdf-title="Pareto por Causa">
                    <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                      <PieChart>
                        <Pie 
                          data={advancedAnalysis.paretoCausas.slice(0, 5)} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Causa', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          {advancedAnalysis.paretoCausas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4">Pareto por Problema</h4>
                  <div className="failure-analysis-chart min-h-[256px]" data-pdf-title="Pareto por Problema">
                    <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                      <PieChart>
                        <Pie 
                          data={advancedAnalysis.paretoProblemas.slice(0, 5)} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Problema', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          {advancedAnalysis.paretoProblemas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4">Pareto por Parte</h4>
                  <div className="failure-analysis-chart min-h-[256px]" data-pdf-title="Pareto por Parte">
                    <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                      <PieChart>
                        <Pie 
                          data={advancedAnalysis.paretoPartes.slice(0, 5)} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Parte', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          {advancedAnalysis.paretoPartes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'tendencia' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm pdf-block">
                <h4 className="font-bold text-slate-700 mb-4">Tendência Mensal de Falhas</h4>
                <div className="failure-analysis-chart min-h-[320px]" data-pdf-title="Tendência Mensal de Falhas">
                  <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                    <BarChart data={advancedAnalysis.tendenciaMensal}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar 
                        dataKey="falhas" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                        isAnimationActive={false}
                        onClick={(data: any) => {
                          const monthIndex = parseInt(String(data.month).split('-')[1], 10) - 1;
                          const monthsNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                          handleChartClick('Mês', monthsNames[monthIndex]);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <LabelList dataKey="falhas" position="top" fontSize={10} fill="#64748b" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeSubTab === 'tecnicos' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm pdf-block">
                <h4 className="font-bold text-slate-700 mb-4">Análise por Técnico</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="failure-analysis-chart min-h-[320px]" data-pdf-title="Técnicos: Atendimentos">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <BarChart data={advancedAnalysis.analiseTecnico.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="atendimentos" 
                          name="Atendimentos" 
                          fill="#10b981" 
                          radius={[0, 4, 4, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Executante', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="atendimentos" position="right" fontSize={10} fill="#64748b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="failure-analysis-chart min-h-[320px]" data-pdf-title="Técnicos: MTTR">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <BarChart data={advancedAnalysis.analiseTecnico.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="tempoMedio" 
                          name="MTTR (h)" 
                          fill="#f59e0b" 
                          radius={[0, 4, 4, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Executante', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="tempoMedio" position="right" fontSize={10} fill="#64748b" formatter={(val: number) => val.toFixed(1) + 'h'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'turno' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm pdf-block">
                <h4 className="font-bold text-slate-700 mb-4">Análise por Turno</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Turno: Total Falhas">
                    <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                      <BarChart data={advancedAnalysis.analiseTurno}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="totalFalhas" 
                          name="Falhas" 
                          fill="#6366f1" 
                          radius={[4, 4, 0, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Turno', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="totalFalhas" position="top" fontSize={10} fill="#64748b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Turno: MTTR">
                    <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                      <BarChart data={advancedAnalysis.analiseTurno}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar 
                          dataKey="tempoMedio" 
                          name="MTTR (h)" 
                          fill="#ec4899" 
                          radius={[4, 4, 0, 0]} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Turno', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="tempoMedio" position="top" fontSize={10} fill="#64748b" formatter={(val: number) => val.toFixed(1) + 'h'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gráficos Originais (Ocultos ou Mantidos conforme regra de não alterar funcionalidade atual) */}
          <div className="pt-12 border-t border-slate-200 space-y-6">
            
            {/* Linha 1 */}
            <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6 pdf-block", isGeneratingPDF && (!pdfConfig.chartGrupo && !pdfConfig.chartSetor) && "hidden")}>
              {(!isGeneratingPDF || pdfConfig.chartGrupo) && (
                <div className={cn("bg-white p-6 rounded-2xl border border-slate-100 shadow-sm", isGeneratingPDF && !pdfConfig.chartSetor && "lg:col-span-2")}>
                  <h4 className="font-bold text-slate-700 mb-4">Hr. Parada / Grupo (Tipo)</h4>
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Hr. Parada / Grupo (Tipo)">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                      <BarChart 
                        layout="vertical"
                        data={grupoData}
                        margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} fontSize={12} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar 
                          dataKey={horasCol} 
                          name="Horas Paradas" 
                          fill="#f97316" 
                          barSize={30} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Grupo', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey={horasCol} position="right" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}h`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {(!isGeneratingPDF || pdfConfig.chartSetor) && (
                <div className={cn("bg-white p-6 rounded-2xl border border-slate-100 shadow-sm", isGeneratingPDF && !pdfConfig.chartGrupo && "lg:col-span-2")}>
                  <h4 className="font-bold text-slate-700 mb-4">Hr. Parada / Setor (Elétrico vs Mecânico)</h4>
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Hr. Parada / Setor (Elétrico vs Mecânico)">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                      <PieChart>
                        <Pie
                          data={setorData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          isAnimationActive={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                            if (percent <= 0.05) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius * 1.1;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text 
                                x={x} 
                                y={y} 
                                fill="#334155" 
                                textAnchor={x > cx ? 'start' : 'end'} 
                                dominantBaseline="central"
                                fontSize={12}
                                fontWeight="bold"
                              >
                                {`${name}: ${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey={horasCol}
                          onClick={(data) => handleChartClick('Setor', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          {setorData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={SECTOR_COLORS[String(entry.name)] || COLORS[index % COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value}h`, 'Horas Paradas']} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Linha 2 */}
            <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6 pdf-block", isGeneratingPDF && (!pdfConfig.chartMaquina && !pdfConfig.chartParte) && "hidden")}>
              {(!isGeneratingPDF || pdfConfig.chartMaquina) && (
                <div className={cn("bg-white p-6 rounded-2xl border border-slate-100 shadow-sm", isGeneratingPDF && !pdfConfig.chartParte && "lg:col-span-2")}>
                  <h4 className="font-bold text-slate-700 mb-4">Hr. Parada / Máquina</h4>
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Hr. Parada / Máquina">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                      <BarChart 
                        layout="vertical"
                        data={maquinaData}
                        margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} fontSize={12} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Legend />
                        <Bar 
                          dataKey={horasCol} 
                          name="Hr. Total Parada" 
                          fill="#f97316" 
                          barSize={20} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Máquina', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey={horasCol} position="right" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}h`} />
                        </Bar>
                        <Bar 
                          dataKey="paradas" 
                          name="Número paradas" 
                          fill="#1e3a8a" 
                          barSize={20} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Máquina', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="paradas" position="right" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {(!isGeneratingPDF || pdfConfig.chartParte) && (
                <div className={cn("bg-white p-6 rounded-2xl border border-slate-100 shadow-sm", isGeneratingPDF && !pdfConfig.chartMaquina && "lg:col-span-2")}>
                  <h4 className="font-bold text-slate-700 mb-4">Hr. Parada / Parte</h4>
                  <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Hr. Parada / Parte">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                      <BarChart 
                        layout="vertical"
                        data={parteData}
                        margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={180} fontSize={12} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Legend />
                        <Bar 
                          dataKey={horasCol} 
                          name="Horas Paradas" 
                          fill="#f97316" 
                          barSize={20} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Parte', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey={horasCol} position="right" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}h`} />
                        </Bar>
                        <Bar 
                          dataKey="paradas" 
                          name="Número Paradas" 
                          fill="#1e3a8a" 
                          barSize={20} 
                          isAnimationActive={false}
                          onClick={(data) => handleChartClick('Parte', String(data.name))}
                          style={{ cursor: 'pointer' }}
                        >
                          <LabelList dataKey="paradas" position="right" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Linha 3 */}
            <div className={cn("grid grid-cols-1 gap-6 pdf-block", isGeneratingPDF && !pdfConfig.chartCausa && "hidden")}>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4">Hr. Parada / Causa</h4>
                <div className="failure-analysis-chart min-h-[400px]" data-pdf-title="Hr. Parada / Causa">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                    <BarChart 
                      layout="vertical"
                      data={causaData}
                      margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={180} fontSize={12} interval={0} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar 
                        dataKey={horasCol} 
                        name="Horas Paradas" 
                        fill="#f97316" 
                        barSize={30} 
                        isAnimationActive={false}
                        onClick={(data) => handleChartClick('Causa', String(data.name))}
                        style={{ cursor: 'pointer' }}
                      >
                        <LabelList dataKey={horasCol} position="right" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}h`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {filteredData.length > 0 && (
            <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4 pdf-block transition-all duration-300">
              <div className="bg-blue-600 text-white p-3 rounded-xl flex-shrink-0 self-start shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full max-w-full">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start w-full mb-2 gap-3">
                  <h4 className="font-black text-blue-900 text-lg flex items-center gap-2">
                    Resumo Inteligente <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Análise Dinâmica</span>
                  </h4>
                  <div className="flex bg-white rounded-lg p-1 shadow-sm border border-blue-100 text-[10px] sm:text-xs font-bold w-fit">
                      <button
                          onClick={() => setSummaryFocus('horas')}
                          className={`px-3 py-1.5 rounded-md transition-colors ${summaryFocus === 'horas' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                          Foco em Horas
                      </button>
                      <button
                          onClick={() => setSummaryFocus('chamados')}
                          className={`px-3 py-1.5 rounded-md transition-colors ${summaryFocus === 'chamados' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                          Foco em Frequência
                      </button>
                  </div>
                </div>
                <p className="text-blue-700 font-medium text-xs mb-3 italic">
                  {activeFiltersDesc} {summaryFocus === 'horas' ? '(Perspectiva de MTTR)' : '(Perspectiva de Repetição)'}
                </p>
                
                {/* Diferenciar Visão Macroscópica (Processo/Setores gerais) vs Visão Filtrada (Foco no Equipamento) */}
                {(!filters.Setor && macroAnalysis) ? (
                  <p className="text-blue-900 text-sm leading-relaxed">
                    Avaliando a totalidade de <strong>{filteredData.length} registros</strong> neste recorte, o processo/setor mais crítico sob a ótica de {summaryFocus === 'horas' ? 'tempo parado' : 'ocorrências'} é <strong>"{macroAnalysis.name}"</strong>, correspondendo a <span className="font-extrabold text-orange-600">{macroAnalysis.horas.toFixed(2)} horas totais de parada</span> em {macroAnalysis.falhas} ocorrências.
                    <br/><br/>
                    
                    {topEquipamentoInfo.isTie ? (
                       <>
                         Neste cenário, identificamos um <strong>empate técnico na quantidade de chamados</strong> entre dois grandes ofensores: a máquina <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.primary?.name || 'N/A'}</span> e a máquina <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.tiedWith?.name || 'N/A'}</span> (ambas acumularam <strong>{topEquipamentoInfo.primary?.totalFalhas} falhas</strong>).
                         <br/><br/>
                         💡 <em>Recomendamos alterar a perspectiva para <strong>"Foco em Horas"</strong> para desempatar e focar no evento de maior severidade e custo de inatividade.</em>
                         <br/><br/>
                         De forma geral, a raiz sistêmica das dores nestes equipamentos está ligada a <strong>"{rootCauseAnalysis.topCausa?.name || 'N/A'}"</strong> e afeta componentes do tipo <strong>"{rootCauseAnalysis.topParte?.name || 'N/A'}"</strong>.
                       </>
                    ) : (
                       <>
                         Dentro desse cenário geral, o equipamento com o ofensor individual mais grave é o <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.primary?.name || 'N/A'}</span> ({topEquipamentoInfo.primary?.tempoTotalReparo?.toFixed(2) || 0}h retidas em {topEquipamentoInfo.primary?.totalFalhas || 0} falhas).
                         
                         {rootCauseAnalysis.isCauseTie ? (
                            <>
                              A raiz do problema divide-se em um forte <strong>empate técnico entre duas causas atuantes:</strong> <strong>"{rootCauseAnalysis.topCausa?.name || 'N/A'}"</strong> e <strong>"{rootCauseAnalysis.tiedCause?.name || 'N/A'}"</strong> (ambas com o mesmo volume de registros), afetando os componentes do tipo <strong>"{rootCauseAnalysis.topParte?.name || 'N/A'}"</strong>. Recomendamos chavear a análise com foco em HORAS na parte superior direita deste painel.
                            </>
                         ) : (
                            <>
                               A raiz do problema sistêmico está muito ligada a <strong>"{rootCauseAnalysis.topCausa?.name || 'N/A'}"</strong> ({(rootCauseAnalysis.topCausa?.percent || 0).toFixed(0)}% do peso no impacto global) e afeta majoritariamente os componentes do tipo <strong>"{rootCauseAnalysis.topParte?.name || 'N/A'}"</strong>.
                            </>
                         )}
                       </>
                    )}
                    <br/><br/>
                    {(topEquipamentoInfo.primary?.tempoTotalReparo > 10 || (advancedAnalysis.resumo?.totalFalhas || 0) > 15) ? " ⚠️ O panorama industrial exige atenção global nesse processo crítico para investigar eventos de alta demanda temporal e mitigar paradas longas na área." : " ✅ O cenário global está controlado e indica atuações eficientes para a área selecionada, sem colapso sistêmico ou de linha."}
                  </p>
                ) : (
                  <p className="text-blue-900 text-sm leading-relaxed">
                    Neste cenário focado ({filters.Setor ? `processo restrito a ${filters.Setor}` : `visão parcial`} contendo <strong>{filteredData.length} avaliações</strong>), a gravidade por {summaryFocus === 'horas' ? 'impacto de tempo' : 'frequência quebradiça'} aponta para:
                    <br/><br/>
                    
                    {topEquipamentoInfo.isTie ? (
                        <>
                           <strong>Empate Técnico:</strong> Os agressores empataram. O equipamento <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.primary?.name || 'N/A'}</span> e o equipamento <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.tiedWith?.name || 'N/A'}</span> dividem a estatística com <strong>{topEquipamentoInfo.primary?.totalFalhas} ocorrências diretas</strong>.
                           <br/><br/>
                           💡 <em>A frequência pura de quebras não revela toda a verdade (uma pode ter durado minutos, e a outra, horas). Clique em <strong>"Foco em Horas"</strong> (no topo direito desta caixa) para o sistema ranquear qual das duas custou mais caro na produção.</em>
                        </>
                    ) : (
                        <>
                           O <span className="font-bold underline decoration-blue-300 decoration-2">{topEquipamentoInfo.primary?.name || 'N/A'}</span>. Ele isoladamente acumula <span className="font-extrabold text-orange-600">{topEquipamentoInfo.primary?.tempoTotalReparo?.toFixed(2) || 0} horas totais de reparo</span> ao longo de {topEquipamentoInfo.primary?.totalFalhas || 0} ocorrências diretas.
                           <br/><br/>
                           {rootCauseAnalysis.isCauseTie ? (
                               <>Avaliando a assinatura de falha desse local, a ofensa (causa raiz micro) apresentou <strong>Empate Múltiplo</strong> entre duas frentes: as causas <strong>"{rootCauseAnalysis.topCausa?.name || 'N/A'}"</strong> e <strong>"{rootCauseAnalysis.tiedCause?.name || 'N/A'}"</strong> empataram em frequência e prejudicam os mesmos conjuntos de <strong>"{rootCauseAnalysis.topParte?.name || 'N/A'}"</strong>. Recomendamos a análise com foco em <em>horas</em> nesses casos para entender qual custou mais caro para arrumar.</>
                           ) : (
                               <>Avaliando a assinatura de falha desse recorte específico, a principal ofensa (causa raiz micro) é de natureza <strong>"{rootCauseAnalysis.topCausa?.name || 'N/A'}"</strong> ({(rootCauseAnalysis.topCausa?.percent || 0).toFixed(0)}% do impacto local documentado), cujo reflexo destrutivo se concentra sobre a parte/componente <strong>"{rootCauseAnalysis.topParte?.name || 'N/A'}"</strong>.</>
                           )}
                        </>
                    )}
                    <br/><br/>
                    {(topEquipamentoInfo.primary?.tempoTotalReparo > 5 || topEquipamentoInfo.primary?.totalFalhas > 5) ? ` 🚨 ATENÇÃO: As perdas registradas neste filtro caracterizam um impacto severo ou crônico na operação. É crítico analisar a reincidência e propor uma engenharia de contramedida definitiva.` : " ✅ A análise parcial sugere atuações corretivas pontuais, não configurando gargalo crônico extremo no exato momento."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Histórico de Ações Table */}
          <div className={cn("mt-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm pdf-block", isGeneratingPDF && !pdfConfig.history && "hidden")}>
            <h4 className="font-bold text-slate-700 mb-4">Histórico de Ações (Últimos 50 registros)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600">Descrição Detalhada</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Executante</th>
                    <th className="px-4 py-3 font-bold text-slate-600 text-right">Hr. Parada</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Data</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Máquina</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Causa</th>
                    <th className="px-4 py-3 font-bold text-slate-600 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 50).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-slate-700 leading-relaxed whitespace-normal min-w-[250px]">
                          {row['Descrição'] || row['Descricao'] || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{row['Executante'] || row['Nome'] || row['Pessoa'] || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">
                        {row[horasCol] !== undefined ? Number(row[horasCol]).toFixed(2) : '-'}h
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(row['Data'] || row['Dia'])}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                        {row['Máquina'] || row['Maquina'] || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                          {row['Causa'] || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setSelectedRow(row)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Info className="w-8 h-8 mb-2 opacity-20" />
                          <p>Nenhum registro encontrado para os filtros selecionados.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Modal */}
          <AnimatePresence>
            {selectedRow && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Detalhes da Ocorrência</h3>
                        <p className="text-xs text-slate-500">Informações completas do registro</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedRow(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Descrição em destaque */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição Completa</label>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedRow['Descrição'] || selectedRow['Descricao'] || 'Sem descrição detalhada.'}
                      </div>
                    </div>

                    {/* Grid de informações */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Máquina</label>
                        <p className="font-bold text-slate-900">{selectedRow['Máquina'] || selectedRow['Maquina'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parte / Componente</label>
                        <p className="font-bold text-slate-900">{selectedRow['Parte'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo de Parada</label>
                        <p className="font-bold text-orange-600 text-lg">
                          {selectedRow[horasCol] !== undefined ? Number(selectedRow[horasCol]).toFixed(2) : '-'}h
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Causa</label>
                        <p className="font-bold text-slate-900">{selectedRow['Causa'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</label>
                        <p className="font-bold text-slate-900">{formatDate(selectedRow['Data'] || selectedRow['Dia'])}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executante</label>
                        <p className="font-bold text-slate-900">{selectedRow['Executante'] || selectedRow['Nome'] || selectedRow['Pessoa'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turno</label>
                        <p className="font-bold text-slate-900">{selectedRow['Turno'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setor</label>
                        <p className="font-bold text-slate-900">{selectedRow['Setor'] || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grupo (Tipo)</label>
                        <p className="font-bold text-slate-900">{selectedRow['Grupo'] || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setSelectedRow(null)}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
      </div>
    </>
  );
};
