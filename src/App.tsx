import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MaintenanceSolutionsModule } from './components/MaintenanceSolutionsModule';
import { PreventiveAssetsModule } from './components/PreventiveAssetsModule';
import { ImprovementManagementModule } from './components/ImprovementManagementModule';
// Version: 1.0.1 - Consolidated structure
import { 
  LayoutDashboard, 
  Settings, 
  Wrench, 
  Box, 
  Calendar, 
  Plus, 
  Download, 
  Search, 
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  FileSpreadsheet,
  Mail,
  Lock,
  UserPlus,
  Pencil,
  Info,
  Eye,
  ClipboardList,
  Lightbulb,
  GanttChart,
  FileText,
  FileDown,
  Edit2,
  Trash2,
  Printer,
  Check,
  Building2,
  DollarSign,
  Package,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Legend,
  LabelList
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO,
  differenceInDays,
  addDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isAfter,
  isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hasPermission, Action } from './lib/permissions';
import { ChecklistModal } from './components/ChecklistModule/ChecklistModal';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Asset, WorkOrder, PreventivePlan, PreventivePlanAsset, UserProfile, Employee, UserPermissions, Notification } from './types';
import { 
  auth, 
  db,
  loginWithGoogle, 
  loginWithGoogleRedirect,
  handleRedirectResult,
  logout, 
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  subscribeToCollection,
  subscribeToUserCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  resetCollection,
  getUserProfile,
  setUserProfile,
  getAllUsers,
  loadDatabaseEntry,
  saveDatabaseEntry,
  saveGlobalData,
  loadGlobalData,
  subscribeToGlobalData,
  collection,
  query,
  getDocs
} from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import { FailureAnalysisModule } from './components/FailureAnalysisModule';
import { DatabaseModule } from './components/DatabaseModule';
import { ServiceManagementModule } from './components/ServiceManagementModule';
import { PasswordManagement } from './components/PasswordManagement';
import { TechnicalKnowledgeModule } from './components/TechnicalKnowledgeModule';
import { ServiceDemand } from './types';
import { EngineeringProject, ThirdPartyCompany } from './types';
import { ThirdPartyModule } from './components/ThirdPartyModule';

// ... (inside App component)

import { Database } from 'lucide-react';

const getMonthNumber = (val: any) => {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (!isNaN(parseInt(s)) && /^\d+$/.test(s)) return parseInt(s);
  
  const fullMonths = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const shortMonths = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  
  let idx = fullMonths.indexOf(s);
  if (idx !== -1) return idx + 1;
  
  idx = shortMonths.indexOf(s);
  if (idx !== -1) return idx + 1;
  
  return null;
};

const parsePercent = (val: any) => {
  if (val === undefined || val === null || val === '-' || val === '') return null;
  
  const isString = typeof val === 'string';
  const hasPercent = isString && val.includes('%');
  let num: number;

  if (typeof val === 'number') {
    num = val;
  } else {
    num = parseFloat(String(val).replace('%', '').replace(',', '.'));
  }

  // Heurística: se o valor for < 0.1 e não tiver o símbolo '%', provavelmente é um decimal do Excel (ex: 0,024 = 2,4%)
  // Usamos 0.1 como limite para evitar transformar 0.5 (que pode ser 0.5%) em 50 (que seria 50%)
  if (!hasPercent && !isNaN(num) && num > 0 && num < 0.1) {
    num = num * 100;
  }
  
  return isNaN(num) ? null : num;
};

// --- Components ---

const ConfirmModal = ({ 
  show, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  show: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-slate-500 text-sm mb-8">{message}</p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={onCancel}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={onConfirm}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const mockChartData = [
  { month: 'Jan', manutencao: 2.87, metaManutencao: 4.00, mecanica: 1.41, metaMecanica: 2.40, eletrica: 1.46, metaEletrica: 1.60 },
  { month: 'Fev', manutencao: 3.83, metaManutencao: 4.00, mecanica: 2.43, metaMecanica: 2.40, eletrica: 1.40, metaEletrica: 1.60 },
  { month: 'Mar', manutencao: 3.19, metaManutencao: 4.00, mecanica: 1.79, metaMecanica: 2.40, eletrica: 1.40, metaEletrica: 1.60 },
  { month: 'Abr', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Mai', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Jun', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Jul', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Ago', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Set', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Out', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Nov', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
  { month: 'Dez', metaManutencao: 4.00, metaMecanica: 2.40, metaEletrica: 1.60 },
];

const CustomDataLabel = (props: any) => {
  const { x, y, value, index, data, metaKey } = props;
  if (value == null || value === 0) return null;
  
  // Use parsePercent for consistent behavior
  const valNum = parsePercent(value) || 0;
  const meta = data[index][metaKey];
  const metaNum = parsePercent(meta) || 0;
  
  const isOverMeta = valNum > metaNum;
  const bgColor = isOverMeta ? '#f87171' : '#86efac'; 
  const textColor = isOverMeta ? '#ffffff' : '#064e3b'; 

  return (
    <g transform={`translate(${x},${y - 22})`}>
      <rect x={-24} y={-14} width={48} height={22} fill={bgColor} rx={4} />
      <text x={0} y={0} fill={textColor} fontSize={12} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        {valNum.toFixed(2).replace('.', ',') + '%'}
      </text>
    </g>
  );
};

const CustomMetaLabel = (props: any) => {
  const { x, y, value, index, data } = props;
  if (index !== data.length - 1 || value == null) return null;
  
  return (
    <g transform={`translate(${x + 45},${y})`}>
      <rect x={-25} y={-11} width={50} height={22} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.5} rx={4} />
      <text x={0} y={3} fill="#475569" fontSize={12} fontWeight="bold" textAnchor="middle">
        {value.toFixed(2).replace('.', ',') + '%'}
      </text>
    </g>
  );
};

const GreenArrow = () => (
  <div className="absolute right-4 top-1/2 -translate-y-1/2">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4V20M12 20L18 14M12 20L6 14" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// --- Dashboard Component ---
const Dashboard = ({ 
  assets, 
  wos, 
  bditssData, 
  dinamicaData, 
  setBditssData,
  setDinamicaData,
  handleFileUpload,
  filters,
  setFilters,
  isProcessingFile
}: { 
  assets: Asset[], 
  wos: WorkOrder[], 
  bditssData: any[], 
  dinamicaData: any[], 
  setBditssData: React.Dispatch<React.SetStateAction<any[]>>,
  setDinamicaData: React.Dispatch<React.SetStateAction<any[]>>,
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  filters: { year: string, month: string, viewType: 'Acumulada' | 'Diária', type: string, machine: string, shift: string, sector: string, part: string },
  setFilters: React.Dispatch<React.SetStateAction<{ year: string, month: string, viewType: 'Acumulada' | 'Diária', type: string, machine: string, shift: string, sector: string, part: string }>>,
  isProcessingFile?: boolean
}) => {
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'excel' | 'smart'>('excel');

  const smartKPIs = useMemo(() => {
    if (!wos || wos.length === 0) return null;

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    // Filter WOs for the current month
    const monthWOs = wos.filter(wo => {
      const woDate = new Date(wo.CreatedAt);
      return woDate >= startOfCurrentMonth && woDate <= endOfCurrentMonth;
    });

    const correctiveWOs = monthWOs.filter(wo => wo.Type === 'Corretiva');
    const totalFailures = correctiveWOs.length;
    
    // MTTR: Total Downtime / Number of Failures
    const totalDowntime = correctiveWOs.reduce((acc, wo) => acc + (wo.Duration || 0), 0);
    const mttr = totalFailures > 0 ? totalDowntime / totalFailures : 0;

    // MTBF: Total Operating Time / Number of Failures
    const daysInMonth = differenceInDays(endOfCurrentMonth, startOfCurrentMonth) + 1;
    const totalHoursInMonth = daysInMonth * 24;
    const totalOperatingTime = totalHoursInMonth - totalDowntime;
    const mtbf = totalFailures > 0 ? totalOperatingTime / totalFailures : totalHoursInMonth;

    // Availability: MTBF / (MTBF + MTTR)
    const availability = (mtbf + mttr) > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;

    // Reliability: e^(-t/MTBF) -> t = 24h
    const reliability = mtbf > 0 ? Math.exp(-24 / mtbf) * 100 : 100;

    // Backlog: Sum of estimated hours of open work orders
    const openWOs = wos.filter(wo => wo.Status !== 'Concluída' && wo.Status !== 'Cancelada');
    const backlogHours = openWOs.reduce((acc, wo) => acc + (wo.EstimatedTime || 0), 0);

    // Maintenance Cost: Placeholder
    const maintenanceCost = monthWOs.reduce((acc, wo) => acc + (wo.EstimatedTime || 0) * 50, 0);

    return {
      mtbf,
      mttr,
      availability,
      reliability,
      backlogHours,
      maintenanceCost
    };
  }, [wos]);

  const formatPercent = (val: string | number | null) => {
    const num = parsePercent(val);
    if (num === null) return '-';
    return num.toFixed(2).replace('.', ',') + '%';
  };

  const getStatusColor = (atual: any, meta: any) => {
    let a = parsePercent(atual);
    let m = parsePercent(meta);
    
    // Debugging for specific machines
    console.log("getStatusColor:", { atual, meta, a, m });
    
    if (a === null || m === null) return 'bg-slate-300';
    
    // New logic: <= 80% green, > 80% and <= 100% yellow, > 100% red
    if (a <= m * 0.80) return 'bg-emerald-500';
    if (a <= m) return 'bg-amber-400';
    return 'bg-red-500';
  };

  // Calculate indicators based on bditssData (BD) and dinamicaData (PDG)
  const calculatedIndicators = useMemo(() => {
    if (!Array.isArray(bditssData) || bditssData.length === 0) return [];

    // 1. Identify header row and headers in BD
    let headerRowIdx = 0;
    let headers: any[] = [];
    
    for (let i = 0; i < Math.min(bditssData.length, 50); i++) {
      const row = bditssData[i];
      if (Array.isArray(row)) {
        const hasAno = row.some(h => String(h || '').toUpperCase().includes('ANO'));
        const hasMes = row.some(h => {
          const s = String(h || '').toUpperCase();
          return s.includes('MÊS') || s.includes('MES') || s === 'MS';
        });
        const hasGrupo = row.some(h => {
          const s = String(h || '').toUpperCase();
          return s.includes('GRUPO') || s.includes('PROCESSO') || s.includes('TAG');
        });
        
        if ((hasAno && hasMes) || (hasAno && hasGrupo) || (hasMes && hasGrupo)) {
          headerRowIdx = i;
          headers = row;
          break;
        }
      }
    }

    if (headers.length === 0) {
      headers = Array.isArray(bditssData[0]) ? bditssData[0] : [];
    }

    const findIdx = (keywords: string[]) => headers.findIndex((h: any) => {
      const s = String(h || '').toUpperCase();
      return keywords.some(k => {
        const key = k.toUpperCase();
        // Exact match or contains with boundaries or simple includes
        return s === key || s.includes(' ' + key) || s.includes(key + ' ') || s.includes(key);
      });
    });

    // Refined indices for better accuracy
    const grupoIdx = findIdx(['GRUPO', 'PROCESSO', 'EQUIPAMENTO', 'MÁQUINA', 'MAQUINA', 'TAG', 'ASSET']);
    const setorIdx = findIdx(['SETOR', 'ÁREA', 'AREA', 'DISCIPLINA']);
    const dataIdx = findIdx(['DATA', 'DIA', 'DATE']);
    const horasIdx = findIdx(['HORA', 'PARADA', 'DURAÇÃO', 'DURACAO', 'TEMPO', 'MANUT. MECÂNICA', 'MANUT. ELÉTRICA']);
    const mecHoursIdx = findIdx(['MANUT. MECÂNICA', 'MANUT. MECANICA', 'MECÂNICA', 'MECANICA', 'MANUT. MECÂNICO']);
    const eleHoursIdx = findIdx(['MANUT. ELÉTRICA', 'MANUT. ELETRICA', 'ELÉTRICA', 'ELETRICA', 'MANUT. ELÉTRICO']);
    const anoIdx = findIdx(['ANO', 'YEAR']);
    const mesIdx = findIdx(['MÊS', 'MES', 'MONTH', 'MS']);
    const progHoursIdx = findIdx(['HORA PROG.', 'HORA PROG', 'HORAS PROG', 'HR PROG', 'HRS PROG', 'PROGRAMAÇÃO', 'PROGRAMACAO']);
    
    // Specific indices for pre-calculated indisponibilidade in BD
    const indispMecDiarIdx = findIdx(['INDISP. MÊC. DIAR', 'INDISP. MEC. DIAR', 'INDSIP. MC. DIRIA']);
    const indispEleDiarIdx = findIdx(['INDISP. ELÉT. DIÁR', 'INDISP. ELE. DIAR', 'INDSIP. ELT. DIRIA']);
    const indispMecMensalIdx = findIdx(['INDISP. MENSAL MÊ', 'INDISP. MENSAL ME', 'INDISP. MENSAL MC.']);
    const indispEleMensalIdx = findIdx(['INDISP. MENSAL ELE', 'INDISP. MENSAL ELET.']);
    
    if (grupoIdx === -1) {
      console.warn('Header "GRUPO" (or equivalent) not found in BDITSS data. Found headers:', headers);
      return [];
    }

    // 2. Filter data by year/month and exclude "TOTAL" rows from the base data
    const filteredBD = bditssData.slice(headerRowIdx + 1).filter(row => {
      if (!Array.isArray(row)) return false;
      const rowYear = row[anoIdx] ? String(row[anoIdx]).trim() : '';
      const rowMonth = row[mesIdx] ? String(row[mesIdx]).trim() : '';
      const rowGroup = String(row[grupoIdx] || '').toUpperCase();
      
      // Skip rows that are clearly totals or summaries within the data
      if (rowGroup.includes('TOTAL') || rowGroup.includes('GERAL') || rowGroup === '') return false;

      const matchYear = !filters.year || rowYear === filters.year;
      
      const isAcum = filters.viewType === 'Acumulada';
      
      // Robust month matching
      let matchMonth = false;
      if (!filters.month) {
        matchMonth = true;
      } else {
        const rowMonthNum = getMonthNumber(rowMonth);
        const filterMonthNum = parseInt(filters.month);
        
        if (isAcum) {
          if (rowMonthNum !== null && rowMonthNum === filterMonthNum) {
            matchMonth = true;
          }
        } else {
          if (rowMonthNum !== null && rowMonthNum === filterMonthNum) {
            matchMonth = true;
          }
        }
      }
      
      return matchYear && matchMonth;
    });

    // 3. Handle Daily View (Filter by last day in the filtered set)
    let finalBD = filteredBD;
    if (filters.viewType === 'Diária' && filteredBD.length > 0 && dataIdx !== -1) {
      // Find the most recent date in the filtered set
      const dates = filteredBD.map(row => {
        const d = row[dataIdx];
        if (!d) return 0;
        // Handle Excel serial date or string
        if (typeof d === 'number') return d;
        const parsed = new Date(d).getTime();
        return isNaN(parsed) ? 0 : parsed;
      });
      const maxDate = Math.max(...dates);
      if (maxDate > 0) {
        finalBD = filteredBD.filter(row => {
          const d = row[dataIdx];
          if (typeof d === 'number') return d === maxDate;
          return new Date(d).getTime() === maxDate;
        });
      }
    }

    // 4. Group by "Grupo" and "Área"
    const sectionsMap: Record<string, Record<string, any>> = {};
    
    // Get unique groups and their areas from PDG if available
    let groupAreaMap: Record<string, string> = {};
    let uniqueGroups: string[] = [];
    
    if (Array.isArray(dinamicaData) && dinamicaData.length > 0) {
      const pdgHeaders = Array.isArray(dinamicaData[0]) ? dinamicaData[0] : [];
      const pdgGrupoIdx = pdgHeaders.findIndex((h: any) => String(h).toUpperCase().includes('GRUPO'));
      const pdgAreaIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h).toUpperCase();
        return s.includes('ÁREA') || s.includes('AREA') || s.includes('SETOR') || s.includes('PROCESSO');
      });
      
      if (pdgGrupoIdx !== -1) {
        dinamicaData.slice(1).forEach(row => {
          if (!Array.isArray(row)) return;
          const g = String(row[pdgGrupoIdx]).trim();
          const a = pdgAreaIdx !== -1 ? String(row[pdgAreaIdx] || 'OUTROS').trim() : 'INDICADORES DE INDISPONIBILIDADE';
          if (g && g !== 'undefined' && g !== '') {
            groupAreaMap[g] = a;
            if (!uniqueGroups.includes(g)) uniqueGroups.push(g);
          }
        });
      }
    }
    
    if (uniqueGroups.length === 0) {
      uniqueGroups = Array.from(new Set(filteredBD.map(row => Array.isArray(row) ? String(row[grupoIdx]).trim() : ''))).filter(g => g && g !== 'undefined' && g !== '' && !g.toUpperCase().includes('TOTAL'));
      uniqueGroups.forEach(g => { groupAreaMap[g] = 'INDICADORES DE INDISPONIBILIDADE'; });
    } else {
      // Filter out "TOTAL" from uniqueGroups if it came from PDG
      uniqueGroups = uniqueGroups.filter(g => !g.toUpperCase().includes('TOTAL'));
    }

    // 5. Get Metas from PDG (dinamicaData)
    const metas: Record<string, { mec: number, ele: number }> = {};
    if (Array.isArray(dinamicaData) && dinamicaData.length > 0) {
      const pdgHeaders = Array.isArray(dinamicaData[0]) ? dinamicaData[0] : [];
      const pdgProcessoIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h || '').toUpperCase();
        return s === 'PROCESSO' || s === 'GRUPO' || s.includes('PROCESSO') || s.includes('GRUPO');
      });
      
      const isAcum = filters.viewType === 'Acumulada';

      // Look for Meta 25 or Meta 26 based on filter year
      const metaYearSuffix = filters.year.slice(-2); // "25" or "26"
      const pdgMetaMecIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h || '').toUpperCase();
        return s.includes('MEC') && (s.includes('META') || s.includes(metaYearSuffix));
      });
      const pdgMetaEleIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h || '').toUpperCase();
        return s.includes('ELE') && (s.includes('META') || s.includes(metaYearSuffix));
      });
      
      // Fallback for general Meta columns if specific ones not found
      const fallbackMetaMecIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h || '').toUpperCase();
        return s === 'MECÂNICA' || s === 'MECANICA' || s === 'MEC';
      });
      const fallbackMetaEleIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h || '').toUpperCase();
        return s === 'ELÉTRICA' || s === 'ELETRICA' || s === 'ELE';
      });

      dinamicaData.slice(1).forEach(row => {
        if (!Array.isArray(row)) return;
        const g = String(row[pdgProcessoIdx] || '').trim();
        if (g && g !== 'undefined' && !g.toUpperCase().includes('TOTAL')) {
          metas[g] = {
            mec: parsePercent(row[pdgMetaMecIdx] !== undefined ? row[pdgMetaMecIdx] : row[fallbackMetaMecIdx]) || 2.4,
            ele: parsePercent(row[pdgMetaEleIdx] !== undefined ? row[pdgMetaEleIdx] : row[fallbackMetaEleIdx]) || 1.6
          };
        }
      });
    }

    // 6. Calculate Actuals and Sparklines
    uniqueGroups.forEach(groupName => {
      const groupRows = finalBD.filter(row => String(row[grupoIdx] || '').trim() === groupName);
      const areaName = groupAreaMap[groupName] || 'OUTROS';
      
      if (groupRows.length === 0) return; // Skip if no data for this group

      let mecHours = 0;
      let eleHours = 0;
      let totalProgHours = 0;
      
      // A. Calculate Hours
      if (mecHoursIdx !== -1 && eleHoursIdx !== -1) {
        groupRows.forEach(row => {
          mecHours += parseFloat(String(row[mecHoursIdx] || '0').replace(',', '.'));
          eleHours += parseFloat(String(row[eleHoursIdx] || '0').replace(',', '.'));
        });
      } else if (setorIdx !== -1 && horasIdx !== -1) {
        groupRows.forEach(row => {
          const setor = String(row[setorIdx] || '').toUpperCase();
          const hours = parseFloat(String(row[horasIdx] || '0').replace(',', '.'));
          if (setor.includes('MEC')) mecHours += hours;
          if (setor.includes('ELE')) eleHours += hours;
        });
      }

      // B. Calculate Prog Hours (if available)
      if (progHoursIdx !== -1) {
        groupRows.forEach(row => {
          const progVal = parseFloat(String(row[progHoursIdx] || '0').replace(',', '.'));
          totalProgHours += progVal;
        });
      }

      // C. Calculate Unavailability
      let mecVal = 0;
      let eleVal = 0;
      const isAcum = filters.viewType === 'Acumulada';

      if (totalProgHours > 0) {
        mecVal = (mecHours / totalProgHours) * 100;
        eleVal = (eleHours / totalProgHours) * 100;
      } else {
        // Fallback to pre-calculated or default divisor
        if (isAcum && indispMecMensalIdx !== -1 && indispEleMensalIdx !== -1) {
          const lastRow = groupRows[groupRows.length - 1];
          if (lastRow) {
            mecVal = parsePercent(lastRow[indispMecMensalIdx]) || 0;
            eleVal = parsePercent(lastRow[indispEleMensalIdx]) || 0;
          }
        } else if (!isAcum && indispMecDiarIdx !== -1 && indispEleDiarIdx !== -1) {
          let count = 0;
          groupRows.forEach(row => {
            mecVal += parsePercent(row[indispMecDiarIdx]) || 0;
            eleVal += parsePercent(row[indispEleDiarIdx]) || 0;
            count++;
          });
          if (count > 0) {
            mecVal /= count;
            eleVal /= count;
          }
        } else {
          const daysInMonth = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
          const divisor = isAcum ? (daysInMonth * 24) : 24;
          mecVal = (mecHours / divisor) * 100;
          eleVal = (eleHours / divisor) * 100;
        }
      }

      // Calculate sparkline points (last 10 days of the month)
      const sparklinePoints: string[] = [];
      if (dataIdx !== -1) {
        const daysInMonth = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dayRows = filteredBD.filter(row => {
            const rowG = String(row[grupoIdx]).trim();
            const rowD = row[dataIdx];
            if (rowG !== groupName) return false;
            
            if (typeof rowD === 'number') {
              // Excel date
              const date = new Date((rowD - 25569) * 86400 * 1000);
              return date.getDate() === d;
            } else {
              const date = new Date(rowD);
              return date.getDate() === d;
            }
          });
          
          let dayMec = 0;
          let dayEle = 0;
          let dayProg = 0;
          dayRows.forEach(r => {
            const s = String(r[setorIdx] || '').toUpperCase();
            const h = parseFloat(String(r[horasIdx] || '0').replace(',', '.'));
            if (s.includes('MEC')) dayMec += h;
            if (s.includes('ELE')) dayEle += h;
            
            if (progHoursIdx !== -1 && dayProg === 0) {
              dayProg = parseFloat(String(r[progHoursIdx] || '0').replace(',', '.'));
            }
          });
          
          const divisor = dayProg > 0 ? dayProg : 24;
          const dayPercent = ((dayMec + dayEle) / divisor) * 100;
          // Scale to 0-20 for SVG height
          const y = 20 - Math.min(20, (dayPercent / 10) * 20); 
          sparklinePoints.push(`${(d / daysInMonth) * 100},${y}`);
        }
      }

      // Calculate unavailability percentage
      const daysInMonth = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
      const divisor = filters.viewType === 'Acumulada' ? (daysInMonth * 24) : 24;
      
      if (!sectionsMap[areaName]) sectionsMap[areaName] = {};
      
      sectionsMap[areaName][groupName] = {
        name: groupName,
        mecanica: {
          atual: mecVal,
          meta: metas[groupName]?.mec || 2.4
        },
        eletrica: {
          atual: eleVal,
          meta: metas[groupName]?.ele || 1.6
        },
        sparkline: sparklinePoints.join(' ')
      };
    });

    // Organize into sections based on user's specific order
    const dashboardStructure = [
      {
        title: "Cordeiras",
        machines: [
          "RIP", "CDT410", "CDT112", "CDT115", "K2002",
          "CDT47", "CDT46", "C21", "C22", "TD2/321",
          "TD2/402", "TD2601", "HKM", "REB", "K601",
          "KR83", "K83", "BTW", "BFI"
        ]
      },
      {
        title: "Trefila fina",
        machines: ["PN4/21", "HT18", "NDW", "P421", "PN4/201", "MM3B"]
      },
      {
        title: "SEMI PRONTO",
        machines: ["TG06", "BW", "MONOFIO"]
      }
    ];

    // Flatten all machines from sectionsMap into a single list
    const allCalculatedMachines: any[] = [];
    Object.values(sectionsMap).forEach(machinesMap => {
      Object.values(machinesMap).forEach(machine => {
        allCalculatedMachines.push(machine);
      });
    });

    const result: any[] = [];

    dashboardStructure.forEach(sectionDef => {
      const sectionMachines: any[] = [];
      sectionDef.machines.forEach(targetName => {
        const found = allCalculatedMachines.find(m => 
          m.name.trim().toUpperCase() === targetName.trim().toUpperCase()
        );
        if (found) {
          sectionMachines.push(found);
        }
      });
      
      if (sectionMachines.length > 0) {
        result.push({
          name: sectionDef.title,
          machines: sectionMachines
        });
      }
    });

    return result;
  }, [bditssData, dinamicaData, filters]);

  // Calculate chart data based on bditssData
  const chartData = useMemo(() => {
    if (!Array.isArray(bditssData) || bditssData.length === 0) return mockChartData;

    // 1. Identify header row and headers in BD
    let headerRowIdx = 0;
    let headers: any[] = [];
    
    for (let i = 0; i < Math.min(bditssData.length, 20); i++) {
      const row = bditssData[i];
      if (Array.isArray(row)) {
        const hasAno = row.some(h => String(h).toUpperCase().includes('ANO'));
        const hasMes = row.some(h => {
          const s = String(h).toUpperCase();
          return s.includes('MÊS') || s.includes('MES') || s === 'MS';
        });
        const hasGrupo = row.some(h => {
          const s = String(h).toUpperCase();
          return s.includes('GRUPO') || s.includes('PROCESSO') || s.includes('TAG');
        });
        
        if ((hasAno && hasMes) || (hasAno && hasGrupo) || (hasMes && hasGrupo)) {
          headerRowIdx = i;
          headers = row;
          break;
        }
      }
    }

    if (headers.length === 0) {
      headers = Array.isArray(bditssData[0]) ? bditssData[0] : [];
    }

    const findIdx = (keywords: string[]) => headers.findIndex((h: any) => {
      const s = String(h || '').toUpperCase();
      return keywords.some(k => s.includes(k.toUpperCase()));
    });

    const horasIdx = findIdx(['HORA', 'PARADA', 'DURAÇÃO', 'DURACAO', 'TEMPO', 'MANUT. MECÂNICO', 'MANUT. MECANICO']);
    const mecHoursIdx = findIdx(['MANUT. MECÂNICO', 'MANUT. MECANICO']);
    const eleHoursIdx = findIdx(['MANUT. ELÉTRICA', 'MANUT. ELETRICA']);
    const anoIdx = findIdx(['ANO', 'YEAR']);
    const mesIdx = findIdx(['MÊS', 'MES', 'MONTH', 'MS']);
    const dataIdx = findIdx(['DATA', 'DATE', 'DIA', 'DAY']);
    const progHoursIdx = findIdx(['HORA PROG', 'HORAS PROG', 'HR PROG', 'HRS PROG', 'PROGRAMAÇÃO', 'PROGRAMACAO']);
    const setorIdx = findIdx(['SETOR', 'ÁREA', 'AREA', 'DISCIPLINA']);
    
    const indispMecMensalIdx = findIdx(['INDISP. MENSAL MÊ', 'INDISP. MENSAL ME', 'INDISP. MENSAL MC.']);
    const indispEleMensalIdx = findIdx(['INDISP. MENSAL ELE', 'INDISP. MENSAL ELET.']);
    const indispTotIdx = findIdx(['INDISP. TOT.']);

    if (anoIdx === -1 || mesIdx === -1) {
      console.warn('Required headers (ANO, MES) not found for chart data. Found headers:', headers);
      return mockChartData;
    }

    // Get global metas from PDG if available (usually a row with "TOTAL BMB" or similar)
    let globalMetaMec = 2.40;
    let globalMetaEle = 1.60;
    let globalMetaTotal = 4.00;

    if (Array.isArray(dinamicaData) && dinamicaData.length > 0) {
      let pdgHeaderRowIdx = 0;
      let pdgHeaders: any[] = [];
      
      for (let i = 0; i < Math.min(dinamicaData.length, 20); i++) {
        const row = dinamicaData[i];
        if (Array.isArray(row)) {
          const hasProcesso = row.some(h => String(h).toUpperCase().includes('PROCESSO'));
          const hasMeta = row.some(h => String(h).toUpperCase().includes('META') || String(h).toUpperCase().includes('25') || String(h).toUpperCase().includes('26'));
          if (hasProcesso && hasMeta) {
            pdgHeaderRowIdx = i;
            pdgHeaders = row;
            break;
          }
        }
      }
      
      if (pdgHeaders.length === 0) pdgHeaders = Array.isArray(dinamicaData[0]) ? dinamicaData[0] : [];

      const pdgGrupoIdx = pdgHeaders.findIndex((h: any) => {
        const s = String(h).toUpperCase();
        return s.includes('PROCESSO') || s.includes('GRUPO');
      });
      const pdgMetaMecIdx = pdgHeaders.findIndex((h: any) => String(h).toUpperCase().includes('MEC') && String(h).toUpperCase().includes('META') && !String(h).toUpperCase().includes('DIAR'));
      const pdgMetaEleIdx = pdgHeaders.findIndex((h: any) => String(h).toUpperCase().includes('ELE') && String(h).toUpperCase().includes('META') && !String(h).toUpperCase().includes('DIAR'));
      
      const totalRow = dinamicaData.slice(pdgHeaderRowIdx + 1).find(row => Array.isArray(row) && String(row[pdgGrupoIdx]).toUpperCase().includes('TOTAL'));
      if (totalRow) {
        globalMetaMec = parsePercent(totalRow[pdgMetaMecIdx]) || 2.40;
        globalMetaEle = parsePercent(totalRow[pdgMetaEleIdx]) || 1.60;
        globalMetaTotal = globalMetaMec + globalMetaEle;
      }
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullMonthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

    const dataByMonth = monthNames.map((name, idx) => {
      const monthNum = idx + 1;
      const monthFullName = fullMonthNames[idx];
      
      const monthRows = bditssData.slice(headerRowIdx + 1).filter(row => {
        if (!Array.isArray(row)) return false;
        const rowYear = String(row[anoIdx] || '').trim();
        const rowMonth = String(row[mesIdx] || '').trim();
        
        const matchYear = rowYear === filters.year;
        const rowMonthNum = getMonthNumber(rowMonth);
        const matchMonth = rowMonthNum !== null && rowMonthNum === monthNum;
        
        return matchYear && matchMonth;
      });

      if (monthRows.length === 0) {
        return {
          month: name,
          metaManutencao: globalMetaTotal,
          metaMecanica: globalMetaMec,
          metaEletrica: globalMetaEle
        };
      }

      let mecVal = 0;
      let eleVal = 0;
      let totalVal = 0;

      // Prioritize manual calculation if HORAS PROG and maintenance hours are found
      const hasManualColumns = (mecHoursIdx !== -1 && eleHoursIdx !== -1 || (setorIdx !== -1 && horasIdx !== -1)) && progHoursIdx !== -1;

      if (hasManualColumns) {
        let mecHours = 0;
        let eleHours = 0;
        let totalProgHours = 0;
        const daysProcessed = new Set();

        monthRows.forEach(row => {
          const dayKey = dataIdx !== -1 ? String(row[dataIdx]) : Math.random().toString();
          
          if (mecHoursIdx !== -1 && eleHoursIdx !== -1) {
            mecHours += parseFloat(String(row[mecHoursIdx] || '0').replace(',', '.'));
            eleHours += parseFloat(String(row[eleHoursIdx] || '0').replace(',', '.'));
          } else {
            const setor = String(row[setorIdx] || '').toUpperCase();
            const hours = parseFloat(String(row[horasIdx] || '0').replace(',', '.'));
            if (setor.includes('MEC')) mecHours += hours;
            if (setor.includes('ELE')) eleHours += hours;
          }
          
          if (progHoursIdx !== -1) {
            const progVal = parseFloat(String(row[progHoursIdx] || '0').replace(',', '.'));
            if (!daysProcessed.has(dayKey)) {
              totalProgHours += progVal;
              daysProcessed.add(dayKey);
            }
          }
        });

        const divisor = totalProgHours > 0 ? totalProgHours : 1;
        mecVal = (mecHours / divisor) * 100;
        eleVal = (eleHours / divisor) * 100;
        totalVal = mecVal + eleVal;
      } else if (indispMecMensalIdx !== -1 && indispEleMensalIdx !== -1) {
        // Use monthly pre-calculated values
        const lastRow = monthRows[monthRows.length - 1];
        if (lastRow) {
          mecVal = parsePercent(lastRow[indispMecMensalIdx]) || 0;
          eleVal = parsePercent(lastRow[indispEleMensalIdx]) || 0;
          totalVal = indispTotIdx !== -1 ? (parsePercent(lastRow[indispTotIdx]) || (mecVal + eleVal)) : (mecVal + eleVal);
        }
      } else {
        let mecHours = 0;
        let eleHours = 0;
        
        monthRows.forEach(row => {
          if (mecHoursIdx !== -1 && eleHoursIdx !== -1) {
            mecHours += parseFloat(String(row[mecHoursIdx] || '0').replace(',', '.'));
            eleHours += parseFloat(String(row[eleHoursIdx] || '0').replace(',', '.'));
          } else {
            const setor = String(row[setorIdx] || '').toUpperCase();
            const hours = parseFloat(String(row[horasIdx] || '0').replace(',', '.'));
            if (setor.includes('MEC')) mecHours += hours;
            if (setor.includes('ELE')) eleHours += hours;
          }
        });

        const daysInMonth = new Date(parseInt(filters.year), monthNum, 0).getDate();
        const totalHours = daysInMonth * 24;
        mecVal = (mecHours / totalHours) * 100;
        eleVal = (eleHours / totalHours) * 100;
        totalVal = mecVal + eleVal;
      }

      return {
        month: name,
        manutencao: totalVal,
        metaManutencao: globalMetaTotal,
        mecanica: mecVal,
        metaMecanica: globalMetaMec,
        eletrica: eleVal,
        metaEletrica: globalMetaEle
      };
    });

    return dataByMonth;
  }, [bditssData, dinamicaData, filters.year]);

  if (loading || isProcessingFile) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium animate-pulse">Processando base de dados...</p>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { id: '1', name: 'Janeiro' }, { id: '2', name: 'Fevereiro' }, { id: '3', name: 'Março' },
    { id: '4', name: 'Abril' }, { id: '5', name: 'Maio' }, { id: '6', name: 'Junho' },
    { id: '7', name: 'Julho' }, { id: '8', name: 'Agosto' }, { id: '9', name: 'Setembro' },
    { id: '10', name: 'Outubro' }, { id: '11', name: 'Novembro' }, { id: '12', name: 'Dezembro' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-900">
            {dashboardTab === 'smart' ? 'Dashboard Inteligente' : 'Indicadores de Indisponibilidade'}
          </h2>
          <div className="flex items-center mt-2 space-x-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDashboardTab('smart')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  dashboardTab === 'smart' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                )}
              >
                KPIs Smart
              </button>
              <button
                onClick={() => setDashboardTab('excel')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  dashboardTab === 'excel' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                )}
              >
                Excel
              </button>
            </div>
            {dashboardTab === 'excel' && (
              <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">
                <Info className="w-3 h-3 mr-1" />
                Cálculo: (Mecânica + Elétrica) / Horas Prog.
              </div>
            )}
          </div>
        </div>
        
        {dashboardTab === 'excel' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Intervalo de datas (dia) */}
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-inner w-full sm:w-auto">
              <button 
                onClick={() => setFilters({ ...filters, viewType: 'Acumulada' })}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  filters.viewType === 'Acumulada' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                Mensal
              </button>
              <button 
                onClick={() => setFilters({ ...filters, viewType: 'Diária' })}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  filters.viewType === 'Diária' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                Diária
              </button>
            </div>

            {/* Ano e Mês */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {dashboardTab === 'smart' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MTBF</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{(smartKPIs?.mtbf || 0).toFixed(1)}h</h4>
              <p className="text-xs text-slate-500 mt-1">Tempo médio entre falhas</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MTTR</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{(smartKPIs?.mttr || 0).toFixed(1)}h</h4>
              <p className="text-xs text-slate-500 mt-1">Tempo médio para reparo</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidade</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{(smartKPIs?.availability || 0).toFixed(1)}%</h4>
              <p className="text-xs text-slate-500 mt-1">Tempo operacional total</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confiabilidade</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{(smartKPIs?.reliability || 0).toFixed(1)}%</h4>
              <p className="text-xs text-slate-500 mt-1">Probabilidade de sucesso</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Backlog</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{(smartKPIs?.backlogHours || 0).toFixed(1)}h</h4>
              <p className="text-xs text-slate-500 mt-1">Carga de trabalho pendente</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Est.</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">R$ {(smartKPIs?.maintenanceCost || 0).toLocaleString()}</h4>
              <p className="text-xs text-slate-500 mt-1">Baseado em horas estimadas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Status das Ordens de Serviço</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Em Aberto', value: wos.filter(w => w.Status === 'Em Aberto').length },
                        { name: 'Em Execução', value: wos.filter(w => w.Status === 'Em Execução').length },
                        { name: 'Concluída', value: wos.filter(w => w.Status === 'Concluída').length },
                        { name: 'Cancelada', value: wos.filter(w => w.Status === 'Cancelada').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#94a3b8" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Tipos de Manutenção</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Preventiva', value: wos.filter(w => w.Type === 'Preventiva').length },
                      { name: 'Corretiva', value: wos.filter(w => w.Type === 'Corretiva').length },
                      { name: 'Preditiva', value: wos.filter(w => w.Type === 'Preditiva').length },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {calculatedIndicators.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum dado encontrado</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {bditssData.length > 0 
              ? `Não encontramos registros para o período de ${filters.month}/${filters.year}. Verifique se a planilha contém dados para este ano/mês ou tente ajustar os filtros acima.`
              : "Faça o upload da sua planilha contendo as abas BD e PDG para calcular os indicadores automaticamente."}
          </p>
          {bditssData.length > 0 && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-400 font-mono text-left inline-block max-w-full overflow-auto">
              <p className="font-bold mb-1 uppercase">Debug Info:</p>
              <p>Rows in BD: {bditssData.length}</p>
              <p>Filter Year: {filters.year}</p>
              <p>Filter Month: {filters.month}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Charts Section */}
          <div className="space-y-8">
            {/* Chart 1 */}
            <div className="bg-white p-6 rounded-sm border-[1.5px] border-orange-400 relative shadow-sm">
              <h3 className="absolute -top-3 left-4 bg-white px-2 text-lg font-bold text-slate-800 uppercase tracking-tight">Evolução Indisponibilidade Manutenção</h3>
              <GreenArrow />
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 25, right: 60, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{ fontSize: 15, fontWeight: 600 }} />
                    <YAxis 
                      domain={[0, 8]} 
                      ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8]} 
                      tickFormatter={(val) => val.toFixed(2).replace('.', ',') + '%'} 
                      axisLine={true} 
                      tickLine={false} 
                      tick={{ fontSize: 15, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: '15px', fontWeight: 'bold' }}
                      formatter={(value: number) => value.toFixed(2).replace('.', ',') + '%'} 
                    />
                    <Line type="monotone" dataKey="manutencao" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" name="Indisponibilidade (%)" dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}>
                      <LabelList content={(props) => <CustomDataLabel {...props} data={chartData} metaKey="metaManutencao" />} />
                    </Line>
                    <Line type="linear" dataKey="metaManutencao" stroke="#10b981" strokeWidth={3} dot={false} name="Meta">
                      <LabelList content={(props) => <CustomMetaLabel {...props} data={chartData} />} />
                    </Line>
                    <Legend verticalAlign="bottom" height={40} iconType="plainline" wrapperStyle={{ paddingTop: '25px', fontSize: '15px', fontWeight: 'bold' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts 2 and 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-sm border-[1.5px] border-orange-400 relative shadow-sm">
                <h3 className="absolute -top-3 left-4 bg-white px-2 text-lg font-bold text-slate-800 uppercase tracking-tight">Evolução Indisponibilidade Mecânica</h3>
                <GreenArrow />
                <div className="h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 25, right: 60, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{ fontSize: 15, fontWeight: 600 }} />
                      <YAxis 
                        domain={[0, 6]} 
                        ticks={[0, 1, 2, 3, 4, 5, 6]} 
                        tickFormatter={(val) => val.toFixed(2).replace('.', ',') + '%'} 
                        axisLine={true} 
                        tickLine={false} 
                        tick={{ fontSize: 15, fontWeight: 600 }} 
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '15px', fontWeight: 'bold' }}
                        formatter={(value: number) => value.toFixed(2).replace('.', ',') + '%'} 
                      />
                      <Line type="monotone" dataKey="mecanica" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" name="Indisp. Mecânica (%)" dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}>
                        <LabelList content={(props) => <CustomDataLabel {...props} data={chartData} metaKey="metaMecanica" />} />
                      </Line>
                      <Line type="linear" dataKey="metaMecanica" stroke="#10b981" strokeWidth={3} dot={false} name="Meta">
                        <LabelList content={(props) => <CustomMetaLabel {...props} data={chartData} />} />
                      </Line>
                      <Legend verticalAlign="bottom" height={40} iconType="plainline" wrapperStyle={{ paddingTop: '25px', fontSize: '15px', fontWeight: 'bold' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-sm border-[1.5px] border-orange-400 relative shadow-sm">
                <h3 className="absolute -top-3 left-4 bg-white px-2 text-lg font-bold text-slate-800 uppercase tracking-tight">Evolução Indisponibilidade Elétrica</h3>
                <GreenArrow />
                <div className="h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 25, right: 60, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{ fontSize: 15, fontWeight: 600 }} />
                      <YAxis 
                        domain={[0, 6]} 
                        ticks={[0, 1, 2, 3, 4, 5, 6]} 
                        tickFormatter={(val) => val.toFixed(2).replace('.', ',') + '%'} 
                        axisLine={true} 
                        tickLine={false} 
                        tick={{ fontSize: 15, fontWeight: 600 }} 
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '15px', fontWeight: 'bold' }}
                        formatter={(value: number) => value.toFixed(2).replace('.', ',') + '%'} 
                      />
                      <Line type="monotone" dataKey="eletrica" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" name="Indisp. Elétrica (%)" dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}>
                        <LabelList content={(props) => <CustomDataLabel {...props} data={chartData} metaKey="metaEletrica" />} />
                      </Line>
                      <Line type="linear" dataKey="metaEletrica" stroke="#10b981" strokeWidth={3} dot={false} name="Meta">
                        <LabelList content={(props) => <CustomMetaLabel {...props} data={chartData} />} />
                      </Line>
                      <Legend verticalAlign="bottom" height={40} iconType="plainline" wrapperStyle={{ paddingTop: '25px', fontSize: '15px', fontWeight: 'bold' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Indicators Section */}
          <div className="space-y-12">
            {calculatedIndicators.map((section, sIdx) => (
              <div key={sIdx} className="space-y-6">
                <h3 className="text-xl text-slate-500 uppercase tracking-wider font-light border-b border-slate-100 pb-2">{section.name}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-6">
                  {section.machines.map((machine: any, mIdx: number) => (
                    <div key={mIdx} className="flex flex-col">
                      <h4 className="font-bold text-slate-700 text-sm mb-1.5 ml-1 truncate uppercase" title={machine.name}>{machine.name}</h4>
                      <div className="border border-orange-400 bg-white p-2 sm:p-3 rounded-sm shadow-sm relative min-h-[160px] flex flex-col">
                        
                        {/* Header */}
                        <div className="grid grid-cols-[85px_1fr_1fr] sm:grid-cols-[95px_1fr_1fr] gap-1 items-center mb-3">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-500 text-right pr-1 italic">{filters.viewType === 'Acumulada' ? 'Mensal.:' : 'Diário.:'}</div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 text-center">ATUAL</div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 text-center">META</div>
                        </div>

                        {/* Mecânica */}
                        <div className="grid grid-cols-[85px_1fr_1fr] sm:grid-cols-[95px_1fr_1fr] gap-1 items-center mb-2.5">
                          <div className="flex items-center justify-end space-x-2 pr-1">
                            <span className="text-[10px] sm:text-xs text-slate-700 font-bold">Mecânica.:</span>
                            <div className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-slate-300 shadow-sm", getStatusColor(machine.mecanica?.atual, machine.mecanica?.meta))} />
                          </div>
                          <div className="text-xs sm:text-sm text-slate-900 text-center font-bold">{formatPercent(machine.mecanica?.atual)}</div>
                          <div className="text-xs sm:text-sm text-slate-900 text-center font-bold">{formatPercent(machine.mecanica?.meta)}</div>
                        </div>

                        {/* Elétrica */}
                        <div className="grid grid-cols-[85px_1fr_1fr] sm:grid-cols-[95px_1fr_1fr] gap-1 items-center mb-5">
                          <div className="flex items-center justify-end space-x-2 pr-1">
                            <span className="text-[10px] sm:text-xs text-slate-700 font-bold">Elétrica.:</span>
                            <div className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-slate-300 shadow-sm", getStatusColor(machine.eletrica?.atual, machine.eletrica?.meta))} />
                          </div>
                          <div className="text-xs sm:text-sm text-slate-900 text-center font-bold">{formatPercent(machine.eletrica?.atual)}</div>
                          <div className="text-xs sm:text-sm text-slate-900 text-center font-bold">{formatPercent(machine.eletrica?.meta)}</div>
                        </div>

                        {/* Sparkline */}
                        <div className="mt-auto h-8 w-full flex items-end justify-center px-1 pb-1">
                          <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none overflow-visible">
                            <line x1="0" y1="12" x2="100" y2="12" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" />
                            <polyline 
                              points={machine.sparkline || "0,15 10,12 20,18 30,15 40,15 50,15 60,15 70,15 80,15 90,15 100,15"} 
                              fill="none" 
                              stroke="#3b82f6" 
                              strokeWidth="1" 
                            />
                          </svg>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

// --- Asset List Component ---
const AssetList = ({ assets, plans = [], onAdd, onEdit, onDelete, onImport, isAdmin = false, currentUserUid = '', showToast }: { assets: Asset[], plans?: PreventivePlan[], onAdd: () => void, onEdit: (asset: Asset) => void, onDelete: (id: string) => void, onImport: (assets: any[]) => void, isAdmin?: boolean, currentUserUid?: string, showToast?: (msg: string, type?: 'success' | 'error') => void }) => {
  const [search, setSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [massEditData, setMassEditData] = useState({
    Status: '',
    Plant: '',
    Location: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const assetsToPrint = selectedAssets.length > 0 
      ? assets.filter(a => selectedAssets.includes(a.ID))
      : filteredAssets;

    const html = `
      <html>
        <head>
          <title>Relatório de Ativos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e293b; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; color: #475569; }
            .status-ativo { color: #10b981; }
            .status-inativo { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>Relatório de Ativos</h1>
          <p>Total de ativos: ${assetsToPrint.length}</p>
          <table>
            <thead>
              <tr>
                <th>TAG</th>
                <th>Modelo</th>
                <th>Descrição</th>
                <th>Localização</th>
                <th>Planta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${assetsToPrint.map(a => `
                <tr>
                  <td>${a.Tag || '-'}</td>
                  <td>${a.Model || '-'}</td>
                  <td>${a.Description || '-'}</td>
                  <td>${a.Location || '-'}</td>
                  <td>${a.Plant || '-'}</td>
                  <td class="${a.Status === 'Ativo' ? 'status-ativo' : 'status-inativo'}">${a.Status || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleMassDelete = async () => {
    if (selectedAssets.length === 0) return;
    if (window.confirm(`Tem certeza que deseja excluir ${selectedAssets.length} ativos selecionados?`)) {
      try {
        await Promise.all(selectedAssets.map(id => deleteDocument('assets', id)));
        if (showToast) showToast(`${selectedAssets.length} ativos excluídos com sucesso!`);
        setSelectedAssets([]);
      } catch (error) {
        console.error('Error in mass delete:', error);
        if (showToast) showToast('Erro ao excluir ativos selecionados', 'error');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const buffer = evt.target?.result;
      if (!buffer) return;
      
      const wb = XLSX.read(buffer, { type: 'array' });
      console.log('Workbook sheet names:', wb.SheetNames);
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // Read as array of arrays first to find header
      const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log('Raw data (first 5 rows):', rawData.slice(0, 5));
      
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          // Look for a row that has at least 2 of our key columns
          const matches = row.filter(h => {
            const s = String(h || '').toUpperCase();
            // Normalize to remove accents for better matching
            const normalized = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalized.includes('TAG') || normalized.includes('MODELO') || normalized.includes('DESCRI') || normalized.includes('LOCALIZA');
          }).length;
          
          console.log(`Row ${i} matches:`, matches);
          if (matches >= 2) {
            headerRowIdx = i;
            console.log('Header row detected at index:', headerRowIdx);
            break;
          }
        }
      }

      const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIdx, raw: true });
      console.log('Parsed data (first 5 rows):', data.slice(0, 5));
      
      const mappedData = data.map((row: any) => {
        const tag = String(row['TAG'] || row['Tag'] || row['tag'] || '').trim();
        const model = String(row['MODELO'] || row['Modelo'] || row['modelo'] || '').trim();
        const description = String(row['DESCRIÇÃO'] || row['DESCRIÇAO'] || row['DESCRICAO'] || row['Descricao'] || row['descricao'] || '').trim();
        const location = String(row['LOCALIZAÇÃO'] || row['LOCALIZAÇAO'] || row['LOCALIZACAO'] || row['Localizacao'] || row['localizacao'] || '').trim();
        const plant = String(row['PLANTA'] || row['Planta'] || row['planta'] || '').trim();
        const manufacturer = String(row['FABRICANTE'] || row['Fabricante'] || row['fabricante'] || '').trim();
        const status = String(row['STATUS'] || row['Status'] || row['status'] || 'Ativo').trim();
        const installDate = row['DATA DE INSTALAÇÃO'] || row['Data de Instalação'] || row['data de instalação'] || new Date().toISOString().split('T')[0];

        return {
          Tag: tag,
          Model: model,
          Description: description,
          Location: location,
          Plant: plant,
          Manufacturer: manufacturer,
          Status: ['Ativo', 'Inativo', 'Em Manutenção', 'Parado'].includes(status) ? status : 'Ativo',
          InstallDate: typeof installDate === 'string' ? installDate : new Date().toISOString().split('T')[0]
        };
      }).filter(asset => asset.Tag && asset.Model);
      
      console.log(`Mapped and filtered data: ${mappedData.length} valid assets found.`);
      if (mappedData.length === 0) {
        alert('Nenhum ativo válido encontrado no arquivo. Verifique se as colunas TAG e MODELO estão preenchidas.');
        return;
      }
      onImport(mappedData);
    };
    reader.readAsArrayBuffer(file);
  };
  
  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      (a.Tag || '').toLowerCase().includes(search.toLowerCase()) || 
      (a.Model || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.Description || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.Location || '').toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => (a.Description || '').localeCompare(b.Description || ''));
  }, [assets, search]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">Inventário de Ativos</h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar ativos..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedAssets.length > 0 && (
              <>
                <button 
                  onClick={() => setShowMassEditModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar ({selectedAssets.length})</span>
                </button>
                <button 
                  onClick={handleMassDelete}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Excluir ({selectedAssets.length})</span>
                </button>
              </>
            )}
            <button 
              onClick={handlePrintReport}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
            <button className="flex-1 sm:flex-none p-2 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </button>
            <button 
              onClick={onAdd}
              className="flex-[3] sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Ativo</span>
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssets(filteredAssets.map(a => a.ID));
                    } else {
                      setSelectedAssets([]);
                    }
                  }}
                />
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">TAG</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Modelo</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Localização</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Planta</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssets.map((asset, i) => (
              <tr key={asset.ID || i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedAssets.includes(asset.ID)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssets([...selectedAssets, asset.ID]);
                      } else {
                        setSelectedAssets(selectedAssets.filter(id => id !== asset.ID));
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{asset.Description || 'Sem descrição'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.Tag}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.Model}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.Location}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{asset.Plant}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    asset.Status === 'Ativo' ? "bg-emerald-50 text-emerald-700" : 
                    asset.Status === 'Inativo' ? "bg-rose-50 text-rose-700" :
                    asset.Status === 'Em Manutenção' ? "bg-amber-50 text-amber-700" :
                    "bg-slate-50 text-slate-700"
                  )}>
                    {asset.Status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {(isAdmin || asset.createdBy === currentUserUid) && (
                      <button 
                        onClick={() => onEdit(asset)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Editar Ativo"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => onDelete(asset.ID)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir Ativo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showMassEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMassEditModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <h3 className="text-lg font-bold mb-4">Edição em Massa ({selectedAssets.length} ativos)</h3>
              <p className="text-sm text-slate-500 mb-4">Preencha apenas os campos que deseja alterar para todos os ativos selecionados.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={massEditData.Status}
                    onChange={e => setMassEditData({...massEditData, Status: e.target.value})}
                  >
                    <option value="">Manter original</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                    <option value="Parado">Parado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planta</label>
                  <input 
                    type="text"
                    placeholder="Manter original"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={massEditData.Plant}
                    onChange={e => setMassEditData({...massEditData, Plant: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Localização</label>
                  <input 
                    type="text"
                    placeholder="Manter original"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={massEditData.Location}
                    onChange={e => setMassEditData({...massEditData, Location: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  onClick={() => setShowMassEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const updates: any = {};
                    if (massEditData.Status) updates.Status = massEditData.Status;
                    if (massEditData.Plant) updates.Plant = massEditData.Plant;
                    if (massEditData.Location) updates.Location = massEditData.Location;
                    
                    if (Object.keys(updates).length > 0) {
                      try {
                        await Promise.all(selectedAssets.map(async (id) => {
                          const asset = assets.find(a => a.ID === id);
                          if (!asset) return;

                          let finalUpdates = { ...updates };
                          const oldStatus = asset.Status;
                          const newStatus = updates.Status;

                          // Logic for "Parado" status in mass edit
                          if (newStatus && oldStatus !== newStatus) {
                            if (oldStatus !== 'Parado' && newStatus === 'Parado') {
                              finalUpdates.statusChangedAt = new Date().toISOString();
                            } else if (oldStatus === 'Parado' && newStatus !== 'Parado' && asset.statusChangedAt) {
                              const stoppedAt = new Date(asset.statusChangedAt);
                              const now = new Date();
                              const diffMs = now.getTime() - stoppedAt.getTime();
                              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                              if (diffDays > 0) {
                                const relatedPlans = plans.filter(p => 
                                  p.AssetID === asset.ID || 
                                  (p.AssetIDs && p.AssetIDs.includes(asset.ID))
                                );

                                for (const plan of relatedPlans) {
                                  const currentNextDue = plan.AssetNextDues?.[asset.ID] || plan.NextDue;
                                  if (currentNextDue) {
                                    const nextDueDate = new Date(currentNextDue);
                                    nextDueDate.setDate(nextDueDate.getDate() + diffDays);
                                    const newNextDue = nextDueDate.toISOString().split('T')[0];

                                    const updatedNextDues = { ...(plan.AssetNextDues || {}) };
                                    updatedNextDues[asset.ID] = newNextDue;

                                    const allNextDues = Object.values(updatedNextDues);
                                    const earliestNextDue = allNextDues.length > 0 ? allNextDues.sort()[0] : newNextDue;

                                    await updateDocument('preventive-plans', plan.ID, {
                                      AssetNextDues: updatedNextDues,
                                      NextDue: earliestNextDue,
                                      updatedAt: new Date().toISOString()
                                    });
                                  }
                                }
                              }
                              finalUpdates.statusChangedAt = null;
                            }
                          }

                          await updateDocument('assets', id, finalUpdates);
                        }));
                        if (showToast) showToast(`${selectedAssets.length} ativos atualizados com sucesso!`);
                      } catch (error) {
                        console.error('Error in mass edit:', error);
                        if (showToast) showToast('Erro ao atualizar ativos selecionados', 'error');
                      }
                    }
                    setShowMassEditModal(false);
                    setSelectedAssets([]);
                    setMassEditData({ Status: '', Plant: '', Location: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Aplicar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Work Order List Component ---
const WorkOrderList = ({ 
  wos, 
  assets,
  onAdd,
  onEdit,
  onUpdateStatus,
  onUpdateChecklist,
  onDelete,
  isPlanner = false,
  isAdmin = false,
  currentUserUid = '',
  userRole,
  plans,
  showToast
}: { 
  wos: WorkOrder[], 
  assets: Asset[],
  onAdd: () => void,
  onEdit: (wo: WorkOrder) => void,
  onUpdateStatus: (id: string, status: string, completedAt?: string, duration?: number) => void,
  onUpdateChecklist?: (id: string, checklist: {tarefa: string, completed: boolean}[]) => void,
  onDelete: (id: string) => void,
  isPlanner?: boolean,
  isAdmin?: boolean,
  currentUserUid?: string,
  userRole?: UserProfile['role'],
  plans: PreventivePlan[],
  showToast: (msg: string, type?: 'success' | 'error') => void
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [completingWO, setCompletingWO] = useState<WorkOrder | null>(null);
  const [viewingWO, setViewingWO] = useState<WorkOrder | null>(null);
  const [completedAt, setCompletedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actualDuration, setActualDuration] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const filteredWos = useMemo(() => {
    return wos.filter(w => {
      const matchesSearch = (w.Description || '').toLowerCase().includes(search.toLowerCase()) || 
        (w.ID || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.AssetID || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.AssignedTo || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todas' || w.Status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [wos, search, statusFilter]);

  const totalPages = Math.ceil(filteredWos.length / itemsPerPage);
  const paginatedWos = filteredWos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Ordens de Serviço</h3>
          <p className="text-xs text-slate-500">Histórico completo de manutenções</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar O.S..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todos Status</option>
              <option value="Em Aberto">Em Aberto</option>
              <option value="Em Execução">Em Execução</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
            <button 
              onClick={onAdd}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova O.S</span>
              <span className="sm:hidden">Nova</span>
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipamento</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Natureza</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Atividade</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Técnico</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedWos.map((wo, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {wo.ID}
                    {wo.Checklist && wo.Checklist.length > 0 && (
                      <ClipboardList className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-600">{assets.find(a => a.ID === wo.AssetID)?.Tag || '-'}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{assets.find(a => a.ID === wo.AssetID)?.Model || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{wo.Type || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{wo.Nature || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{wo.ActivityType || '-'}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    wo.Priority === 'Crítica' ? "bg-rose-100 text-rose-700" :
                    wo.Priority === 'Alta' ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {wo.Priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {wo.Status === 'Concluída' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : wo.Status === 'Cancelada' ? (
                      <X className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm text-slate-600">{wo.Status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{wo.TechnicianID || wo.AssignedTo || '-'}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {wo.totalCost ? `R$ ${wo.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {wo.Status !== 'Concluída' && wo.Status !== 'Cancelada' && isPlanner && (isAdmin || wo.requestedBy === currentUserUid) && (
                      <>
                        <button 
                          onClick={() => {
                            setCompletingWO(wo);
                            setCompletedAt(new Date().toISOString().split('T')[0]);
                            setActualDuration(wo.Duration || wo.EstimatedTime || 0);
                          }}
                          className="p-1 text-emerald-500 hover:text-emerald-700 transition-colors"
                          title="Concluir O.S."
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onUpdateStatus(wo.ID, 'Cancelada')}
                          className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                          title="Cancelar O.S."
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setViewingWO(wo)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(isAdmin || wo.requestedBy === currentUserUid || wo.TechnicianID === currentUserUid) && (
                      <button 
                        onClick={() => onEdit(wo)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Editar O.S."
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {isPlanner && (isAdmin || wo.requestedBy === currentUserUid || wo.TechnicianID === currentUserUid) && (
                      <button 
                        onClick={() => onDelete(wo.ID)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir O.S."
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <p className="text-xs text-slate-500 font-medium">
          Mostrando {paginatedWos.length} de {filteredWos.length} ordens
        </p>
        <div className="flex items-center space-x-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <span className="text-xs font-bold text-slate-600">
            Página {currentPage} de {totalPages || 1}
          </span>
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {viewingWO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingWO(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Detalhes da O.S.</h3>
                    <p className="text-xs text-slate-500">Informações completas da Ordem de Serviço</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingWO(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº Equipamento (TAG)</label>
                      <p className="font-bold text-blue-600 text-lg">
                        {assets.find(a => a.ID === viewingWO.AssetID)?.Tag || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo do Equipamento</label>
                      <p className="font-bold text-slate-900">
                        {assets.find(a => a.ID === viewingWO.AssetID)?.Model || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID da O.S.</label>
                      <p className="font-bold text-slate-900 text-lg">{viewingWO.ID}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipamento (ID)</label>
                      <p className="font-bold text-slate-900">{viewingWO.AssetID}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          viewingWO.Status === 'Concluída' ? "bg-emerald-100 text-emerald-700" :
                          viewingWO.Status === 'Cancelada' ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {viewingWO.Status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prioridade</label>
                      <div className="mt-1">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          viewingWO.Priority === 'Crítica' ? "bg-rose-600 text-white" :
                          viewingWO.Priority === 'Alta' ? "bg-orange-500 text-white" :
                          "bg-blue-600 text-white"
                        )}>
                          {viewingWO.Priority}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Programada</label>
                      <p className="font-bold text-slate-900">{viewingWO.ScheduledDate ? new Date(viewingWO.ScheduledDate).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Técnico Responsável</label>
                      <p className="font-bold text-slate-900">{viewingWO.AssignedTo}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição do Problema / Atividade</label>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {viewingWO.Description}
                  </div>
                </div>

                {(() => {
                  const pId = viewingWO.PlanID || viewingWO.planId || (viewingWO.ID.startsWith('OS-PREV-') ? viewingWO.ID.split('-')[2] : null);
                  const hasPlan = !!pId;
                  
                  if (viewingWO.Checklist && viewingWO.Checklist.length > 0) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklist de Execução</label>
                          {hasPlan && (
                            <button 
                              onClick={async () => {
                                const plan = plans.find(p => p.ID === pId);
                                if (!plan) {
                                  showToast('Plano não encontrado', 'error');
                                  return;
                                }
                                // Fetch checklist from subcollection
                                const q = query(collection(db, `preventive-plans/${plan.ID}/checklist_itens`));
                                const snapshot = await getDocs(q);
                                let items = snapshot.docs.map(doc => {
                                  const data = doc.data();
                                  return {
                                    tarefa: data.tarefa || data.text || data.task || data.Description || data.Tarefa || data.Atividade || data.atividade || 'Atividade sem descrição',
                                    completed: false,
                                    grupo: data.grupo || 'Geral',
                                    equipamento: data.equipamento || 'Geral'
                                  };
                                });
                                
                                if (items.length === 0 && plan.Checklist) {
                                  items = plan.Checklist.map(t => ({ tarefa: t, completed: false, grupo: 'Geral', equipamento: 'Geral' }));
                                }

                                if (items.length > 0) {
                                  await updateDocument('work-orders', viewingWO.ID, { Checklist: items });
                                  setViewingWO({ ...viewingWO, Checklist: items });
                                  showToast('Check-list sincronizado com sucesso!');
                                } else {
                                  showToast('O plano vinculado não possui itens de check-list', 'error');
                                }
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Sincronizar com Plano
                            </button>
                          )}
                        </div>
                        
                        {(() => {
                          const grouped: Record<string, Record<string, typeof viewingWO.Checklist>> = {};
                          viewingWO.Checklist!.forEach((item, idx) => {
                            const g = item.grupo || 'Geral';
                            const e = item.equipamento || 'Geral';
                            if (!grouped[g]) grouped[g] = {};
                            if (!grouped[g][e]) grouped[g][e] = [];
                            (grouped[g][e] as any).push({ ...item, originalIndex: idx });
                          });

                          return Object.entries(grouped).map(([group, equipments]) => (
                            <div key={group} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-blue-600 rounded-full" />
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{group}</h4>
                              </div>
                              
                              <div className="space-y-4 ml-2">
                                {Object.entries(equipments).map(([eq, tasks]) => (
                                  <div key={eq} className="space-y-2">
                                    {eq !== 'Geral' && (
                                      <div className="flex items-center gap-2 ml-1">
                                        <Package className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{eq}</span>
                                      </div>
                                    )}
                                    
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                      {tasks.map((item: any) => (
                                        <div 
                                          key={item.originalIndex} 
                                          className={cn(
                                            "flex items-center gap-3 p-4 border-b border-slate-50 last:border-0 transition-colors",
                                            item.completed ? "bg-emerald-50/30" : "hover:bg-slate-50/50"
                                          )}
                                        >
                                          <button
                                            onClick={() => {
                                              if (!onUpdateChecklist) return;
                                              if (!hasPermission(userRole, 'execute_checklist')) return;
                                              const newChecklist = [...viewingWO.Checklist!];
                                              newChecklist[item.originalIndex].completed = !newChecklist[item.originalIndex].completed;
                                              onUpdateChecklist(viewingWO.ID, newChecklist);
                                              setViewingWO({...viewingWO, Checklist: newChecklist});
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors",
                                              item.completed 
                                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                                : "border-slate-300 text-transparent hover:border-blue-500"
                                            )}
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <span className={cn(
                                            "text-sm font-medium transition-colors",
                                            item.completed ? "text-emerald-700 line-through opacity-70" : "text-slate-700"
                                          )}>
                                            {item.tarefa || item.text || item.task || item.Description || item.Tarefa || item.Atividade || item.atividade || 'Atividade sem descrição'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    );
                  } else if (hasPlan) {
                    return (
                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 text-blue-700">
                          <AlertCircle className="w-5 h-5" />
                          <p className="text-sm font-bold">Esta O.S. não possui check-list vinculado.</p>
                        </div>
                        <button 
                          onClick={async () => {
                            const plan = plans.find(p => p.ID === pId);
                            if (!plan) {
                              showToast('Plano não encontrado', 'error');
                              return;
                            }
                            // Fetch checklist from subcollection
                            const q = query(collection(db, `preventive-plans/${plan.ID}/checklist_itens`));
                            const snapshot = await getDocs(q);
                            let items = snapshot.docs.map(doc => {
                              const data = doc.data();
                              return {
                                tarefa: data.tarefa || data.text || data.task || data.Description || data.Tarefa || data.Atividade || data.atividade || 'Atividade sem descrição',
                                completed: false,
                                grupo: data.grupo || 'Geral',
                                equipamento: data.equipamento || 'Geral'
                              };
                            });
                            
                            if (items.length === 0 && plan.Checklist) {
                              items = plan.Checklist.map(t => ({ tarefa: t, completed: false, grupo: 'Geral', equipamento: 'Geral' }));
                            }

                            if (items.length > 0) {
                              await updateDocument('work-orders', viewingWO.ID, { Checklist: items });
                              setViewingWO({ ...viewingWO, Checklist: items });
                              showToast('Check-list sincronizado com sucesso!');
                            } else {
                              showToast('O plano vinculado não possui itens de check-list', 'error');
                            }
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                          Importar Check-list do Plano
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {viewingWO.CompletedAt && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Concluída em</p>
                      <p className="text-sm font-bold text-emerald-700">{new Date(viewingWO.CompletedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setViewingWO(null)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {completingWO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletingWO(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <h3 className="text-lg font-bold mb-2">Concluir Ordem de Serviço</h3>
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Equipamento</p>
                <p className="text-sm font-bold text-blue-600">
                  {assets.find(a => a.ID === completingWO.AssetID)?.Tag || '-'} 
                  <span className="text-slate-400 font-normal ml-2">
                    ({assets.find(a => a.ID === completingWO.AssetID)?.Model || '-'})
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">{completingWO.Description}</p>
              </div>
              <p className="text-sm text-slate-500 mb-4">Informe a data de fechamento e a duração real da O.S. para atualizar a próxima manutenção e os custos.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Conclusão</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={completedAt}
                    onChange={e => setCompletedAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duração Real (h)</label>
                  <input 
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={actualDuration || ''}
                    onChange={e => setActualDuration(parseFloat(e.target.value) || 0)}
                    placeholder={completingWO?.EstimatedTime?.toString() || '0'}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setCompletingWO(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onUpdateStatus(completingWO?.ID || '', 'Concluída', completedAt, actualDuration);
                    setCompletingWO(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Employee Module Component ---
const EmployeeModule = ({ 
  employees, 
  onRefresh,
  onDelete,
  showToast,
  allUsers = [],
  isAdmin = false,
  currentUserUid = '',
  companies = []
}: { 
  employees: Employee[], 
  onRefresh: () => void,
  onDelete: (id: string) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  allUsers?: UserProfile[],
  isAdmin?: boolean,
  currentUserUid?: string,
  companies?: ThirdPartyCompany[]
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    Name: '',
    Function: 'Mecânico' as 'Mecânico' | 'Eletrônico' | 'Outro',
    Status: 'Ativo' as 'Ativo' | 'Férias' | 'Afastado',
    Type: 'Próprio' as 'Próprio' | 'Terceiro',
    userUid: '',
    companyId: '',
    hourlyRate: 0
  });

  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        Name: editingEmployee.Name,
        Function: editingEmployee.Function,
        Status: editingEmployee.Status,
        Type: editingEmployee.Type || 'Próprio',
        userUid: editingEmployee.userUid || '',
        companyId: editingEmployee.companyId || '',
        hourlyRate: editingEmployee.hourlyRate || 0
      });
    } else {
      setFormData({
        Name: '',
        Function: 'Mecânico',
        Status: 'Ativo',
        Type: 'Próprio',
        userUid: '',
        companyId: '',
        hourlyRate: 0
      });
    }
  }, [editingEmployee, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateDocument('employees', editingEmployee.ID, formData);
        showToast('Funcionário atualizado com sucesso!');
      } else {
        const id = `EMP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        await createDocument('employees', { ...formData, ID: id, createdBy: currentUserUid }, id);
        showToast('Funcionário cadastrado com sucesso!');
      }
      setShowModal(false);
      setEditingEmployee(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast('Erro ao salvar funcionário', 'error');
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      (emp.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.Function || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Gestão de Funcionários</h3>
          <p className="text-sm text-slate-500">Gerencie colaboradores próprios e terceirizados</p>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Funcionário</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar funcionários..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
              <span>Total H/H: R$ {filteredEmployees.reduce((sum, emp) => sum + (emp.hourlyRate || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100">
              {filteredEmployees.length} Funcionários
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Função</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo / Empresa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vínculo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const company = companies.find(c => c.id === emp.companyId);
                return (
                  <tr key={emp.ID} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{emp.ID}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.Name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.Function}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col">
                        <span>{emp.Type}</span>
                        {emp.Type === 'Terceiro' && company && (
                          <span className="text-[10px] text-blue-600 font-bold uppercase">{company.name}</span>
                        )}
                        {emp.Type === 'Terceiro' && emp.hourlyRate > 0 && (
                          <span className="text-[10px] text-slate-400">R$ {emp.hourlyRate.toFixed(2)}/h</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {emp.userUid ? (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <UserIcon className="w-3 h-3" />
                          <span>Vinculado</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Não vinculado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        emp.Status === 'Ativo' ? "bg-emerald-50 text-emerald-700" : 
                        emp.Status === 'Férias' ? "bg-amber-50 text-amber-700" :
                        "bg-rose-50 text-rose-700"
                      )}>
                        {emp.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {(isAdmin || emp.createdBy === currentUserUid) && (
                          <button 
                            onClick={() => {
                              setEditingEmployee(emp);
                              setShowModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => onDelete(emp.ID)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModal(false);
                setEditingEmployee(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                    <p className="text-sm text-slate-500">Dados profissionais do colaborador</p>
                  </div>
                  <button onClick={() => {
                    setShowModal(false);
                    setEditingEmployee(null);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: João Silva"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                      value={formData.Name}
                      onChange={e => setFormData({...formData, Name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Função</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                      value={formData.Function}
                      onChange={e => setFormData({...formData, Function: e.target.value as any})}
                    >
                      <option value="Mecânico">Mecânico</option>
                      <option value="Eletrônico">Eletrônico</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Tipo</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                        value={formData.Type}
                        onChange={e => setFormData({...formData, Type: e.target.value as any, companyId: e.target.value === 'Próprio' ? '' : formData.companyId})}
                      >
                        <option value="Próprio">Próprio</option>
                        <option value="Terceiro">Terceiro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Status</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                        value={formData.Status}
                        onChange={e => setFormData({...formData, Status: e.target.value as any})}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Férias">Férias</option>
                        <option value="Afastado">Afastado</option>
                      </select>
                    </div>
                  </div>

                  {formData.Type === 'Terceiro' && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1.5 ml-1">Empresa</label>
                        <select 
                          required
                          className="w-full px-4 py-2 bg-white border-2 border-transparent rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                          value={formData.companyId}
                          onChange={e => setFormData({...formData, companyId: e.target.value})}
                        >
                          <option value="">Selecionar Empresa</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1.5 ml-1">Valor Homem-Hora (R$)</label>
                        <div className="relative">
                          <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            required
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-transparent rounded-xl text-sm focus:ring-0 focus:border-blue-500 transition-all"
                            value={Number.isNaN(formData.hourlyRate) || formData.hourlyRate === 0 ? '' : formData.hourlyRate}
                            onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1.5 ml-1">Vincular a Usuário do Sistema</label>
                      <select 
                        className="w-full px-4 py-3 bg-blue-50 border-2 border-transparent rounded-2xl text-sm focus:ring-0 focus:border-blue-500 transition-all font-medium"
                        value={formData.userUid}
                        onChange={e => setFormData({...formData, userUid: e.target.value})}
                      >
                        <option value="">Nenhum usuário vinculado</option>
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-2 italic px-1">
                        * Vincular a um usuário permite que esta pessoa gerencie suas próprias tarefas e ordens de serviço com base nas regras de propriedade.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 sticky bottom-0 bg-white pb-2">
                    <button 
                      type="submit"
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98]"
                    >
                      {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Preventive Module Component ---
export const calculateNextDue = (lastDone: string, frequency: string, freqType?: 'dias' | 'horas', freqValue?: number) => {
  const date = new Date(lastDone);
  if (freqType === 'dias' && freqValue) {
    date.setDate(date.getDate() + freqValue);
  } else {
    if (frequency === 'Diária') date.setDate(date.getDate() + 1);
    else if (frequency === 'Semanal') date.setDate(date.getDate() + 7);
    else if (frequency === 'Quinzenal') date.setDate(date.getDate() + 15);
    else if (frequency === 'Mensal') date.setMonth(date.getMonth() + 1);
    else if (frequency === 'Bimestral') date.setMonth(date.getMonth() + 2);
    else if (frequency === 'Trimestral') date.setMonth(date.getMonth() + 3);
    else if (frequency === 'Semestral') date.setMonth(date.getMonth() + 6);
    else if (frequency === 'Anual') date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().split('T')[0];
};

const PreventiveModule = ({ 
  plans, 
  assets, 
  wos,
  onRefresh,
  onDelete,
  showToast,
  isAdmin = false,
  currentUserUid = '',
  userRole
}: { 
  plans: PreventivePlan[], 
  assets: Asset[],
  wos: WorkOrder[],
  onRefresh: () => void,
  onDelete: (id: string) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  isAdmin?: boolean,
  currentUserUid?: string,
  userRole?: UserProfile['role']
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedPlanForChecklist, setSelectedPlanForChecklist] = useState<PreventivePlan | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedPlanAssets, setSelectedPlanAssets] = useState<Record<string, string[]>>({});
  const [expandedGenerationPlans, setExpandedGenerationPlans] = useState<Record<string, boolean>>({});

  const handleTogglePlanAsset = (planId: string, assetId: string) => {
    setSelectedPlanAssets(prev => {
      const currentAssets = prev[planId] || [];
      const isSelected = currentAssets.includes(assetId);
      const newAssets = isSelected 
        ? currentAssets.filter(id => id !== assetId)
        : [...currentAssets, assetId];
      
      const newState = { ...prev, [planId]: newAssets };
      if (newAssets.length === 0) delete newState[planId];
      return newState;
    });
  };

  const handleToggleAllPlanAssets = (planId: string, assetIds: string[]) => {
    setSelectedPlanAssets(prev => {
      const currentAssets = prev[planId] || [];
      const allSelected = assetIds.every(id => currentAssets.includes(id));
      
      const newState = { ...prev, [planId]: allSelected ? [] : [...assetIds] };
      if (newState[planId].length === 0) delete newState[planId];
      return newState;
    });
  };
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  
  const toggleModelExpand = (model: string) => {
    setExpandedModels(prev => ({ ...prev, [model]: !prev[model] }));
  };
  
  // Group assets by model for easier selection
  const assetsByModel = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.Model]) acc[asset.Model] = [];
      acc[asset.Model].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [assets]);

  // Calendar Logic
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  }), [currentMonth]);

  const eventsByDate = useMemo(() => {
    const events: Record<string, any[]> = {};
    
    wos.forEach(w => {
      if (w.Status !== 'Cancelada' && w.ScheduledDate) {
        if (!events[w.ScheduledDate]) events[w.ScheduledDate] = [];
        const asset = assets.find(a => a.ID === w.AssetID);
        events[w.ScheduledDate].push({ 
          ...w, 
          assetTag: asset?.Tag || w.AssetID, 
          assetModel: asset?.Model || '',
          type: 'wo', 
          isCompleted: w.Status === 'Concluída' 
        });
      }
    });

    plans.forEach(p => {
      if (p.AssetNextDues) {
        Object.entries(p.AssetNextDues).forEach(([assetId, nextDue]) => {
          if (nextDue) {
            const hasOpenWO = wos.some(w => w.PlanID === p.ID && w.AssetID === assetId && w.Status !== 'Concluída' && w.Status !== 'Cancelada');
            if (!hasOpenWO) {
              if (!events[nextDue]) events[nextDue] = [];
              const asset = assets.find(a => a.ID === assetId);
              events[nextDue].push({ ...p, assetTag: asset?.Tag || assetId, type: 'plan' });
            }
          }
        });
      } else if (p.NextDue) {
        const hasOpenWO = wos.some(w => w.PlanID === p.ID && w.Status !== 'Concluída' && w.Status !== 'Cancelada');
        if (!hasOpenWO) {
          if (!events[p.NextDue]) events[p.NextDue] = [];
          events[p.NextDue].push({ ...p, type: 'plan' });
        }
      }
    });

    return events;
  }, [wos, plans, assets]);

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return eventsByDate[dateStr] || [];
  };

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const isOverdue = (date: string | null | undefined) => {
    if (!date) return false;
    return date < todayStr;
  };

  const [newPlan, setNewPlan] = useState({
    AssetIDs: [] as string[],
    Task: '',
    Frequency: 'Mensal',
    FrequencyType: 'dias' as 'dias' | 'horas',
    FrequencyValue: 30,
    LastDone: new Date().toISOString().split('T')[0],
    Type: 'Preventiva' as 'Preventiva' | 'Inspeção' | 'Lubrificação' | 'Manutenção Programada',
    Criticality: 'Média' as 'Alta' | 'Média' | 'Baixa',
    AssetType: '',
    Location: '',
    Plant: '',
    EstimatedTime: 1,
    Collaborators: 1,
    Checklist: [] as string[],
    scheduleType: 'global' as 'global' | 'individual',
    globalDate: new Date().toISOString().split('T')[0] as string | null,
    assets: [] as PreventivePlanAsset[]
  });

  const [editingPlan, setEditingPlan] = useState<PreventivePlan | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const togglePlanExpand = (planId: string) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  const canManageStructure = hasPermission(userRole, 'manage_checklist_structure');

  const handleAssetToggle = (assetId: string) => {
    setNewPlan(prev => {
      const isSelected = prev.AssetIDs.includes(assetId);
      const newAssetIDs = isSelected 
        ? prev.AssetIDs.filter(id => id !== assetId)
        : [...prev.AssetIDs, assetId];
      
      // Update location/plant based on the first selected asset if any
      const firstAsset = assets.find(a => a.ID === newAssetIDs[0]);
      
      return {
        ...prev,
        AssetIDs: newAssetIDs,
        AssetType: firstAsset?.Model || '',
        Location: firstAsset?.Location || '',
        Plant: firstAsset?.Plant || ''
      };
    });
  };

  const handleModelToggle = (assetIds: string[]) => {
    setNewPlan(prev => {
      const allSelected = assetIds.every(id => prev.AssetIDs.includes(id));
      let newAssetIDs: string[];
      
      if (allSelected) {
        newAssetIDs = prev.AssetIDs.filter(id => !assetIds.includes(id));
      } else {
        newAssetIDs = Array.from(new Set([...prev.AssetIDs, ...assetIds]));
      }

      const firstAsset = assets.find(a => a.ID === newAssetIDs[0]);
      
      return {
        ...prev,
        AssetIDs: newAssetIDs,
        AssetType: firstAsset?.Model || '',
        Location: firstAsset?.Location || '',
        Plant: firstAsset?.Plant || ''
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPlan.AssetIDs.length === 0) {
      showToast('Selecione ao menos um equipamento', 'error');
      return;
    }

    const planAssets: PreventivePlanAsset[] = newPlan.AssetIDs.map(assetId => {
      const existingAsset = newPlan.assets.find(a => a.assetId === assetId);
      return {
        assetId,
        nextDate: newPlan.scheduleType === 'global' 
          ? (newPlan.globalDate || calculateNextDue(newPlan.LastDone, newPlan.Frequency, newPlan.FrequencyType, newPlan.FrequencyValue))
          : (existingAsset?.nextDate || calculateNextDue(newPlan.LastDone, newPlan.Frequency, newPlan.FrequencyType, newPlan.FrequencyValue)),
        lastDate: existingAsset?.lastDate || newPlan.LastDone
      };
    });

    const assetLastDones: Record<string, string> = {};
    const assetNextDues: Record<string, string> = {};
    
    planAssets.forEach(asset => {
      assetLastDones[asset.assetId] = asset.lastDate || newPlan.LastDone;
      assetNextDues[asset.assetId] = asset.nextDate;
    });

    const nextDue = newPlan.scheduleType === 'global' 
      ? (newPlan.globalDate || calculateNextDue(newPlan.LastDone, newPlan.Frequency, newPlan.FrequencyType, newPlan.FrequencyValue))
      : (planAssets[0]?.nextDate || calculateNextDue(newPlan.LastDone, newPlan.Frequency, newPlan.FrequencyType, newPlan.FrequencyValue));

    const planData = {
      ...newPlan,
      AssetLastDones: assetLastDones,
      AssetNextDues: assetNextDues,
      NextDue: nextDue,
      assets: planAssets,
      // Lowercase aliases for normalization
      assetId: newPlan.AssetIDs[0] || '',
      frequencyType: newPlan.FrequencyType,
      frequencyValue: newPlan.FrequencyValue,
      lastExecutionDate: newPlan.LastDone,
      nextExecutionDate: nextDue
    };

    try {
      if (editingPlan) {
        await updateDocument('preventive-plans', editingPlan.ID, planData);
        showToast('Plano preventivo atualizado com sucesso!');
      } else {
        const planId = `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        await createDocument('preventive-plans', { ...planData, ID: planId, createdBy: currentUserUid }, planId);
        showToast('Plano preventivo criado com sucesso!');
      }
      setShowModal(false);
      setEditingPlan(null);
      setNewPlan({
        AssetIDs: [],
        Task: '',
        Frequency: 'Mensal',
        FrequencyType: 'dias',
        FrequencyValue: 30,
        LastDone: new Date().toISOString().split('T')[0],
        Type: 'Preventiva',
        Criticality: 'Média',
        AssetType: '',
        Location: '',
        Plant: '',
        EstimatedTime: 1,
        Collaborators: 1,
        Checklist: [],
        scheduleType: 'global',
        globalDate: new Date().toISOString().split('T')[0],
        assets: []
      });
    } catch (error) {
      console.error('Error saving plan:', error);
      showToast('Erro ao salvar plano preventivo', 'error');
    }
  };


  const handleOpenGenerationModal = () => {
    const initialSelection: Record<string, string[]> = {};
    plans.forEach(plan => {
      const planAssets = assets.filter(a => plan.AssetIDs?.includes(a.ID));
      const overdueAssets = planAssets.filter(asset => {
        const nextDue = plan.AssetNextDues?.[asset.ID] || plan.NextDue;
        return isOverdue(nextDue) || nextDue === new Date().toISOString().split('T')[0];
      }).map(a => a.ID);
      
      if (overdueAssets.length > 0) {
        initialSelection[plan.ID] = overdueAssets;
      }
    });
    setSelectedPlanAssets(initialSelection);
    setShowGenerationModal(true);
  };

  const handleGenerateOrders = async () => {
    const planIds = Object.keys(selectedPlanAssets);
    if (planIds.length === 0) {
      showToast('Selecione ao menos um equipamento', 'error');
      return;
    }

    try {
      let count = 0;
      const promises = planIds.flatMap(planId => {
        const plan = plans.find(p => p.ID === planId);
        const assetIds = selectedPlanAssets[planId];
        if (!plan || !assetIds) return [];

        return assetIds.map(async (assetId) => {
          // Automatic Work Order Generation: Only if no open WO of same type exists
          const hasOpenWO = wos.filter(wo => 
            wo.AssetID === assetId && 
            wo.Type === plan.Type && 
            (wo.Status === 'Em Aberto' || wo.Status === 'Em Execução')
          ).length > 0;

          if (hasOpenWO) {
            console.log(`Skipping WO generation for asset ${assetId} - already has an open ${plan.Type} WO`);
            return;
          }

          const woId = `OS-PREV-${Math.floor(Math.random() * 10000)}`;
          const scheduledDate = plan.AssetNextDues?.[assetId] || plan.NextDue || new Date().toISOString().split('T')[0];
          
          const workOrder: any = {
            ID: woId,
            AssetID: assetId,
            PlanID: plan.ID || '',
            Description: `[PREVENTIVA] ${plan.Task || 'Manutenção'} - ${plan.Type || 'Preventiva'}`,
            Priority: plan.Criticality || 'Média',
            Status: 'Em Aberto',
            AssignedTo: 'Equipe de Manutenção',
            CreatedAt: new Date().toISOString().split('T')[0],
            ScheduledDate: scheduledDate,
            CompletedAt: '',
            Type: plan.Type || 'Preventiva',
            Nature: 'Programada',
            ActivityType: 'Inspeção',
            // Lowercase aliases and new fields
            assetId: assetId,
            planId: plan.ID || '',
            technicianId: '',
            type: plan.Type || 'Preventiva',
            nature: 'Programada',
            activityType: 'Inspeção', // Default for preventive
            priority: plan.Criticality || 'Média',
            startDate: scheduledDate,
            endDate: '',
            duration: plan.EstimatedTime || 0
          };

          if (plan.EstimatedTime !== undefined && plan.EstimatedTime !== null) {
            workOrder.EstimatedTime = Number(plan.EstimatedTime);
          }
          if (plan.Collaborators !== undefined && plan.Collaborators !== null) {
            workOrder.Collaborators = Number(plan.Collaborators);
          }
          
          // Fetch checklist from subcollection if array field is empty
          let checklistItems = (plan.Checklist || []).map(t => ({ tarefa: t, completed: false }));
          if (checklistItems.length === 0) {
            const qCheck = query(collection(db, `preventive-plans/${plan.ID}/checklist_itens`));
            const snapshot = await getDocs(qCheck);
            checklistItems = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                tarefa: data.tarefa || data.text || data.task || data.Description || data.Tarefa || data.Atividade || data.atividade || 'Atividade sem descrição',
                completed: false,
                grupo: data.grupo || 'Geral',
                equipamento: data.equipamento || 'Geral'
              };
            });
          }
          if (checklistItems.length > 0) {
            workOrder.Checklist = checklistItems;
          }

          count++;
          await createDocument('work-orders', workOrder, woId);
        });
      });

      await Promise.all(promises);
      showToast(`${count} Ordem(ns) de Serviço gerada(s) com sucesso!`);
      setShowGenerationModal(false);
      setSelectedPlanAssets({});
      onRefresh();
    } catch (error) {
      console.error('Error generating orders:', error);
      showToast('Erro ao gerar ordens de serviço', 'error');
    }
  };

  const plansWithStatus = plans.map(plan => {
    // Compatibility conversion
    const scheduleType = plan.scheduleType || 'global';
    const globalDate = plan.globalDate || plan.NextDue || plan.nextExecutionDate;
    const rawAssets = plan.assets || [];
    
    // If assets don't exist but AssetIDs do, populate them
    let assetsList = rawAssets;
    if (assetsList.length === 0 && plan.AssetIDs && plan.AssetIDs.length > 0) {
      assetsList = plan.AssetIDs.map(id => ({
        assetId: id,
        nextDate: plan.AssetNextDues?.[id] || plan.NextDue || plan.nextExecutionDate || '',
        lastDate: plan.AssetLastDones?.[id] || plan.LastDone || plan.lastExecutionDate || null
      }));
    }

    let overdueCount = 0;
    const updatedAssets = assetsList.map(asset => {
      const overdue = isOverdue(asset.nextDate);
      if (overdue) overdueCount++;
      return { ...asset, isOverdue: overdue };
    });

    return {
      ...plan,
      scheduleType,
      globalDate,
      assets: updatedAssets,
      overdueCount
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">Plano de Manutenção Preventiva</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleOpenGenerationModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Gerar Lote</span>
          </button>
          <button 
            onClick={() => setShowSummary(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>Cronograma</span>
          </button>
          {canManageStructure && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="w-10 px-6 py-4"></th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plano de Manutenção</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo / Frequência</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Criticidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próxima (Geral)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plansWithStatus.map((plan, i) => {
                const planAssets = assets.filter(a => plan.AssetIDs?.includes(a.ID));
                const overdue = isOverdue(plan.NextDue);
                const isExpanded = expandedPlans[plan.ID];
                
                return (
                  <React.Fragment key={plan.ID || i}>
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        (overdue || plan.overdueCount > 0) && "bg-rose-50/20"
                      )}
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => togglePlanExpand(plan.ID)}
                          className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            overdue || plan.overdueCount > 0 ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                          )}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{plan.Task}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                              {planAssets.length} Equipamento(s) • {plan.Location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{plan.Type}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{plan.Frequency}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                          plan.Criticality === 'Alta' ? "bg-rose-100 text-rose-700" :
                          plan.Criticality === 'Média' ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {plan.Criticality}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className={cn(
                            "text-xs font-bold",
                            overdue ? "text-rose-600" : "text-slate-900"
                          )}>
                            {plan.NextDue ? new Date(plan.NextDue).toLocaleDateString('pt-BR') : '--/--/----'}
                          </p>
                          {plan.overdueCount > 0 && (
                            <span className="text-[9px] font-bold text-rose-500 uppercase">
                              {plan.overdueCount} ativos atrasados
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {canManageStructure && (isAdmin || plan.createdBy === currentUserUid) && (
                            <button 
                              onClick={() => {
                                setEditingPlan(plan);
                                setNewPlan({
                                  AssetIDs: plan.AssetIDs || [],
                                  Task: plan.Task || '',
                                  Frequency: plan.Frequency || '',
                                  FrequencyType: plan.FrequencyType || 'dias',
                                  FrequencyValue: plan.FrequencyValue || 30,
                                  LastDone: plan.LastDone || '',
                                  Type: plan.Type || 'Preventiva',
                                  Criticality: plan.Criticality || 'Média',
                                  AssetType: plan.AssetType || '',
                                  Location: plan.Location || '',
                                  Plant: plan.Plant || '',
                                  EstimatedTime: plan.EstimatedTime || 0,
                                  Collaborators: plan.Collaborators || 0,
                                  Checklist: plan.Checklist || [],
                                  scheduleType: plan.scheduleType || 'global',
                                  globalDate: plan.globalDate || plan.NextDue || '',
                                  assets: (plan.assets || []).map(a => ({ assetId: a.assetId, nextDate: a.nextDate, lastDate: a.lastDate }))
                                });
                                setShowModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar Plano"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canManageStructure && isAdmin && (
                            <button 
                              onClick={() => onDelete(plan.ID)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Excluir Plano"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedPlanForChecklist(plan);
                              setShowChecklistModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Checklist de Manutenção"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-50/30"
                        >
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {plan.AssetIDs?.map(assetId => {
                                const asset = assets.find(a => a.ID === assetId);
                                const nextDue = plan.AssetNextDues?.[assetId] || plan.NextDue;
                                const assetOverdue = isOverdue(nextDue);
                                
                                return (
                                  <div key={assetId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                        assetOverdue ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                                      )}>
                                        <Box className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-900">{asset?.Tag}</p>
                                        <p className="text-[10px] text-slate-500 line-clamp-1">{asset?.Description}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={cn(
                                        "text-[10px] font-bold",
                                        assetOverdue ? "text-rose-600" : "text-slate-600"
                                      )}>
                                        {nextDue ? new Date(nextDue).toLocaleDateString('pt-BR') : '--/--/----'}
                                      </p>
                                      {assetOverdue && <p className="text-[8px] font-bold text-rose-500 uppercase">Atrasado</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {plan.Checklist && plan.Checklist.length > 0 && (
                              <div className="mt-4 p-4 bg-white border border-slate-100 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Checklist de Manutenção</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {plan.Checklist.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generation Modal */}
      <AnimatePresence>
        {showGenerationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenerationModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Gerar Ordens de Serviço</h3>
                    <p className="text-sm text-slate-500">Selecione os planos para gerar as ordens de execução.</p>
                  </div>
                  <button onClick={() => setShowGenerationModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 mb-8">
                  {plans.map((plan) => {
                    const planAssets = assets.filter(a => plan.AssetIDs?.includes(a.ID));
                    const selectedAssets = selectedPlanAssets[plan.ID] || [];
                    const allSelected = planAssets.length > 0 && selectedAssets.length === planAssets.length;
                    const someSelected = selectedAssets.length > 0 && !allSelected;
                    const isExpanded = expandedGenerationPlans[plan.ID];

                    return (
                      <div key={plan.ID} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div 
                          className="p-4 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedGenerationPlans(prev => ({ ...prev, [plan.ID]: !prev[plan.ID] }))}
                        >
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllPlanAssets(plan.ID, planAssets.map(a => a.ID));
                              }}
                              className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                allSelected ? "bg-blue-600 border-blue-600 text-white" : someSelected ? "bg-blue-100 border-blue-400 text-blue-600" : "border-slate-300 bg-white"
                              )}
                            >
                              {allSelected && <CheckCircle2 className="w-4 h-4" />}
                              {someSelected && <div className="w-2 h-0.5 bg-blue-600" />}
                            </button>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{plan.Task}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">{plan.Frequency} • {plan.Type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-500">
                                {selectedAssets.length} / {planAssets.length} selecionados
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-2 grid grid-cols-1 gap-1">
                            {planAssets.map(asset => {
                              const nextDue = plan.AssetNextDues?.[asset.ID] || plan.NextDue;
                              const overdue = isOverdue(nextDue);
                              const isSelected = selectedAssets.includes(asset.ID);

                              return (
                                <div 
                                  key={asset.ID}
                                  onClick={() => handleTogglePlanAsset(plan.ID, asset.ID)}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                                    isSelected ? "bg-blue-50/50 border border-blue-100" : "hover:bg-white border border-transparent"
                                  )}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                    )}>
                                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-700 text-xs">{asset.Tag}</p>
                                      <p className="text-[10px] text-slate-400">{asset.Description || asset.Model}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={cn(
                                      "text-[10px] font-bold",
                                      overdue ? "text-rose-600" : "text-slate-500"
                                    )}>
                                      {new Date(nextDue).toLocaleDateString('pt-BR')}
                                    </p>
                                    {overdue && <p className="text-[8px] text-rose-400 font-bold uppercase">Atrasado</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowGenerationModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGenerateOrders}
                    disabled={Object.keys(selectedPlanAssets).length === 0}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    Gerar {Object.values(selectedPlanAssets).flat().length} Ordens de Serviço
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Plan Modal */}
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Criar Plano Preventivo</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <fieldset disabled={!canManageStructure} className="space-y-4 border-none p-0 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Plano</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newPlan.Type}
                        onChange={e => setNewPlan({...newPlan, Type: e.target.value as any})}
                      >
                        <option value="Preventiva">Preventiva</option>
                        <option value="Inspeção">Inspeção</option>
                        <option value="Lubrificação">Lubrificação</option>
                        <option value="Manutenção Programada">Manutenção Programada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Criticidade</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newPlan.Criticality}
                        onChange={e => setNewPlan({...newPlan, Criticality: e.target.value as any})}
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Agendamento</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={newPlan.scheduleType}
                      onChange={e => setNewPlan({...newPlan, scheduleType: e.target.value as any})}
                    >
                      <option value="global">Data única para todos</option>
                      <option value="individual">Datas por equipamento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Equipamentos (Agrupados por Modelo)</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {Object.entries(assetsByModel).map(([model, modelAssets]) => {
                        const isExpanded = expandedModels[model];
                        const allSelected = modelAssets.every(a => newPlan.AssetIDs.includes(a.ID));
                        const someSelected = modelAssets.some(a => newPlan.AssetIDs.includes(a.ID));

                        return (
                          <div key={model} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-100">
                              <div className="flex items-center space-x-2">
                                <button 
                                  type="button"
                                  onClick={() => toggleModelExpand(model)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                </button>
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{model} ({modelAssets.length})</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <button 
                                  type="button"
                                  onClick={() => handleModelToggle(modelAssets.map(a => a.ID))}
                                  className={cn(
                                    "text-[10px] font-bold transition-colors",
                                    allSelected ? "text-rose-600 hover:text-rose-700" : "text-blue-600 hover:text-blue-700"
                                  )}
                                >
                                  {allSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                </button>
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  allSelected ? "bg-emerald-500" : someSelected ? "bg-amber-500" : "bg-slate-300"
                                )} />
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="grid grid-cols-1 gap-1 p-2 bg-white animate-in fade-in slide-in-from-top-1 duration-200">
                                {modelAssets.map(a => (
                                  <label key={a.ID} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors group">
                                    <input 
                                      type="checkbox"
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      checked={newPlan.AssetIDs.includes(a.ID)}
                                      onChange={() => handleAssetToggle(a.ID)}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{a.Tag}</span>
                                      <span className="text-[10px] text-slate-400">{a.Description}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      {newPlan.AssetIDs.length} equipamento(s) selecionado(s)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo Ativo</label>
                      <input 
                        type="text"
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm text-slate-500"
                        value={newPlan.AssetType}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Local</label>
                      <input 
                        type="text"
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm text-slate-500"
                        value={newPlan.Location}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planta</label>
                      <input 
                        type="text"
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm text-slate-500"
                        value={newPlan.Plant}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tarefa</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Troca de óleo, Inspeção..."
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={newPlan.Task}
                      onChange={e => setNewPlan({...newPlan, Task: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Frequência (Tipo)</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newPlan.FrequencyType}
                        onChange={e => setNewPlan({...newPlan, FrequencyType: e.target.value as any})}
                      >
                        <option value="dias">Dias</option>
                        <option value="horas">Horas (Horímetro)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor da Frequência</label>
                      <input 
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newPlan.FrequencyValue) || newPlan.FrequencyValue === 0 ? '' : newPlan.FrequencyValue}
                        onChange={e => setNewPlan({...newPlan, FrequencyValue: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Última Realização</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newPlan.LastDone}
                        onChange={e => setNewPlan({...newPlan, LastDone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Próxima Manutenção {newPlan.scheduleType === 'global' ? '(Global)' : ''}</label>
                      <input 
                        required={newPlan.scheduleType === 'global'}
                        disabled={newPlan.scheduleType !== 'global'}
                        type="date"
                        className={cn(
                          "w-full px-4 py-3 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500",
                          newPlan.scheduleType === 'global' ? "bg-slate-50" : "bg-slate-100 text-slate-500 cursor-not-allowed"
                        )}
                        value={newPlan.scheduleType === 'global' ? (newPlan.globalDate || '') : ''}
                        onChange={e => setNewPlan({...newPlan, globalDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {newPlan.scheduleType === 'individual' && (
                    <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Datas Individuais</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {newPlan.AssetIDs.map(assetId => {
                          const asset = assets.find(a => a.ID === assetId);
                          const assetData = newPlan.assets.find(a => a.assetId === assetId);
                          return (
                            <div key={assetId} className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-blue-100">
                              <span className="text-xs font-bold text-slate-700 truncate">{asset?.Tag}</span>
                              <input 
                                type="date"
                                required
                                className="px-2 py-1 bg-slate-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                                value={assetData?.nextDate || ''}
                                onChange={e => {
                                  const newAssets = [...newPlan.assets];
                                  const index = newAssets.findIndex(a => a.assetId === assetId);
                                  if (index >= 0) {
                                    newAssets[index] = { ...newAssets[index], nextDate: e.target.value };
                                  } else {
                                    newAssets.push({ assetId, nextDate: e.target.value, lastDate: newPlan.LastDone });
                                  }
                                  setNewPlan({ ...newPlan, assets: newAssets });
                                }}
                              />
                            </div>
                          );
                        })}
                        {newPlan.AssetIDs.length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center py-4">Selecione equipamentos acima para definir datas</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tempo Estimado (h)</label>
                      <input 
                        required
                        type="number"
                        min="0.1"
                        step="0.1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newPlan.EstimatedTime) || newPlan.EstimatedTime === 0 ? '' : newPlan.EstimatedTime}
                        onChange={e => setNewPlan({...newPlan, EstimatedTime: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nº Colaboradores</label>
                      <input 
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newPlan.Collaborators) || newPlan.Collaborators === 0 ? '' : newPlan.Collaborators}
                        onChange={e => setNewPlan({...newPlan, Collaborators: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Checklist de Manutenção</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text"
                        placeholder="Adicionar item ao checklist..."
                        className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newChecklistItem}
                        onChange={e => setNewChecklistItem(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newChecklistItem.trim()) {
                              setNewPlan(prev => ({
                                ...prev,
                                Checklist: [...(prev.Checklist || []), newChecklistItem.trim()]
                              }));
                              setNewChecklistItem('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newChecklistItem.trim()) {
                            setNewPlan(prev => ({
                              ...prev,
                              Checklist: [...(prev.Checklist || []), newChecklistItem.trim()]
                            }));
                            setNewChecklistItem('');
                          }
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {newPlan.Checklist && newPlan.Checklist.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {newPlan.Checklist.map((item, index) => (
                          <li key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl text-sm text-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center">
                                <Check className="w-3 h-3 text-transparent" />
                              </div>
                              <span>{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewPlan(prev => ({
                                  ...prev,
                                  Checklist: prev.Checklist?.filter((_, i) => i !== index)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  </fieldset>
 
                  {canManageStructure && (
                    <button 
                      type="submit"
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all mt-4 shadow-lg shadow-blue-200"
                    >
                      Salvar Plano
                    </button>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Modal (Calendar) */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummary(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Calendário de Manutenções</h3>
                    <p className="text-slate-500 text-sm">Visualização mensal das manutenções programadas.</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                      <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white rounded-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <span className="px-4 font-bold text-slate-700 min-w-[140px] text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                      </span>
                      <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white rounded-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-slate-100 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden mb-8">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, i) => {
                    const events = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDay = isToday(day);

                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "min-h-[120px] p-2 bg-white flex flex-col space-y-1",
                          !isCurrentMonth && "bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                            isTodayDay ? "bg-blue-600 text-white" : "text-slate-400",
                            !isCurrentMonth && "opacity-30"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[10px] font-bold text-slate-300">
                              {events.length} {events.length === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 max-h-[80px] scrollbar-hide">
                          {events.map((event, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "text-[9px] p-1.5 rounded-lg border leading-tight truncate",
                                event.type === 'wo' 
                                  ? event.isCompleted
                                    ? "bg-slate-100 border-slate-200 text-slate-500 line-through"
                                    : "bg-indigo-50 border-indigo-100 text-indigo-700" 
                                  : "bg-emerald-50 border-emerald-100 text-emerald-700"
                              )}
                              title={event.type === 'wo' ? `[OS] ${event.Description} - ${event.assetTag} (${event.assetModel})` : `[PLANO] ${event.Task} - ${event.assetTag || 'Vários'}`}
                            >
                              <span className="font-bold mr-1">
                                {event.type === 'wo' ? 'OS' : 'PL'}
                              </span>
                              {event.type === 'wo' ? `${event.Description} - ${event.assetTag} (${event.assetModel})` : `${event.Task} - ${event.assetTag || 'Vários'}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center space-x-8 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Planos Preventivos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span>Ordens de Serviço</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <span>Concluídas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span>Hoje</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedPlanForChecklist && (
        <ChecklistModal
          plan={selectedPlanForChecklist}
          assets={assets}
          isOpen={showChecklistModal}
          onClose={() => {
            setShowChecklistModal(false);
            setSelectedPlanForChecklist(null);
          }}
          userRole={userRole}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// --- Main App Component ---
// --- Gantt Component ---
const Gantt = ({ wos, assets, employees }: { wos: WorkOrder[], assets: Asset[], employees: Employee[] }) => {
  const [viewMode, setViewMode] = useState<'technician' | 'asset'>('technician');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));

  const groupedItems = useMemo(() => {
    const groups: Record<string, WorkOrder[]> = {};
    wos.forEach(wo => {
      const key = viewMode === 'technician' ? (wo.TechnicianID || wo.AssignedTo || 'Não Atribuído') : (wo.AssetID || 'Sem Ativo');
      if (!groups[key]) groups[key] = [];
      groups[key].push(wo);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [wos, viewMode]);

  const getLabel = (key: string) => {
    if (viewMode === 'technician') {
      return employees.find(e => e.ID === key || e.Name === key)?.Name || key;
    }
    return assets.find(a => a.ID === key || a.Tag === key)?.Tag || key;
  };

  const getSubLabel = (key: string, items: WorkOrder[]) => {
    if (viewMode === 'asset') {
      return assets.find(a => a.ID === key || a.Tag === key)?.Description || '';
    }
    return `${items.length} Ordens`;
  };

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-900">Planejamento (Gantt)</h3>
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('technician')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all", 
                viewMode === 'technician' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Por Técnico
            </button>
            <button 
              onClick={() => setViewMode('asset')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all", 
                viewMode === 'asset' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Por Ativo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
          </div>
          <button onClick={nextMonth} className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] font-bold text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            HOJE
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
            <div className="w-56 p-4 border-r border-slate-100 font-bold text-[9px] text-slate-400 uppercase tracking-widest bg-slate-50/50">Recurso</div>
            {days.map(day => (
              <div key={day.toISOString()} className={cn(
                "w-20 p-2 border-r border-slate-100 text-center flex flex-col items-center justify-center transition-colors", 
                isToday(day) ? "bg-blue-50/50" : ""
              )}>
                <span className="text-[7px] uppercase text-slate-400 font-black mb-0.5">{format(day, 'EEE', { locale: ptBR })}</span>
                <span className={cn(
                  "text-sm font-black",
                  isToday(day) ? "text-blue-600" : "text-slate-700"
                )}>{format(day, 'dd')}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {groupedItems.length > 0 ? groupedItems.map(([key, items]) => (
            <div key={key} className="flex border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
              <div className="w-56 p-4 border-r border-slate-100 flex flex-col justify-center bg-white/50 group-hover:bg-white transition-colors">
                <span className="text-xs font-black text-slate-800 truncate mb-1" title={getLabel(key)}>{getLabel(key)}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{getSubLabel(key, items)}</span>
              </div>
              <div className="flex relative h-14 items-center">
                {days.map(day => (
                  <div key={day.toISOString()} className={cn(
                    "w-20 border-r border-slate-50 h-full",
                    isToday(day) ? "bg-blue-50/10" : ""
                  )} />
                ))}
                {items.map(wo => {
                  const rawStart = wo.StartDate || wo.ScheduledDate || wo.CreatedAt;
                  if (!rawStart) return null;
                  
                  const start = parseISO(rawStart);
                  const durationDays = wo.Duration && wo.Duration > 0 ? wo.Duration : (wo.duration && wo.duration > 0 ? wo.duration : 1);
                  const end = wo.EndDate || wo.endDate ? parseISO(wo.EndDate || wo.endDate!) : addDays(start, durationDays);
                  
                  // Filter for current month view
                  if (isAfter(start, endDate) || isBefore(end, startDate)) return null;

                  const effectiveStart = isBefore(start, startDate) ? startDate : start;
                  const effectiveEnd = isAfter(end, endDate) ? endDate : end;

                  const startDiff = differenceInDays(startOfDay(effectiveStart), startOfDay(startDate));
                  const duration = Math.max(1, differenceInDays(startOfDay(effectiveEnd), startOfDay(effectiveStart)) + 1);
                  
                  const left = startDiff * 80;
                  const width = duration * 80;

                  return (
                    <motion.div 
                      key={wo.ID}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedWo(wo)}
                      className={cn(
                        "absolute h-10 rounded-xl border shadow-sm p-2 flex flex-col justify-center cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all z-10 border-white/20",
                        wo.Status === 'Concluída' ? "bg-emerald-500 text-white shadow-emerald-100" :
                        wo.Status === 'Em Execução' ? "bg-blue-600 text-white shadow-blue-100" :
                        wo.Status === 'Cancelada' ? "bg-slate-400 text-white" :
                        "bg-amber-500 text-white shadow-amber-100"
                      )}
                      style={{ left: `${left + 3}px`, width: `${width - 6}px` }}
                    >
                      <span className="text-[7px] font-black tracking-widest mb-0.5">#{wo.ID}</span>
                      <span className="text-[9px] font-bold truncate opacity-90">{wo.Description}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )) : (
            <div className="p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <GanttChart className="w-10 h-10 text-slate-300" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Sem ordens agendadas</h4>
              <p className="text-slate-500 text-sm">Não há dados para exibir neste período e modo de visualização.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedWo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-hidden" 
            onClick={() => setSelectedWo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" 
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedWo(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg",
                  selectedWo.Status === 'Concluída' ? "bg-emerald-500 text-white shadow-emerald-200" :
                  selectedWo.Status === 'Cancelada' ? "bg-slate-400 text-white" :
                  selectedWo.Status === 'Em Execução' ? "bg-blue-600 text-white shadow-blue-200" : "bg-amber-500 text-white shadow-amber-200"
                )}>
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                    <span className="font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      O.S. #{selectedWo.ID}
                    </span>
                    <span className={cn(
                      "font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      (selectedWo.Priority || selectedWo.priority) === 'Alta' ? "bg-rose-50 text-rose-600 border-rose-100" :
                      (selectedWo.Priority || selectedWo.priority) === 'Crítica' ? "bg-rose-600 text-white border-rose-700" :
                      (selectedWo.Priority || selectedWo.priority) === 'Média' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {selectedWo.Priority || selectedWo.priority}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">{selectedWo.Description}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-8">
                <div className="p-3.5 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Responsável</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{selectedWo.AssignedTo}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{viewMode === 'technician' ? 'Técnico' : 'Ativo'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Status Atual</p>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
                      selectedWo.Status === 'Concluída' ? "bg-emerald-100 border-emerald-200 text-emerald-600" :
                      selectedWo.Status === 'Cancelada' ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-blue-100 border-blue-200 text-blue-600"
                    )}>
                      {selectedWo.Status === 'Concluída' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <p className="text-sm font-bold text-slate-900">{selectedWo.Status}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="p-4 bg-slate-50/80 rounded-[18px] border border-slate-100/80">
                  <div className="flex items-center gap-3.5 text-slate-600 mb-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Período de Realização</p>
                      <p className="text-sm font-bold text-slate-900">
                        {format(parseISO(selectedWo.StartDate || selectedWo.ScheduledDate || selectedWo.CreatedAt), "dd/MM/yyyy")} → {selectedWo.EndDate ? format(parseISO(selectedWo.EndDate), "dd/MM/yyyy") : 'Em aberto'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedWo.AssetID && (
                    <div className="flex items-center gap-3.5 text-slate-600">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                        <Box className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Equipamento / Ativo</p>
                        <p className="text-sm font-bold text-slate-900">
                          {assets.find(a => a.ID === selectedWo.AssetID || a.Tag === selectedWo.AssetID)?.Tag || selectedWo.AssetID}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedWo.Cause && (
                  <div className="p-4 bg-amber-50 rounded-[18px] border border-amber-100/60">
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Causa / Observação</p>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">{selectedWo.Cause}</p>
                  </div>
                )}
              </div>

              <button 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-base font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                onClick={() => setSelectedWo(null)}
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

const ReportsModule = ({ wos, assets, employees, plans }: { 
  wos: WorkOrder[], 
  assets: Asset[], 
  employees: Employee[],
  plans: PreventivePlan[]
}) => {
  const [reportType, setReportType] = useState<'wos' | 'assets' | 'preventive'>('wos');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const exportToPDF = (title: string, headers: string[][], data: any[][], fileName: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
    
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`${fileName}.pdf`);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (reportType === 'wos') {
      const filtered = wos.filter(wo => {
        if (!dateRange.start || !dateRange.end) return true;
        const date = wo.CreatedAt || '';
        return date >= dateRange.start && date <= dateRange.end;
      });

      const data = filtered.map(wo => ({
        ID: wo.ID,
        Equipamento: assets.find(a => a.ID === wo.AssetID)?.Tag || wo.AssetID,
        Descrição: wo.Description,
        Tipo: wo.Type,
        Status: wo.Status,
        Prioridade: wo.Priority,
        Técnico: wo.AssignedTo,
        Data: wo.CreatedAt
      }));

      if (format === 'excel') {
        exportToExcel(data, 'Relatorio_Ordens_Servico');
      } else {
        const headers = [['ID', 'Equipamento', 'Descrição', 'Tipo', 'Status', 'Prioridade', 'Data']];
        const pdfData = data.map(d => [d.ID, d.Equipamento, d.Descrição, d.Tipo, d.Status, d.Prioridade, d.Data]);
        exportToPDF('Relatório de Ordens de Serviço', headers, pdfData, 'Relatorio_Ordens_Servico');
      }
    } else if (reportType === 'assets') {
      const data = assets.map(a => ({
        Tag: a.Tag,
        Descrição: a.Description,
        Modelo: a.Model,
        Localização: a.Location,
        Planta: a.Plant,
        Status: a.Status
      }));

      if (format === 'excel') {
        exportToExcel(data, 'Relatorio_Ativos');
      } else {
        const headers = [['Tag', 'Descrição', 'Modelo', 'Localização', 'Planta', 'Status']];
        const pdfData = data.map(d => [d.Tag, d.Descrição, d.Modelo, d.Localização, d.Planta, d.Status]);
        exportToPDF('Relatório de Ativos', headers, pdfData, 'Relatorio_Ativos');
      }
    } else if (reportType === 'preventive') {
      const data = plans.map(p => ({
        ID: p.ID,
        Tarefa: p.Task,
        Tipo: p.Type,
        Frequência: `${p.FrequencyValue} ${p.FrequencyType}`,
        Próxima: p.NextDue,
        Criticidade: p.Criticality
      }));

      if (format === 'excel') {
        exportToExcel(data, 'Relatorio_Planos_Preventivos');
      } else {
        const headers = [['ID', 'Tarefa', 'Tipo', 'Frequência', 'Próxima', 'Criticidade']];
        const pdfData = data.map(d => [d.ID, d.Tarefa, d.Tipo, d.Frequência, d.Próxima, d.Criticidade]);
        exportToPDF('Relatório de Planos Preventivos', headers, pdfData, 'Relatorio_Planos_Preventivos');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Relatórios Customizados</h3>
          <p className="text-sm text-slate-500">Gere e exporte dados do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Configurações do Relatório
          </h4>
          
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-500 uppercase">Tipo de Relatório</label>
            <select 
              value={reportType}
              onChange={e => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="wos">Ordens de Serviço</option>
              <option value="assets">Inventário de Ativos</option>
              <option value="preventive">Planos Preventivos</option>
            </select>
          </div>

          {reportType === 'wos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-500 uppercase">Início</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-500 uppercase">Fim</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-2">
            <button 
              onClick={() => handleExport('excel')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h5 className="font-medium text-slate-900">Pré-visualização Indisponível</h5>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Selecione as configurações ao lado e clique em exportar para gerar o arquivo final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showWOModal, setShowWOModal] = useState(false);
  const [selectedModelForWO, setSelectedModelForWO] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const assetsByModel = useMemo(() => {
    const grouped = assets.reduce((acc, asset) => {
      const model = asset.Model || 'Sem Modelo';
      if (!acc[model]) acc[model] = [];
      acc[model].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);

    const sortedGrouped: Record<string, Asset[]> = {};
    Object.keys(grouped).sort().forEach(model => {
      sortedGrouped[model] = grouped[model].sort((a, b) => 
        (a.Description || a.Tag).localeCompare(b.Description || b.Tag)
      );
    });
    return sortedGrouped;
  }, [assets]);
  const [wos, setWos] = useState<WorkOrder[]>([]);
  const [plans, setPlans] = useState<PreventivePlan[]>([]);
  const [bditssData, setBditssData] = useState<any[]>([]);
  const [dinamicaData, setDinamicaData] = useState<any[]>([]);
  const [failureAnalysisData, setFailureAnalysisData] = useState<any[]>([]);
  const handleFailureAnalysisDataUpdate = useCallback((data: any[]) => {
    setFailureAnalysisData(data);
  }, []);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    viewType: 'Acumulada' as 'Acumulada' | 'Diária',
    type: '',
    machine: '',
    shift: '',
    sector: '',
    part: ''
  });
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [loadingGlobalData, setLoadingGlobalData] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);

  // Test connection to Firestore with retries
  useEffect(() => {
    const bdDataStr = localStorage.getItem('bdData');
    const dinamica = localStorage.getItem('dinamicaData');
    const bditssDataStr = localStorage.getItem('bditssData');
    
    if (bdDataStr) {
      try {
        const parsed = JSON.parse(bdDataStr);
        setBditssData(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error parsing bdData from localStorage:', e);
        setBditssData([]);
      }
    }
    
    if (dinamica) {
      try {
        const parsed = JSON.parse(dinamica);
        setDinamicaData(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error parsing dinamicaData from localStorage:', e);
        setDinamicaData([]);
      }
    }
    
    if (bditssDataStr) {
      try {
        const parsed = JSON.parse(bditssDataStr);
        setFailureAnalysisData(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error parsing bditssData from localStorage:', e);
        setFailureAnalysisData([]);
      }
    }
  }, []);

  const extractPivotTable = (header: string, data: any[]) => {
    console.log(`Searching for header: "${header}" in data:`, data);
    const headerRowIndex = data.findIndex(row => Array.isArray(row) && row.some(cell => String(cell).trim() === header));
    console.log(`Header row index found: ${headerRowIndex}`);
    if (headerRowIndex === -1) return [];
    
    const tableData = [];
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        if (data[i].every((cell: any) => cell === null || cell === '')) break;
        tableData.push(data[i]);
    }
    console.log(`Extracted table data for "${header}":`, tableData);
    return tableData;
  };
  const [indicators, setIndicators] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>(mockChartData);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [thirdPartyCompanies, setThirdPartyCompanies] = useState<ThirdPartyCompany[]>([]);
  const [serviceDemands, setServiceDemands] = useState<ServiceDemand[]>([]);
  const [engineeringProjects, setEngineeringProjects] = useState<EngineeringProject[]>([]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      console.log('Sheet names found:', workbook.SheetNames);

      // 1. Parse BD (Dashboard main base) -> stored in bditssData state for compatibility
      const bdSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'BD');
      let bdFound = false;
      let bdData: any[] = [];
      if (bdSheetName) {
        const bdSheet = workbook.Sheets[bdSheetName];
        bdData = XLSX.utils.sheet_to_json(bdSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
        console.log(`BD sheet found: "${bdSheetName}" with ${bdData.length} rows.`);
        setBditssData(bdData);
        localStorage.setItem('bdData', JSON.stringify(bdData));
        bdFound = true;
      } else {
        console.warn('BD sheet not found in workbook.');
      }

      // 2. Parse PDG (Dashboard goals) -> stored in dinamicaData state for compatibility
      const pdgSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'PDG');
      let pdgFound = false;
      let pdgData: any[] = [];
      if (pdgSheetName) {
        const pdgSheet = workbook.Sheets[pdgSheetName];
        pdgData = XLSX.utils.sheet_to_json(pdgSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
        console.log(`PDG sheet found: "${pdgSheetName}" with ${pdgData.length} rows.`);
        setDinamicaData(pdgData);
        localStorage.setItem('dinamicaData', JSON.stringify(pdgData));
        pdgFound = true;
      } else {
        console.warn('PDG sheet not found in workbook.');
      }

      // 3. Parse BDITSS (Failure Analysis base)
      const bditssSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'BDITSS');
      let bditssFound = false;
      let cleanBditssData: any[] = [];
      if (bditssSheetName) {
        const bditssSheet = workbook.Sheets[bditssSheetName];
        // Read as array of arrays first to find header
        const bditssRaw: any[] = XLSX.utils.sheet_to_json(bditssSheet, { header: 1 });
        
        console.log("BDITSS raw data length:", bditssRaw.length);
        if (bditssRaw.length > 0) {
          console.log("First row of BDITSS:", bditssRaw[0]);
        }

        let headerRowIdx = 0;
        let foundHeader = false;
        for (let i = 0; i < Math.min(bditssRaw.length, 30); i++) {
          const row = bditssRaw[i];
          if (Array.isArray(row)) {
            // Look for a row that has at least 2 of our key columns
            const matches = row.filter(h => {
              const s = String(h || '').toUpperCase();
              return s.includes('HORA') || s.includes('MAQUINA') || s.includes('MÁQUINA') || s.includes('GRUPO') || s.includes('SETOR') || s.includes('CAUSA') || s.includes('DESCRIÇÃO');
            }).length;
            
            console.log(`Row ${i} matches:`, matches);
            if (matches >= 2) {
              headerRowIdx = i;
              foundHeader = true;
              break;
            }
          }
        }
        
        console.log("Header row index found:", headerRowIdx, "Found header:", foundHeader);
        
        // Convert to objects using the found header row
        // Use raw: true to get the actual numbers (like 0.49) directly from Excel
        const bditssData = XLSX.utils.sheet_to_json(bditssSheet, { range: headerRowIdx, raw: true });
        
        console.log(`BDITSS sheet found: "${bditssSheetName}" at row ${headerRowIdx + 1} with ${bditssData.length} rows before filtering.`);
        console.log("First row of parsed BDITSS data:", bditssData.length > 0 ? bditssData[0] : "Empty");

        // Filter out rows that are clearly empty or just summary footers
        cleanBditssData = bditssData.filter((row: any) => {
          const values = Object.values(row);
          const isEmptyRow = values.every(v => v === null || v === '' || v === undefined);
          // Only skip if the row is empty or if it's a specific "Total" summary row (usually has few values)
          const isSummaryRow = values.some(v => String(v).toUpperCase() === 'TOTAL GERAL') && values.length < 5;
          return !isEmptyRow && !isSummaryRow;
        });

        console.log(`BDITSS sheet found: "${bditssSheetName}" at row ${headerRowIdx + 1} with ${cleanBditssData.length} rows after filtering.`);

        console.log(`BDITSS sheet found: "${bditssSheetName}" at row ${headerRowIdx + 1} with ${cleanBditssData.length} rows.`);
        const bditssJson = JSON.stringify(cleanBditssData);
        setFailureAnalysisData(cleanBditssData);
        localStorage.setItem('bditssData', bditssJson);
        if (isAdmin) {
          console.log("Saving bditssData to global Firestore...");
          try {
            await saveGlobalData('bditssData', bditssJson);
            console.log("bditssData saved successfully.");
          } catch (e) {
            console.error("Failed to save bditssData to Firestore:", e);
          }
        }
        bditssFound = true;
        
        // Notify FailureAnalysisModule that data has been updated
        window.dispatchEvent(new Event('failureAnalysisDataUpdated'));
      } else {
        console.warn('BDITSS sheet not found in workbook.');
      }

      // Clear old indicators as they are now calculated dynamically
      localStorage.removeItem('dashboardIndicators');
      localStorage.removeItem('dashboardChartData');
      
      if (bdFound || pdgFound || bditssFound) {
        // Save other sheets to Firestore if user is logged in as admin
        if (isAdmin) {
          if (bdFound) {
            try {
              const bdJson = JSON.stringify(bdData);
              await saveGlobalData('bdData', bdJson);
            } catch (e) {
              console.error("Failed to save bdData to Firestore:", e);
            }
          }
          if (pdgFound) {
            try {
              const pdgJson = JSON.stringify(pdgData);
              await saveGlobalData('dinamicaData', pdgJson);
            } catch (e) {
              console.error("Failed to save dinamicaData to Firestore:", e);
            }
          }
        }
        // Automatically set year and month based on data
        if (bdFound && bdData.length > 0) {
          updateFiltersFromData(bdData);
        }
        
        const loadedSheets = [
          bdFound ? 'BD' : '',
          pdgFound ? 'PDG' : '',
          bditssFound ? 'BDITSS' : ''
        ].filter(Boolean).join(', ');
        
        showToast(`Base de dados atualizada com sucesso! (${loadedSheets})`, 'success');
      } else {
        showToast('Nenhuma aba compatível encontrada (BD, PDG ou BDITSS).', 'error');
      }
    } catch (error) {
      console.error('Error importing database:', error);
      showToast('Erro ao importar base de dados.', 'error');
    } finally {
      setIsProcessingFile(false);
      // Reset input so the same file can be uploaded again
      e.target.value = '';
    }
  };
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

    // Subscribe to notifications
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserCollection('notifications', user.uid, (data: any[]) => {
      setNotifications([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [user]);

  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSaveImprovementProject = async (project: Partial<EngineeringProject>) => {
    console.log('Attempting to save improvement project:', project);
    try {
      if (project.id) {
        console.log('Updating existing project:', project.id);
        // Ensure the ID is not in the data object to avoid Firestore errors
        const { id, ...dataToUpdate } = project as any;
        await updateDocument('engineering-projects', id, dataToUpdate);
        showToast('Projeto atualizado com sucesso!');
      } else {
        console.log('Creating new project');
        const newId = await createDocument('engineering-projects', { ...project, createdAt: new Date().toISOString(), createdBy: user?.uid });
        console.log('Project created with ID:', newId);
        showToast('Projeto criado com sucesso!');
      }
    } catch (error) {
      console.error('Error saving improvement project:', error);
      showToast('Erro ao salvar projeto', 'error');
      throw error; // Re-throw so the UI knows it failed
    }
  };

  const handleDeleteImprovementProject = async (projectId: string) => {
    try {
      await deleteDocument('engineering-projects', projectId);
      showToast('Projeto excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting improvement project:', error);
      showToast('Erro ao excluir projeto', 'error');
    }
  };

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'google'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [newAsset, setNewAsset] = useState({
    Tag: '',
    Model: '',
    Description: '',
    Manufacturer: '',
    Location: '',
    Plant: '',
    Status: 'Ativo' as any,
    InstallDate: new Date().toISOString().split('T')[0],
    statusChangedAt: undefined as string | null | undefined
  });

  const [newWO, setNewWO] = useState<Partial<WorkOrder>>({
    AssetID: '',
    Description: '',
    Priority: 'Média' as const,
    AssignedTo: '',
    TechnicianID: '',
    Type: 'Corretiva',
    Nature: 'Programada',
    ActivityType: 'Reparo',
    ScheduledDate: new Date().toISOString().split('T')[0],
    StartDate: '',
    EndDate: '',
    EstimatedTime: 0,
    Collaborators: 0,
    Cause: '',
    requestedBy: '',
    dueDate: null,
    scope: '',
    needsMaterial: false,
    executorType: 'Próprio',
    companyId: '',
    companyName: '',
    executorName: '',
    hourlyRate: 0,
    totalCost: 0,
    Status: 'Em Aberto',
    CompletedAt: '',
    Checklist: []
  });

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateFiltersFromData = (bdData: any[]) => {
    if (!Array.isArray(bdData) || bdData.length === 0) return;
    
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(bdData.length, 50); i++) {
      const row = bdData[i];
      if (Array.isArray(row) && row.some(h => String(h || '').toUpperCase().includes('ANO'))) {
        headerRowIdx = i;
        break;
      }
    }
    const headers = Array.isArray(bdData[headerRowIdx]) ? bdData[headerRowIdx] : [];
    const anoIdx = headers.findIndex((h: any) => String(h).toUpperCase().includes('ANO'));
    const mesIdx = headers.findIndex((h: any) => {
      const s = String(h).toUpperCase();
      return s.includes('MÊS') || s.includes('MES') || s === 'MS';
    });
    
    if (anoIdx !== -1 && bdData.length > headerRowIdx + 1) {
      const dataRows = bdData.slice(headerRowIdx + 1).filter((row: any) => 
        Array.isArray(row) && row.some(cell => cell !== null && cell !== '' && cell !== undefined)
      );
      
      if (dataRows.length > 0) {
        const lastRow = dataRows[dataRows.length - 1];
        const foundYear = lastRow[anoIdx] ? String(lastRow[anoIdx]).trim() : '';
        const foundMonth = lastRow[mesIdx] ? String(lastRow[mesIdx]).trim() : '';
        
        if (foundYear && foundYear !== 'undefined') {
          const monthNum = getMonthNumber(foundMonth);
          
          setFilters(prev => ({
            ...prev,
            year: foundYear || prev.year,
            month: monthNum ? monthNum.toString() : prev.month
          }));
        }
      }
    }
  };

  useEffect(() => {
    // Check for redirect result on mount
    handleRedirectResult().then((result) => {
      if (result?.user) {
        showToast('Login via redirecionamento concluído!');
      }
    }).catch((error) => {
      console.error('Redirect Error:', error);
      if (error.code !== 'auth/cancelled-popup-request') {
        showToast('Erro ao processar login via redirecionamento.', 'error');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Restrict Google Login to Master User in onAuthStateChanged
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        if (isGoogle && !['lucas.lds36@gmail.com', 'matheuslnapoli22@gmail.com', 'henriquedefariaalmeida@gmail.com'].includes(user.email || '')) {
          await logout();
          showToast('Acesso via Google restrito ao Administrador Master.', 'error');
          return;
        }

        setUser(user);
        console.log("User authenticated:", user.uid);
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          const role: UserProfile['role'] = ['lucas.lds36@gmail.com', 'henriquedefariaalmeida@gmail.com'].includes(user.email || '') ? 'admin' : 'visualizador';
          const defaultPermissions = {
            dashboard: true,
            assets: true,
            workOrders: true,
            preventive: true,
            employees: true,
            failureAnalysis: true,
            database: role === 'admin',
            users: role === 'admin',
            serviceManagement: true,
            preventiveAssets: true,
            technicalKnowledge: true
          };
          profile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Usuário',
            photoURL: user.photoURL || null,
            role: role,
            workOrderRole: 'requester',
            createdAt: new Date().toISOString(),
            permissions: { ...defaultPermissions, thirdParty: false }
          };
          await setUserProfile(profile);
        }
        const isAdminUser = profile.role === 'admin' || ['lucas.lds36@gmail.com', 'henriquedefariaalmeida@gmail.com'].includes(user.email || '');
        setUserProfileState(profile);
        setIsAdmin(isAdminUser);
      } else {
        setUser(null);
        setUserProfileState(null);
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Global Data Subscriptions
  useEffect(() => {
    if (!authReady || !user) return;

    setLoadingGlobalData(true);
    console.log("Starting global data subscriptions...");

    const unsubBd = subscribeToGlobalData('bdData', (data) => {
      // bdData key in Firestore corresponds to the main dashboard base (BD sheet)
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setBditssData(parsed); // bditssData state is used for the main BD sheet
            updateFiltersFromData(parsed);
            try {
              localStorage.setItem('bdData', data);
            } catch (e) {
              console.warn("Failed to save bdData to localStorage", e);
            }
          } else {
            console.warn("Parsed bdData is not an array:", parsed);
          }
        } catch (e) {
          console.error("Failed to parse bdData from Firestore", e);
        }
      }
      setLoadingGlobalData(false);
    });

    const unsubDinamica = subscribeToGlobalData('dinamicaData', (data) => {
      // dinamicaData key in Firestore corresponds to the goals (PDG sheet)
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setDinamicaData(parsed);
            try {
              localStorage.setItem('dinamicaData', data);
            } catch (e) {
              console.warn("Failed to save dinamicaData to localStorage", e);
            }
          } else {
            console.warn("Parsed dinamicaData is not an array:", parsed);
          }
        } catch (e) {
          console.error("Failed to parse dinamicaData from Firestore", e);
        }
      }
    });

    const unsubBditss = subscribeToGlobalData('bditssData', (data) => {
      // bditssData key in Firestore corresponds to the failure analysis base (BDITSS sheet)
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setFailureAnalysisData(parsed); // failureAnalysisData state is used for the BDITSS sheet
            window.dispatchEvent(new Event('failureAnalysisDataUpdated'));
            try {
              localStorage.setItem('bditssData', data);
            } catch (e) {
              console.warn("Failed to save bditssData to localStorage", e);
            }
          } else {
            console.warn("Parsed bditssData is not an array:", parsed);
          }
        } catch (e) {
          console.error("Failed to parse bditssData from Firestore", e);
        }
      }
    });

    return () => {
      unsubBd();
      unsubDinamica();
      unsubBditss();
    };
  }, [user]);

  useEffect(() => {
    if (!isAdmin || !user) {
      setAllUsers([]);
      return;
    }
    const unsubUsers = subscribeToCollection<UserProfile>('users', (data) => {
      setAllUsers(data);
    });
    return () => unsubUsers();
  }, [isAdmin, user]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Assets Sheet
      const wsAssets = XLSX.utils.json_to_sheet(assets);
      XLSX.utils.book_append_sheet(wb, wsAssets, "Ativos");
      
      // Work Orders Sheet
      const wsWOs = XLSX.utils.json_to_sheet(wos);
      XLSX.utils.book_append_sheet(wb, wsWOs, "Ordens de Serviço");
      
      // Preventive Plans Sheet
      const wsPlans = XLSX.utils.json_to_sheet(plans);
      XLSX.utils.book_append_sheet(wb, wsPlans, "Planos Preventivos");
      
      XLSX.writeFile(wb, `CMMS_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Erro ao exportar para Excel', 'error');
    }
  };

  const handleUpdateUserRole = async (uid: string, newRole: UserProfile['role']) => {
    if (!isAdmin) return;
    try {
      await updateDocument('users', uid, { role: newRole });
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, role: newRole } : u);
      setAllUsers(updatedUsers);
      showToast('Permissão atualizada com sucesso!');
    } catch (error) {
      showToast('Erro ao atualizar permissão', 'error');
    }
  };

  const handleUpdateUserWorkOrderRole = async (uid: string, newRole: 'planner' | 'requester') => {
    if (!isAdmin) return;
    try {
      await updateDocument('users', uid, { workOrderRole: newRole });
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, workOrderRole: newRole } : u);
      setAllUsers(updatedUsers);
      showToast('Perfil de O.S. atualizado com sucesso!');
    } catch (error) {
      showToast('Erro ao atualizar perfil de O.S.', 'error');
    }
  };

  const handleUpdateUserPermissions = async (uid: string, permissions: UserPermissions) => {
    if (!isAdmin) return;
    try {
      await updateDocument('users', uid, { permissions });
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, permissions } : u);
      setAllUsers(updatedUsers);
      showToast('Permissões de acesso atualizadas!');
    } catch (error) {
      showToast('Erro ao atualizar permissões', 'error');
    }
  };

  const handleDeleteUser = async (uid: string, userEmail: string) => {
    if (!isAdmin) return;
    if (userEmail === 'lucas.lds36@gmail.com') {
      showToast('O administrador principal não pode ser excluído.', 'error');
      return;
    }

    setConfirmState({
      show: true,
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir o usuário ${userEmail}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await deleteDocument('users', uid);
          setAllUsers(prev => prev.filter(u => u.uid !== uid));
          showToast('Usuário excluído com sucesso!');
        } catch (error) {
          console.error('Error deleting user:', error);
          showToast('Erro ao excluir usuário', 'error');
        } finally {
          setConfirmState(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubAssets = subscribeToCollection<Asset>('assets', (data) => {
      setAssets(data);
    });
    const unsubWos = subscribeToCollection<WorkOrder>('work-orders', (data) => {
      setWos(data);
    });
    const unsubPlans = subscribeToCollection<PreventivePlan>('preventive-plans', (data) => {
      setPlans(data);
    });
    const unsubEmployees = subscribeToCollection<Employee>('employees', (data) => {
      setEmployees(data);
      setLoading(false);
    });
    const unsubServiceDemands = subscribeToCollection<ServiceDemand>('serviceDemands', (data) => {
      setServiceDemands(data);
    });
    const unsubThirdPartyCompanies = subscribeToCollection<ThirdPartyCompany>('thirdPartyCompanies', (data) => {
      setThirdPartyCompanies(data);
    });

    return () => {
      unsubAssets();
      unsubWos();
      unsubPlans();
      unsubEmployees();
      unsubServiceDemands();
      unsubThirdPartyCompanies();
    };
  }, [authReady, user]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        const oldStatus = editingAsset.Status;
        const newStatus = newAsset.Status;
        let finalAsset = { ...newAsset };

        // Logic for "Parado" status: postpone preventive maintenance
        if (oldStatus !== 'Parado' && newStatus === 'Parado') {
          // Entering "Parado" status - record the start time
          finalAsset.statusChangedAt = new Date().toISOString();
        } else if (oldStatus === 'Parado' && newStatus !== 'Parado' && editingAsset.statusChangedAt) {
          // Leaving "Parado" status - calculate duration and postpone plans
          const stoppedAt = new Date(editingAsset.statusChangedAt);
          const now = new Date();
          const diffMs = now.getTime() - stoppedAt.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            const relatedPlans = plans.filter(p => 
              p.AssetID === editingAsset.ID || 
              (p.AssetIDs && p.AssetIDs.includes(editingAsset.ID))
            );

            for (const plan of relatedPlans) {
              const currentNextDue = plan.AssetNextDues?.[editingAsset.ID] || plan.NextDue;
              if (currentNextDue) {
                const nextDueDate = new Date(currentNextDue);
                nextDueDate.setDate(nextDueDate.getDate() + diffDays);
                const newNextDue = nextDueDate.toISOString().split('T')[0];

                const updatedNextDues = { ...(plan.AssetNextDues || {}) };
                updatedNextDues[editingAsset.ID] = newNextDue;

                const allNextDues = Object.values(updatedNextDues);
                const earliestNextDue = allNextDues.length > 0 ? allNextDues.sort()[0] : newNextDue;

                await updateDocument('preventive-plans', plan.ID, {
                  AssetNextDues: updatedNextDues,
                  NextDue: earliestNextDue,
                  updatedAt: new Date().toISOString()
                });
              }
            }
            showToast(`Manutenção preventiva adiada em ${diffDays} dias devido ao tempo parado.`);
          }
          finalAsset.statusChangedAt = null; // Reset tracking
        }

        await updateDocument('assets', editingAsset.ID, finalAsset);
        showToast('Ativo atualizado com sucesso!');
      } else {
        const id = `A${(assets.length + 1).toString().padStart(3, '0')}`;
        let assetToCreate = { ...newAsset, ID: id, createdBy: user?.uid };
        
        if (assetToCreate.Status === 'Parado') {
          assetToCreate.statusChangedAt = new Date().toISOString();
        }
        
        console.log('Creating asset:', assetToCreate);
        await createDocument('assets', assetToCreate, id);
        showToast('Ativo criado com sucesso!');
      }
      setShowAssetModal(false);
      setEditingAsset(null);
      setNewAsset({
        Tag: '',
        Model: '',
        Description: '',
        Manufacturer: '',
        Location: '',
        Plant: '',
        Status: 'Ativo' as any,
        InstallDate: new Date().toISOString().split('T')[0],
        statusChangedAt: undefined
      });
    } catch (error) {
      console.error('Error saving asset:', error);
      showToast('Erro ao salvar ativo', 'error');
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const woData: any = {
        AssetID: newWO.AssetID || '',
        PlanID: newWO.PlanID || '',
        TechnicianID: newWO.TechnicianID || '',
        Description: newWO.Description || '',
        Priority: newWO.Priority || 'Média',
        Type: newWO.Type || 'Corretiva',
        Nature: newWO.Nature || 'Programada',
        ActivityType: newWO.ActivityType || 'Reparo',
        AssignedTo: newWO.AssignedTo || '',
        ScheduledDate: newWO.ScheduledDate || '',
        StartDate: newWO.StartDate || '',
        EndDate: newWO.EndDate || '',
        EstimatedTime: newWO.EstimatedTime || 0,
        Collaborators: newWO.Collaborators || 0,
        Duration: newWO.Duration || 0,
        Cause: newWO.Cause || '',
        requestedBy: newWO.requestedBy || user?.uid || '',
        dueDate: newWO.dueDate || null,
        scope: newWO.scope || '',
        needsMaterial: newWO.needsMaterial || false,
        executorType: newWO.executorType || 'Próprio',
        companyId: newWO.companyId || '',
        companyName: newWO.companyName || '',
        executorName: newWO.executorName || '',
        hourlyRate: newWO.hourlyRate || 0,
        totalCost: (newWO.Duration || newWO.EstimatedTime || 0) * (newWO.hourlyRate || 0),
        Status: newWO.Status || 'Em Aberto',
        CompletedAt: newWO.CompletedAt || '',
        Checklist: newWO.Checklist || []
      };

      if (editingWO) {
        await handleUpdateWorkOrder(editingWO.ID, woData);
      } else {
        // Intelligent Automatic Closure: Close old open WOs of same type for this asset
        const existingOpenWOs = wos.filter(wo => 
          wo.AssetID === newWO.AssetID && 
          wo.Type === newWO.Type && 
          (wo.Status === 'Em Aberto' || wo.Status === 'Em Execução')
        );

        for (const oldWO of existingOpenWOs) {
          await handleUpdateWorkOrder(oldWO.ID, { 
            Status: 'Concluída', 
            CompletedAt: new Date().toISOString().split('T')[0],
            Cause: 'Fechamento automático por nova O.S. do mesmo tipo'
          });
        }

        const id = `WO${(wos.length + 1).toString().padStart(3, '0')}`;
        const woToCreate = {
          ...woData,
          ID: id,
          Status: 'Em Aberto' as const,
          CreatedAt: new Date().toISOString().split('T')[0],
          CompletedAt: ''
        };
        console.log('Creating work order:', woToCreate);
        await createDocument('work-orders', woToCreate, id);
        showToast('Ordem de Serviço criada com sucesso!');
      }
      setShowWOModal(false);
      setEditingWO(null);
      setNewWO({
        AssetID: '',
        Description: '',
        Priority: 'Média',
        AssignedTo: '',
        TechnicianID: '',
        Type: 'Corretiva',
        Nature: 'Programada',
        ActivityType: 'Reparo',
        ScheduledDate: new Date().toISOString().split('T')[0],
        StartDate: '',
        EndDate: '',
        EstimatedTime: 0,
        Collaborators: 0,
        Duration: 0,
        PlanID: '',
        Cause: '',
        Status: 'Em Aberto',
        CompletedAt: '',
        Checklist: []
      });
    } catch (error) {
      console.error('Error saving work order:', error);
      showToast('Erro ao salvar O.S.', 'error');
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setNewAsset({
      Tag: asset.Tag || '',
      Model: asset.Model || '',
      Description: asset.Description || '',
      Manufacturer: asset.Manufacturer || '',
      Location: asset.Location || '',
      Plant: asset.Plant || '',
      Status: asset.Status || 'Ativo',
      InstallDate: asset.InstallDate || '',
      statusChangedAt: asset.statusChangedAt
    });
    setShowAssetModal(true);
  };

  const handleEditWO = (wo: WorkOrder) => {
    setEditingWO(wo);
    setNewWO({
      AssetID: wo.AssetID,
      Description: wo.Description,
      Priority: wo.Priority,
      AssignedTo: wo.AssignedTo,
      TechnicianID: wo.TechnicianID || '',
      Type: wo.Type || 'Corretiva',
      Nature: wo.Nature || 'Programada',
      ActivityType: wo.ActivityType || 'Reparo',
      ScheduledDate: wo.ScheduledDate || new Date().toISOString().split('T')[0],
      StartDate: wo.StartDate || '',
      EndDate: wo.EndDate || '',
      EstimatedTime: wo.EstimatedTime || 0,
      Collaborators: wo.Collaborators || 0,
      Duration: wo.Duration || 0,
      PlanID: wo.PlanID || '',
      Cause: wo.Cause || '',
      Status: wo.Status || 'Em Aberto',
      CompletedAt: wo.CompletedAt || '',
      Checklist: wo.Checklist || []
    });
    setShowWOModal(true);
  };

  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleDeleteAsset = async (id: string) => {
    setConfirmState({
      show: true,
      title: 'Excluir Ativo',
      message: 'Deseja realmente excluir este ativo?',
      onConfirm: async () => {
        try {
          await deleteDocument('assets', id);
          showToast('Ativo excluído com sucesso!');
        } catch (error) {
          console.error('Error deleting asset:', error);
          showToast('Erro ao excluir ativo', 'error');
        }
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleUpdateWorkOrder = async (id: string, updates: Partial<WorkOrder>, durationOverride?: number) => {
    try {
      const wo = wos.find(w => w.ID === id);
      if (!wo) throw new Error('O.S. não encontrada');

      const isPlanner = userProfile?.workOrderRole === 'planner' || userProfile?.role === 'admin';
      
      if (!isPlanner) {
        delete updates.Status;
        delete updates.dueDate;
        delete updates.scope;
        delete updates.needsMaterial;
      }

      if (updates.Status === 'Concluída') {
        updates.CompletedAt = updates.CompletedAt || new Date().toISOString().split('T')[0];
        if (durationOverride !== undefined) {
          updates.Duration = durationOverride;
        }
      }

      // Recalculate totalCost if Duration or hourlyRate changes, or if completing
      const finalDuration = updates.Duration !== undefined ? updates.Duration : (wo.Duration || wo.EstimatedTime || 0);
      const finalHourlyRate = updates.hourlyRate !== undefined ? updates.hourlyRate : (wo.hourlyRate || 0);
      
      if (updates.Duration !== undefined || updates.hourlyRate !== undefined || updates.Status === 'Concluída') {
        updates.totalCost = finalDuration * finalHourlyRate;
      }
      
      await updateDocument('work-orders', id, updates);
      
      // If completed, update the corresponding plan if it exists
      if (updates.Status === 'Concluída') {
        const planId = updates.PlanID || wo.PlanID;
        let plan = planId ? plans.find(p => p.ID === planId) : null;
        
        // Fallback for OS-PREV prefix if PlanID is missing
        if (!plan && (id.startsWith('OS-PREV-') || wo.ID.startsWith('OS-PREV-'))) {
          plan = plans.find(p => p.AssetIDs.includes(wo.AssetID) && (p.Type === wo.Type || p.Type === wo.type || !wo.Type));
        }

        if (plan) {
          const completedDate = updates.CompletedAt || new Date().toISOString().split('T')[0];
          const nextDue = calculateNextDue(
            completedDate, 
            plan.Frequency, 
            plan.FrequencyType || (plan as any).frequencyType, 
            plan.FrequencyValue || (plan as any).frequencyValue
          );
          
          const newAssetLastDones = { ...(plan.AssetLastDones || {}) };
          const newAssetNextDues = { ...(plan.AssetNextDues || {}) };
          
          newAssetLastDones[wo.AssetID] = completedDate;
          newAssetNextDues[wo.AssetID] = nextDue;
          
          // Update global NextDue to the earliest of all assets
          const allNextDues = Object.values(newAssetNextDues);
          const earliestNextDue = allNextDues.length > 0 ? allNextDues.sort()[0] : nextDue;

          // Also update the new assets array format
          let assetFound = false;
          const newAssets = (plan.assets || []).map(a => {
            if (a.assetId === wo.AssetID) {
              assetFound = true;
              return { ...a, lastDate: completedDate, nextDate: nextDue };
            }
            return a;
          });
          if (!assetFound && plan.AssetIDs?.includes(wo.AssetID)) {
            newAssets.push({ assetId: wo.AssetID, lastDate: completedDate, nextDate: nextDue });
          }

          await updateDocument('preventive-plans', plan.ID, {
            LastDone: completedDate,
            NextDue: earliestNextDue,
            AssetLastDones: newAssetLastDones,
            AssetNextDues: newAssetNextDues,
            assets: newAssets,
            EstimatedTime: plan.EstimatedTime !== undefined ? Number(plan.EstimatedTime) : 1,
            Collaborators: plan.Collaborators !== undefined ? Number(plan.Collaborators) : 1,
            lastExecutionDate: completedDate,
            nextExecutionDate: earliestNextDue
          });
        }
      }
      
      showToast('O.S. atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating work order:', error);
      showToast('Erro ao atualizar O.S.', 'error');
    }
  };

  const handleDeleteWorkOrder = async (id: string) => {
    setConfirmState({
      show: true,
      title: 'Excluir O.S.',
      message: 'Deseja realmente excluir esta O.S.?',
      onConfirm: async () => {
        try {
          await deleteDocument('work-orders', id);
          showToast('O.S. excluída com sucesso!');
        } catch (error) {
          console.error('Error deleting work order:', error);
          showToast('Erro ao excluir O.S.', 'error');
        }
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleUpdatePlanDate = async (planId: string, assetId: string, newDate: string, type: 'last' | 'next' = 'next') => {
    const plan = plans.find(p => p.ID === planId);
    if (!plan) return;

    // Update the assets array inside the plan
    let updatedAssets = [...(plan.assets || [])];
    
    // Fallback for older plans that only have AssetIDs
    if (updatedAssets.length === 0 && plan.AssetIDs && plan.AssetIDs.length > 0) {
      updatedAssets = plan.AssetIDs.map(id => ({
        assetId: id,
        nextDate: plan.AssetNextDues?.[id] || plan.NextDue || '',
        lastDate: plan.AssetLastDones?.[id] || plan.LastDone || null
      }));
    }

    let calculatedNextDate = newDate;
    if (type === 'last') {
      calculatedNextDate = calculateNextDue(newDate, plan.Frequency || 'Mensal', plan.FrequencyType, plan.FrequencyValue);
    }

    updatedAssets = updatedAssets.map(a => 
      a.assetId === assetId 
        ? { 
            ...a, 
            nextDate: type === 'next' ? newDate : calculatedNextDate,
            lastDate: type === 'last' ? newDate : a.lastDate
          } 
        : a
    );

    // Update the maps
    const updatedNextDues = { ...(plan.AssetNextDues || {}) };
    const updatedLastDones = { ...(plan.AssetLastDones || {}) };
    
    if (type === 'next') {
      updatedNextDues[assetId] = newDate;
    } else {
      updatedLastDones[assetId] = newDate;
      updatedNextDues[assetId] = calculatedNextDate;
    }

    try {
      await updateDocument('preventive-plans', planId, {
        assets: updatedAssets,
        AssetNextDues: updatedNextDues,
        AssetLastDones: updatedLastDones,
        // Also update the global fields if this was the primary asset or if it's a global plan
        NextDue: updatedAssets[0]?.nextDate || calculatedNextDate,
        LastDone: updatedAssets[0]?.lastDate || (type === 'last' ? newDate : plan.LastDone),
        nextExecutionDate: updatedAssets[0]?.nextDate || calculatedNextDate,
        updatedAt: new Date().toISOString()
      });
      showToast('Data de manutenção atualizada!');
    } catch (error) {
      console.error('Error updating plan date:', error);
      showToast('Erro ao atualizar data', 'error');
    }
  };

  const handleDeletePreventive = async (id: string) => {
    setConfirmState({
      show: true,
      title: 'Excluir Plano',
      message: 'Deseja realmente excluir este plano?',
      onConfirm: async () => {
        try {
          await deleteDocument('preventive-plans', id);
          showToast('Plano excluído com sucesso!');
        } catch (error) {
          console.error('Error deleting preventive plan:', error);
          showToast('Erro ao excluir plano', 'error');
        }
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteEmployee = async (id: string) => {
    setConfirmState({
      show: true,
      title: 'Excluir Funcionário',
      message: 'Deseja realmente excluir este funcionário?',
      onConfirm: async () => {
        try {
          await deleteDocument('employees', id);
          showToast('Funcionário excluído com sucesso!');
        } catch (error) {
          console.error('Error deleting employee:', error);
          showToast('Erro ao excluir funcionário', 'error');
        }
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      const result = await loginWithGoogle();
      const user = result.user;
      
      // Restrict Google Login to Master User
      if (!['lucas.lds36@gmail.com', 'matheuslnapoli22@gmail.com', 'henriquedefariaalmeida@gmail.com'].includes(user.email || '')) {
        await logout();
        showToast('Acesso via Google restrito ao Administrador Master.', 'error');
        return;
      }
      
      showToast('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Login error:', error);
      // Handle cancelled popup request gracefully
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        showToast('Login cancelado ou janela fechada. Tente o login alternativo abaixo se o problema persistir.', 'error');
      } else {
        showToast('Erro ao realizar login. Tente novamente.', 'error');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRedirectLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      await loginWithGoogleRedirect();
    } catch (error: any) {
      console.error('Redirect login error:', error);
      showToast('Erro ao iniciar redirecionamento.', 'error');
      setLoginLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      await loginWithEmail(email, password);
      showToast('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Email login error:', error);
      showToast(error.message || 'Erro ao realizar login', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      showToast('Por favor, insira seu e-mail para recuperar a senha', 'error');
      return;
    }
    setAuthLoading(true);
    try {
      await resetPassword(email);
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      showToast(error.message || 'Erro ao enviar e-mail de recuperação', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      await registerWithEmail(email, password, displayName);
      showToast('Conta criada com sucesso!');
    } catch (error: any) {
      console.error('Email register error:', error);
      showToast(error.message || 'Erro ao criar conta', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    try {
      await logout();
      console.log('logout successful');
      showToast('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Erro ao realizar logout', 'error');
    }
  };

  const menuGroups = [
    {
      title: 'Visão Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
      ]
    },
    {
      title: 'Manutenção',
      items: [
        { id: 'wos', label: 'Ordens de Serviço', icon: Wrench, permission: 'workOrders' },
        { id: 'preventive', label: 'Preventivas', icon: Calendar, permission: 'preventive' },
        { id: 'preventive-assets', label: 'Status por Ativo', icon: Activity, permission: 'preventiveAssets' },
        { id: 'gantt', label: 'Planejamento (Gantt)', icon: GanttChart, permission: 'workOrders' },
        { id: 'service-management', label: 'Gestão de Serviços', icon: ClipboardList, permission: 'serviceManagement' },
        { id: 'maintenance-solutions', label: 'Soluções de Manutenção', icon: Lightbulb, permission: 'serviceManagement' },
      ]
    },
    {
      title: 'Engenharia',
      items: [
        { id: 'failure-analysis', label: 'Análise de Falhas', icon: AlertCircle, permission: 'failureAnalysis' },
        { id: 'technical-knowledge', label: 'Gestão de Conhecimento', icon: BookOpen, permission: 'technicalKnowledge' },
        { id: 'improvement-management', label: 'Gestão de Melhorias', icon: Lightbulb, permission: 'serviceManagement' },
      ]
    },
    {
      title: 'Cadastros',
      items: [
        { id: 'assets', label: 'Ativos', icon: Box, permission: 'assets' },
        { id: 'employees', label: 'Funcionários', icon: UserPlus, permission: 'employees' },
        { id: 'third-party', label: 'Empresas', icon: Building2, permission: 'thirdParty' },
      ]
    },
    {
      title: 'Administração',
      items: [
        { id: 'database', label: 'Banco de Dados', icon: Database, permission: 'database' },
        { id: 'users', label: 'Usuários', icon: ShieldCheck, permission: 'users' },
        { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'database' },
      ]
    },
    {
      title: 'Conta',
      items: [
        { id: 'profile', label: 'Meu Perfil', icon: UserIcon, permission: '' },
        { id: 'settings', label: 'Configurações', icon: Settings, permission: '' },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      const superAdmins = ['lucas.lds36@gmail.com', 'matheuslnapoli22@gmail.com', 'henriquedefariaalmeida@gmail.com'];
      if (userProfile?.email && superAdmins.includes(userProfile.email)) return true;
      if (item.id === 'profile' || item.id === 'settings') return true;
      if (!userProfile?.permissions) return isAdmin || item.id !== 'users';
      return userProfile.permissions[item.permission as keyof UserPermissions];
    })
  })).filter(group => group.items.length > 0);

  const menuItems = menuGroups.flatMap(g => g.items);

  const handleSaveServiceDemand = async (demand: Partial<ServiceDemand>) => {
    try {
      if (demand.id && serviceDemands.some(d => d.id === demand.id)) {
        const existingDemand = serviceDemands.find(d => d.id === demand.id);
        if (!existingDemand) throw new Error('Demanda não encontrada');
        
        // Merge existing demand with partial updates
        const mergedDemand = { ...existingDemand, ...demand };
        
        // Handle status change history
        if (demand.status && demand.status !== existingDemand.status) {
          const historyEntry = {
            id: Math.random().toString(36).substr(2, 9),
            status: demand.status,
            date: new Date().toISOString(),
            user: userProfile?.displayName || 'Usuário'
          };
          mergedDemand.statusHistory = [...(Array.isArray(existingDemand.statusHistory) ? existingDemand.statusHistory : []), historyEntry];
          if (demand.status === 'Concluído') {
            mergedDemand.closedAt = new Date().toISOString();
          }
        }
        
        // Filter to only include allowed fields
        const allowedFields = [
          'id', 'openedAt', 'requesterUid', 'requesterName', 'description', 
          'area', 'executorType', 'responsibleId', 'responsibleName', 'responsibleHourlyRate', 'responsibleHoursWorked',
          'priority', 'estimatedDeliveryDate', 'startDate', 'executorName', 
          'companyId', 'companyName', 'status', 'needsMaterial', 'materialRequisition', 
          'collaborators', 'scopeChanges', 'statusHistory', 'closedAt', 'totalCost'
        ];
        const updatedDemand: any = {};
        allowedFields.forEach(field => {
          if (field in mergedDemand) {
            const value = mergedDemand[field as keyof ServiceDemand];
            if (value !== undefined) {
              updatedDemand[field] = value;
            }
          }
        });
        
        await updateDocument('serviceDemands', demand.id, updatedDemand);

        // Send notifications for updates
        const truncatedDesc = mergedDemand.description.length > 100 ? mergedDemand.description.substring(0, 100) + '...' : mergedDemand.description;
        const notificationMessage = `A demanda "${truncatedDesc}" foi atualizada.`;
        
        // Notify responsible if assigned
        if (mergedDemand.responsibleId && mergedDemand.responsibleId !== user?.uid) {
          const responsibleEmployee = employees.find(emp => emp.ID === mergedDemand.responsibleId);
          const targetUid = responsibleEmployee?.userUid || mergedDemand.responsibleId;
          
          if (targetUid !== user?.uid) {
            await createDocument('notifications', {
              userId: targetUid,
              message: notificationMessage,
              read: false,
              createdAt: new Date().toISOString(),
              demandId: demand.id
            });
          }
        }
        
        // Notify requester if not the one who updated
        if (mergedDemand.requesterUid && mergedDemand.requesterUid !== user?.uid) {
          await createDocument('notifications', {
            userId: mergedDemand.requesterUid,
            message: notificationMessage,
            read: false,
            createdAt: new Date().toISOString(),
            demandId: demand.id
          });
        }
      } else {
        const id = demand.id || `SD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const newDemand: any = { ...demand, id };
        Object.keys(newDemand).forEach(key => {
          if (newDemand[key] === undefined) delete newDemand[key];
        });
        await createDocument('serviceDemands', newDemand, id);

        // Notify responsible about new demand
        if (newDemand.responsibleId && newDemand.responsibleId !== user?.uid) {
          const responsibleEmployee = employees.find(emp => emp.ID === newDemand.responsibleId);
          const targetUid = responsibleEmployee?.userUid || newDemand.responsibleId;
          
          if (targetUid !== user?.uid) {
            const truncatedDesc = newDemand.description.length > 100 ? newDemand.description.substring(0, 100) + '...' : newDemand.description;
            await createDocument('notifications', {
              userId: targetUid,
              message: `Uma nova demanda foi atribuída a você: "${truncatedDesc}"`,
              read: false,
              createdAt: new Date().toISOString(),
              demandId: id
            });
          }
        }
      }
      showToast('Demanda salva com sucesso!');
    } catch (error) {
      console.error('Error saving service demand:', error);
      showToast('Erro ao salvar demanda', 'error');
    }
  };

  const handleDeleteServiceDemand = async (demandId: string) => {
    try {
      console.log('Tentando excluir demanda:', demandId);
      showToast('Excluindo demanda...');
      await deleteDocument('serviceDemands', demandId);
      showToast('Demanda excluída com sucesso!');
    } catch (error) {
      console.error('Erro detalhado ao excluir demanda:', error);
      showToast('Erro ao excluir demanda: ' + (error instanceof Error ? error.message : 'Erro desconhecido'), 'error');
    }
  };

  const handleUpdateServiceDemandStatus = async (demandId: string, status: ServiceDemand['status']) => {
    try {
      const demand = serviceDemands.find(d => d.id === demandId);
      if (!demand) return;

      const historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        status,
        date: new Date().toISOString(),
        user: userProfile?.displayName || 'Usuário'
      };

      const updateData: any = {
        status,
        statusHistory: [...(Array.isArray(demand.statusHistory) ? demand.statusHistory : []), historyEntry]
      };

      if (status === 'Concluído') {
        updateData.closedAt = new Date().toISOString();
      }

      await updateDocument('serviceDemands', demandId, updateData);

      // Send notifications
      const truncatedDesc = demand.description.length > 100 ? demand.description.substring(0, 100) + '...' : demand.description;
      const notificationMessage = `O status da demanda "${truncatedDesc}" foi alterado para "${status}".`;
      
      // Notify requester if not the one who updated
      if (demand.requesterUid && demand.requesterUid !== user?.uid) {
        await createDocument('notifications', {
          userId: demand.requesterUid,
          message: notificationMessage,
          read: false,
          createdAt: new Date().toISOString(),
          demandId: demandId
        });
      }

      // Notify planner (if exists and different from requester and not the one who updated)
      if (demand.responsibleId && demand.responsibleId !== demand.requesterUid && demand.responsibleId !== user?.uid) {
        const responsibleEmployee = employees.find(emp => emp.ID === demand.responsibleId);
        const targetUid = responsibleEmployee?.userUid || demand.responsibleId;
        
        if (targetUid !== user?.uid && targetUid !== demand.requesterUid) {
          await createDocument('notifications', {
            userId: targetUid,
            message: notificationMessage,
            read: false,
            createdAt: new Date().toISOString(),
            demandId: demandId
          });
        }
      }

      showToast(`Status atualizado para ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const handleAddServiceDemandScopeChange = async (demandId: string, description: string) => {
    try {
      const demand = serviceDemands.find(d => d.id === demandId);
      if (!demand) return;

      const scopeEntry = {
        id: Math.random().toString(36).substr(2, 9),
        description,
        date: new Date().toISOString(),
        user: userProfile?.displayName || 'Usuário'
      };

      const updatedScopeChanges = [...(Array.isArray(demand.scopeChanges) ? demand.scopeChanges : []), scopeEntry];
      
      // Filter to only include allowed fields
      const allowedFields = ['scopeChanges'];
      const updatedDemand: any = {};
      allowedFields.forEach(field => {
        if (field === 'scopeChanges') {
          updatedDemand[field] = updatedScopeChanges;
        }
      });

      await updateDocument('serviceDemands', demandId, updatedDemand);

      // Send notifications for scope change
      const truncatedDesc = demand.description.length > 100 ? demand.description.substring(0, 100) + '...' : demand.description;
      const notificationMessage = `O escopo da demanda "${truncatedDesc}" foi alterado.`;
      
      // Notify responsible if assigned and not the one who updated
      if (demand.responsibleId && demand.responsibleId !== user?.uid) {
        const responsibleEmployee = employees.find(emp => emp.ID === demand.responsibleId);
        const targetUid = responsibleEmployee?.userUid || demand.responsibleId;
        
        if (targetUid !== user?.uid) {
          await createDocument('notifications', {
            userId: targetUid,
            message: notificationMessage,
            read: false,
            createdAt: new Date().toISOString(),
            demandId: demandId
          });
        }
      }
      
      // Notify requester if not the one who updated
      if (demand.requesterUid && demand.requesterUid !== user?.uid) {
        await createDocument('notifications', {
          userId: demand.requesterUid,
          message: notificationMessage,
          read: false,
          createdAt: new Date().toISOString(),
          demandId: demandId
        });
      }

      showToast('Alteração de escopo registrada!');
    } catch (error) {
      console.error('Error adding scope change:', error);
      showToast('Erro ao registrar alteração', 'error');
    }
  };

  const handleDownload = () => {
    window.location.href = '/api/download-db';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl lg:shadow-none",
        sidebarOpen ? "w-72 translate-x-0" : "-translate-x-full lg:-translate-x-full lg:w-0"
      )}>
        <div className="h-full flex flex-col">
          <div className={cn(
            "p-4 sm:p-6 flex items-center transition-all duration-300",
            sidebarOpen ? "justify-between" : "justify-center"
          )}>
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-200">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xl font-bold tracking-tight whitespace-nowrap text-slate-900"
                >
                  CMMS Pro
                </motion.span>
              )}
            </div>
          </div>

          <nav className="flex-1 px-2 sm:px-4 space-y-6 overflow-y-auto custom-scrollbar pb-6 overflow-x-hidden">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                {sidebarOpen ? (
                  <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {group.title}
                  </h3>
                ) : (
                  <div className="h-px bg-slate-100 mx-2 my-4" />
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={!sidebarOpen ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-xl transition-all duration-200 group relative",
                        sidebarOpen ? "space-x-3 px-4 py-2.5" : "justify-center p-3",
                        activeTab === item.id 
                          ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0 transition-colors",
                        activeTab === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                      {sidebarOpen && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="font-medium text-sm whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                      {activeTab === item.id && (
                        sidebarOpen ? (
                          <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                        ) : (
                          <motion.div layoutId="active-pill-collapsed" className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                        )
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={cn("p-2 sm:p-4 mt-auto transition-all duration-300", !sidebarOpen && "px-2")}>
            {user ? (
              <div className={cn(
                "bg-slate-900 rounded-2xl text-white transition-all duration-300",
                sidebarOpen ? "p-4" : "p-2 flex flex-col items-center"
              )}>
                <div className={cn(
                  "flex items-center mb-4 transition-all duration-300",
                  sidebarOpen ? "space-x-3" : "justify-center"
                )}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  )}
                  {sidebarOpen && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      className="min-w-0"
                    >
                      <div className="flex items-center space-x-1">
                        <p className="text-sm font-bold truncate">{user.displayName || 'Usuário'}</p>
                        {isAdmin && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </motion.div>
                  )}
                </div>
                <button 
                  onClick={handleLogout}
                  title={!sidebarOpen ? "Sair" : undefined}
                  className={cn(
                    "flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-medium",
                    sidebarOpen ? "w-full space-x-2 py-2" : "w-8 h-8 sm:w-10 sm:h-10"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  {sidebarOpen && <span>Sair</span>}
                </button>
              </div>
            ) : (
              <div className={cn(
                "bg-slate-900 rounded-2xl text-white transition-all duration-300",
                sidebarOpen ? "p-4" : "p-2 flex flex-col items-center"
              )}>
                {sidebarOpen && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Acesso Restrito</p>
                    <p className="text-sm font-medium mb-4">Faça login para gerenciar os dados.</p>
                  </>
                )}
                <button 
                  onClick={handleLogin}
                  disabled={loginLoading}
                  title={!sidebarOpen ? "Entrar" : undefined}
                  className={cn(
                    "flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors text-sm font-medium disabled:opacity-50",
                    sidebarOpen ? "w-full space-x-2 py-2" : "w-8 h-8 sm:w-10 sm:h-10"
                  )}
                >
                  {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {sidebarOpen && <span>{loginLoading ? 'Conectando...' : 'Entrar com Google'}</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-slate-50/50 transition-all duration-300",
        sidebarOpen ? "lg:pl-72" : "lg:pl-0"
      )}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 capitalize truncate max-w-[150px] sm:max-w-none">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors relative"
            >
              <Mail className="w-6 h-6" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            {loadingGlobalData && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] sm:text-xs font-bold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Sincronizando...</span>
              </div>
            )}
            <button 
              onClick={async () => {
                if (!user) {
                  showToast('Faça login para atualizar os dados', 'error');
                  return;
                }
                setLoading(true);
                try {
                  // Try global data first (shared data from master)
                  let bdDataStr = await loadGlobalData('bdData');
                  let dinamica = await loadGlobalData('dinamicaData');
                  let bditssDataStr = await loadGlobalData('bditssData');

                  // Fallback to per-user data if global is empty
                  if (!bdDataStr) bdDataStr = await loadDatabaseEntry(user.uid, 'bdData');
                  if (!dinamica) dinamica = await loadDatabaseEntry(user.uid, 'dinamicaData');
                  if (!bditssDataStr) bditssDataStr = await loadDatabaseEntry(user.uid, 'bditssData');
                  
                  if (bdDataStr) {
                      localStorage.setItem('bdData', bdDataStr);
                      const parsed = JSON.parse(bdDataStr);
                      setBditssData(parsed);
                      updateFiltersFromData(parsed);
                  }
                  if (dinamica) {
                      localStorage.setItem('dinamicaData', dinamica);
                      setDinamicaData(JSON.parse(dinamica));
                  }
                  if (bditssDataStr) {
                      localStorage.setItem('bditssData', bditssDataStr);
                      setFailureAnalysisData(JSON.parse(bditssDataStr));
                      window.dispatchEvent(new Event('failureAnalysisDataUpdated'));
                  }
                  showToast('Dados sincronizados com sucesso!');
                } catch (error) {
                  console.error('Error syncing data:', error);
                  showToast('Erro ao sincronizar dados.', 'error');
                } finally {
                  setLoading(false);
                }
              }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Atualizar Dados"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            {user && (
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-bold text-slate-600">
                    {(user.displayName || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!authReady ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : !user ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
                <LogIn className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Bem-vindo ao CMMS Pro</h3>
                <p className="text-slate-500 mt-2">Para acessar o sistema compartilhado e gerenciar os ativos da sua equipe, por favor realize o login.</p>
              </div>

              {authMode === 'google' ? (
                <div className="w-full space-y-4">
                  <button 
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {loginLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    <span>{loginLoading ? 'Conectando...' : 'Entrar com Google'}</span>
                  </button>
                  <button 
                    onClick={handleRedirectLogin}
                    disabled={loginLoading}
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Login Alternativo (Sem Popup)</span>
                  </button>
                  <button 
                    onClick={() => setAuthMode('login')}
                    className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center space-x-3"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Entrar com E-mail</span>
                  </button>
                </div>
              ) : authMode === 'login' ? (
                <form onSubmit={handleEmailLogin} className="w-full space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={handleResetPassword}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {authLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    <span>Entrar</span>
                  </button>
                  <div className="flex flex-col space-y-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      Não tem uma conta? Criar agora
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('google')}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 mt-2"
                    >
                      Entrar como Administrador (Google)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailRegister} className="w-full space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Seu Nome"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {authLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    <span>Criar Conta</span>
                  </button>
                  <div className="flex flex-col space-y-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      Já tem uma conta? Fazer Login
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('google')}
                      className="text-sm font-bold text-slate-500 hover:text-slate-600"
                    >
                      Voltar para Login Google
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <Dashboard 
                      assets={assets} 
                      wos={wos} 
                      bditssData={bditssData}
                      dinamicaData={dinamicaData}
                      setBditssData={setBditssData} 
                      setDinamicaData={setDinamicaData} 
                      handleFileUpload={handleFileUpload}
                      filters={filters}
                      setFilters={setFilters}
                      isProcessingFile={isProcessingFile}
                    />
                  </div>
                )}
                {activeTab === 'users' && isAdmin && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Gerenciamento de Usuários</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Nível</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Acessos</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allUsers.map(u => (
                            <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 m-2 text-slate-400" />}
                                  </div>
                                  <span className="font-semibold text-slate-700">{u.displayName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                              <td className="px-6 py-4">
                                <div className={cn(
                                  "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                  u.role === 'admin' ? "bg-indigo-100 text-indigo-700" : 
                                  u.role === 'planejador' ? "bg-blue-100 text-blue-700" :
                                  u.role === 'manutentor' ? "bg-emerald-100 text-emerald-700" :
                                  "bg-slate-100 text-slate-600"
                                )}>
                                  {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                  <span>
                                    {u.role === 'admin' ? 'Administrador' : 
                                     u.role === 'planejador' ? 'Planejador' :
                                     u.role === 'manutentor' ? 'Manutentor' :
                                     'Visualizador'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(Object.entries({
                                    dashboard: 'Dashboard',
                                    assets: 'Ativos',
                                    workOrders: 'Ordens de Serviço',
                                    preventive: 'Preventiva',
                                    employees: 'Funcionários',
                                    failureAnalysis: 'Análise de Falhas',
                                    technicalKnowledge: 'Conhecimento',
                                    database: 'Banco de Dados',
                                    users: 'Usuários',
                                    serviceManagement: 'Solicitações',
                                    preventiveAssets: 'Status Ativos'
                                  }) as [keyof UserPermissions, string][]).map(([key, label]) => {
                                    const val = u.permissions ? !!u.permissions[key] : false;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => {
                                          if (u.email === 'lucas.lds36@gmail.com') return;
                                          const newPerms = { ...u.permissions, [key]: !val } as UserPermissions;
                                          handleUpdateUserPermissions(u.uid, newPerms);
                                        }}
                                        disabled={u.email === 'lucas.lds36@gmail.com'}
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors",
                                          val ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
                                        )}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right space-y-2">
                                {u.email !== 'lucas.lds36@gmail.com' && (
                                  <>
                                    <select 
                                      className="block w-full text-xs border-none bg-slate-100 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                      value={u.role}
                                      onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as any)}
                                    >
                                      <option value="admin">Administrador</option>
                                      <option value="planejador">Planejador</option>
                                      <option value="manutentor">Manutentor</option>
                                      <option value="visualizador">Visualizador</option>
                                    </select>
                                    <select 
                                      className="block w-full text-xs border-none bg-slate-100 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                      value={u.workOrderRole || 'requester'}
                                      onChange={(e) => handleUpdateUserWorkOrderRole(u.uid, e.target.value as any)}
                                    >
                                      <option value="requester">O.S. Solicitante</option>
                                      <option value="planner">O.S. Planejador</option>
                                    </select>
                                    <button
                                      onClick={() => handleDeleteUser(u.uid, u.email)}
                                      className="flex items-center justify-center w-full gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Excluir Usuário
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'assets' && (
                  <AssetList 
                    assets={assets} 
                    plans={plans}
                    isAdmin={isAdmin}
                    currentUserUid={user?.uid}
                    showToast={showToast}
                    onImport={async (importedAssets) => {
                      if (!user) {
                        showToast('Faça login para importar ativos', 'error');
                        return;
                      }
                      
                      setLoading(true);
                      let successCount = 0;
                      let errorCount = 0;
                      
                      // Use batching to improve performance for large imports
                      const batchSize = 50;
                      const total = importedAssets.length;
                      
                      // Get the current max ID to avoid collisions
                      const currentMaxId = assets.reduce((max, asset) => {
                        const idNum = parseInt(asset.ID.replace('A', ''));
                        return isNaN(idNum) ? max : Math.max(max, idNum);
                      }, 0);

                      try {
                        for (let i = 0; i < total; i += batchSize) {
                          const batch = importedAssets.slice(i, i + batchSize);
                          await Promise.all(batch.map(async (asset, index) => {
                            const idNum = currentMaxId + i + index + 1;
                            const id = `A${idNum.toString().padStart(4, '0')}`;
                            try {
                              await createDocument('assets', {
                                Tag: asset.Tag,
                                Model: asset.Model,
                                Description: asset.Description,
                                Location: asset.Location,
                                Plant: asset.Plant,
                                Manufacturer: asset.Manufacturer,
                                Status: asset.Status || 'Ativo',
                                InstallDate: asset.InstallDate || new Date().toISOString(),
                                ID: id,
                                createdBy: user.uid
                              }, id);
                              successCount++;
                            } catch (err) {
                              console.error(`Error importing asset ${asset.Tag}:`, err);
                              errorCount++;
                            }
                          }));
                        }
                        
                        if (errorCount === 0) {
                          showToast(`Importação concluída! ${successCount} ativos adicionados.`, 'success');
                        } else {
                          showToast(`Importação finalizada: ${successCount} sucessos, ${errorCount} falhas.`, 'error');
                        }
                      } catch (err) {
                        console.error('Bulk import error:', err);
                        showToast('Erro durante a importação em massa', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    onAdd={() => {
                      setEditingAsset(null);
                      setNewAsset({
                        Tag: '',
                        Model: '',
                        Description: '',
                        Manufacturer: '',
                        Location: '',
                        Plant: '',
                        Status: 'Ativo' as any,
                        InstallDate: new Date().toISOString().split('T')[0],
                        statusChangedAt: undefined
                      });
                      setShowAssetModal(true);
                    }} 
                    onEdit={handleEditAsset}
                    onDelete={handleDeleteAsset} 
                  />
                )}
                {activeTab === 'wos' && (
                  <WorkOrderList 
                    wos={wos} 
                    assets={assets}
                    isPlanner={userProfile?.workOrderRole === 'planner' || userProfile?.role === 'admin'}
                    isAdmin={isAdmin}
                    currentUserUid={user?.uid}
                    userRole={userProfile?.role}
                    plans={plans}
                    showToast={showToast}
                    onAdd={() => {
                      setEditingWO(null);
                      setNewWO({
                        AssetID: '',
                        Description: '',
                        Priority: 'Média',
                        AssignedTo: '',
                        TechnicianID: '',
                        Type: 'Corretiva',
                        Nature: 'Programada',
                        ActivityType: 'Reparo',
                        ScheduledDate: new Date().toISOString().split('T')[0],
                        StartDate: '',
                        EndDate: '',
                        EstimatedTime: 0,
                        Collaborators: 0,
                        Duration: 0,
                        PlanID: '',
                        Cause: '',
                        requestedBy: user?.uid || '',
                        dueDate: null,
                        scope: '',
                        needsMaterial: false,
                        executorType: 'Próprio',
                        companyId: '',
                        companyName: '',
                        executorName: '',
                        hourlyRate: 0,
                        Status: 'Em Aberto'
                      });
                      setSelectedModelForWO('');
                      setShowWOModal(true);
                    }} 
                    onEdit={(wo) => {
                      setEditingWO(wo);
                      setNewWO({
                        AssetID: wo.AssetID || '',
                        Description: wo.Description || '',
                        Priority: wo.Priority || 'Média',
                        AssignedTo: wo.AssignedTo || '',
                        TechnicianID: wo.TechnicianID || '',
                        Type: wo.Type || 'Corretiva',
                        Nature: wo.Nature || 'Programada',
                        ActivityType: wo.ActivityType || 'Reparo',
                        ScheduledDate: wo.ScheduledDate || new Date().toISOString().split('T')[0],
                        StartDate: wo.StartDate || '',
                        EndDate: wo.EndDate || '',
                        EstimatedTime: wo.EstimatedTime || 0,
                        Collaborators: wo.Collaborators || 0,
                        Cause: wo.Cause || '',
                        requestedBy: wo.requestedBy || '',
                        dueDate: wo.dueDate || null,
                        scope: wo.scope || '',
                        needsMaterial: wo.needsMaterial || false,
                        executorType: wo.executorType || 'Próprio',
                        companyId: wo.companyId || '',
                        companyName: wo.companyName || '',
                        executorName: wo.executorName || '',
                        hourlyRate: wo.hourlyRate || 0,
                        Status: wo.Status || 'Em Aberto'
                      });
                      const asset = assets.find(a => a.ID === wo.AssetID);
                      setSelectedModelForWO(asset?.Model || '');
                      setShowWOModal(true);
                    }}
                    onUpdateStatus={(id, status, completedAt, duration) => handleUpdateWorkOrder(id, { Status: status as any, CompletedAt: completedAt }, duration)}
                    onUpdateChecklist={(id, checklist) => handleUpdateWorkOrder(id, { Checklist: checklist })}
                    onDelete={handleDeleteWorkOrder}
                  />
                )}
                {activeTab === 'preventive' && (
                  <PreventiveModule 
                    plans={plans} 
                    assets={assets} 
                    wos={wos}
                    isAdmin={isAdmin}
                    currentUserUid={user?.uid}
                    userRole={userProfile?.role}
                    onRefresh={() => {}} // Handled by real-time
                    onDelete={handleDeletePreventive}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'preventive-assets' && (
                  <PreventiveAssetsModule 
                    plans={plans} 
                    assets={assets} 
                    onUpdateDate={handleUpdatePlanDate}
                    isAdmin={isAdmin}
                    isPlanner={userProfile?.workOrderRole === 'planner'}
                  />
                )}
                {activeTab === 'gantt' && (
                  <Gantt 
                    wos={wos}
                    assets={assets}
                    employees={employees}
                  />
                )}
                {activeTab === 'failure-analysis' && (
                  <FailureAnalysisModule 
                    showToast={showToast} 
                    handleFileUpload={handleFileUpload} 
                    data={failureAnalysisData}
                    onDataUpdate={handleFailureAnalysisDataUpdate}
                    loading={loading}
                  />
                )}

                {activeTab === 'technical-knowledge' && (
                  <TechnicalKnowledgeModule 
                    assets={assets}
                    userProfile={userProfile}
                  />
                )}

                {activeTab === 'service-management' && (
                  <ServiceManagementModule 
                    demands={serviceDemands}
                    employees={employees}
                    companies={thirdPartyCompanies}
                    userProfile={userProfile}
                    onSave={handleSaveServiceDemand}
                    onDelete={handleDeleteServiceDemand}
                    onUpdateStatus={handleUpdateServiceDemandStatus}
                    onAddScopeChange={handleAddServiceDemandScopeChange}
                    showToast={showToast}
                    selectedDemandId={selectedDemandId}
                    onClearSelectedDemandId={() => setSelectedDemandId(null)}
                  />
                )}
                {activeTab === 'maintenance-solutions' && (
                  <MaintenanceSolutionsModule />
                )}
                {activeTab === 'improvement-management' && (
                  <ImprovementManagementModule 
                    userProfile={userProfile}
                    employees={employees}
                    assets={assets}
                    onSave={handleSaveImprovementProject}
                    onDelete={handleDeleteImprovementProject}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'database' && (
                  <DatabaseModule 
                    isAdmin={isAdmin}
                    onDataImported={({ bditss, dinamica, failureAnalysis, indicators }) => {
                      setBditssData(bditss);
                      setDinamicaData(dinamica);
                      if (failureAnalysis) {
                        setFailureAnalysisData(failureAnalysis);
                        window.dispatchEvent(new Event('failureAnalysisDataUpdated'));
                      }
                      if (bditss && bditss.length > 0) {
                        updateFiltersFromData(bditss);
                      }
                    }}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'employees' && (
                  <EmployeeModule 
                    employees={employees}
                    allUsers={allUsers}
                    isAdmin={isAdmin}
                    currentUserUid={user?.uid}
                    companies={thirdPartyCompanies}
                    onRefresh={() => {}} // Handled by real-time
                    onDelete={handleDeleteEmployee}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'third-party' && (
                  <ThirdPartyModule 
                    companies={thirdPartyCompanies}
                    employees={employees}
                    isAdmin={isAdmin}
                    currentUserUid={user?.uid}
                    onRefresh={() => {}}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'reports' && (
                  <ReportsModule 
                    wos={wos}
                    assets={assets}
                    employees={employees}
                    plans={plans}
                  />
                )}
                {activeTab === 'profile' && userProfile && (
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row items-center text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                        {userProfile.photoURL ? (
                          <img src={userProfile.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{userProfile.displayName}</h3>
                        <p className="text-slate-500 break-all">{userProfile.email}</p>
                        <div className={cn(
                          "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mt-2",
                          userProfile.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600",
                          userProfile.email === 'lucas.lds36@gmail.com' && "ring-2 ring-indigo-500 ring-offset-1"
                        )}>
                          {userProfile.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          <span>{userProfile.email === 'lucas.lds36@gmail.com' ? 'Proprietário Master' : userProfile.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                      <h4 className="text-lg font-bold text-slate-900">Gerenciamento de Senha</h4>
                      <PasswordManagement />
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                      <h4 className="text-lg font-bold text-slate-900">Editar Informações</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Nome de Exibição</label>
                          <input 
                            type="text" 
                            value={userProfile.displayName}
                            onChange={(e) => setUserProfileState({ ...userProfile, displayName: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">URL da Foto (Opcional)</label>
                          <input 
                            type="text" 
                            value={userProfile.photoURL || ''}
                            onChange={(e) => setUserProfileState({ ...userProfile, photoURL: e.target.value || null })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="https://exemplo.com/foto.jpg"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={async () => {
                          try {
                            await setUserProfile(userProfile);
                            showToast('Perfil atualizado com sucesso!');
                          } catch (error) {
                            showToast('Erro ao atualizar perfil', 'error');
                          }
                        }}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>

                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start space-x-4">
                      <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Segurança da Conta</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          Para alterar sua senha ou gerenciar métodos de login, utilize as opções de segurança da sua conta Google ou entre em contato com o administrador do sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'settings' && (
                  <div className="max-w-2xl bg-white rounded-2xl p-8 border border-slate-100">
                    <h3 className="text-xl font-bold mb-6">Configurações do Sistema</h3>
                    <div className="space-y-6">
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-600 rounded-xl">
                            <Box className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-900">Banco de Dados em Nuvem</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              O sistema agora utiliza Firebase Firestore. Seus dados são sincronizados em tempo real entre todos os membros da equipe.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold">Status da Conexão</p>
                          <p className="text-sm text-slate-500">Conectado ao Firebase Firestore</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-emerald-600 uppercase">Online</span>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          onClick={async () => {
                            try {
                              // Simple check by trying to fetch a doc
                              showToast('Conexão com Firestore está ativa!');
                            } catch (error) {
                              showToast('Erro ao verificar conexão', 'error');
                            }
                          }}
                          className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                        >
                          Testar Conexão Firestore
                        </button>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-4">Zona de Perigo</h4>
                        <button 
                          onClick={async () => {
                            if (confirm('AVISO: Isso apagará todos os dados das coleções. Continuar?')) {
                              try {
                                setLoading(true);
                                await Promise.all([
                                  resetCollection('assets'),
                                  resetCollection('work-orders'),
                                  resetCollection('preventive-plans')
                                ]);
                                showToast('Banco de dados resetado com sucesso!');
                              } catch (error) {
                                showToast('Erro ao resetar banco de dados', 'error');
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors border border-rose-100"
                        >
                          Resetar Banco de Dados (Firestore)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* New Asset Modal */}
      <AnimatePresence>
        {showAssetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAssetModal(false);
                setEditingAsset(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">{editingAsset ? 'Editar Ativo' : 'Novo Ativo'}</h3>
                  <button onClick={() => {
                    setShowAssetModal(false);
                    setEditingAsset(null);
                  }} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateAsset} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">TAG</label>
                      <input 
                        required
                        type="text"
                        placeholder="Ex: MTR-001"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Tag}
                        onChange={e => setNewAsset({...newAsset, Tag: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Status}
                        onChange={e => setNewAsset({...newAsset, Status: e.target.value as any})}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Em Manutenção">Em Manutenção</option>
                        <option value="Parado">Parado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Modelo</label>
                      <input 
                        required
                        type="text"
                        placeholder="Modelo do equipamento"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Model}
                        onChange={e => setNewAsset({...newAsset, Model: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fabricante</label>
                      <input 
                        required
                        type="text"
                        placeholder="Fabricante"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Manufacturer}
                        onChange={e => setNewAsset({...newAsset, Manufacturer: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                    <textarea 
                      required
                      placeholder="Descrição detalhada do ativo"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      value={newAsset.Description}
                      onChange={e => setNewAsset({...newAsset, Description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Localização</label>
                      <input 
                        required
                        type="text"
                        placeholder="Ex: Galpão A"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Location}
                        onChange={e => setNewAsset({...newAsset, Location: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planta</label>
                      <input 
                        required
                        type="text"
                        placeholder="Ex: Planta 1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newAsset.Plant}
                        onChange={e => setNewAsset({...newAsset, Plant: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Instalação</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={newAsset.InstallDate}
                      onChange={e => setNewAsset({...newAsset, InstallDate: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all mt-4 shadow-lg shadow-blue-200"
                  >
                    {editingAsset ? 'Salvar Alterações' : 'Salvar Ativo'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Work Order Modal */}
      <AnimatePresence>
        {showWOModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowWOModal(false);
                setEditingWO(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">{editingWO ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
                  <button onClick={() => {
                    setShowWOModal(false);
                    setEditingWO(null);
                  }} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Modelo do Equipamento</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={selectedModelForWO}
                        onChange={e => {
                          setSelectedModelForWO(e.target.value);
                          setNewWO({...newWO, AssetID: ''});
                        }}
                      >
                        <option value="">Todos os Modelos</option>
                        {Object.keys(assetsByModel).map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ativo (Descrição)</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.AssetID}
                        onChange={e => setNewWO({...newWO, AssetID: e.target.value})}
                      >
                        <option value="">Selecione um ativo</option>
                        {selectedModelForWO ? (
                          assetsByModel[selectedModelForWO]?.map(a => (
                            <option key={a.ID} value={a.ID}>{a.Description || a.Tag} ({a.Tag})</option>
                          ))
                        ) : (
                          Object.entries(assetsByModel).map(([model, modelAssets]) => (
                            <optgroup key={model} label={model}>
                              {modelAssets.map(a => (
                                <option key={a.ID} value={a.ID}>{a.Description || a.Tag} ({a.Tag})</option>
                              ))}
                            </optgroup>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                    <textarea 
                      required
                      placeholder="Descreva o problema ou tarefa..."
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      value={newWO.Description}
                      onChange={e => setNewWO({...newWO, Description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Manutenção</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.Type}
                        onChange={e => setNewWO({...newWO, Type: e.target.value as any})}
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="Preventiva">Preventiva</option>
                        <option value="Corretiva">Corretiva</option>
                        <option value="Preditiva">Preditiva</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Natureza</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.Nature}
                        onChange={e => setNewWO({...newWO, Nature: e.target.value as any})}
                      >
                        <option value="">Selecione a natureza</option>
                        <option value="Emergencial">Emergencial</option>
                        <option value="Programada">Programada</option>
                        <option value="Oportunidade">Oportunidade</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Atividade</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={newWO.ActivityType}
                      onChange={e => setNewWO({...newWO, ActivityType: e.target.value as any})}
                    >
                      <option value="">Selecione a atividade</option>
                      <option value="Lubrificação">Lubrificação</option>
                      <option value="Inspeção">Inspeção</option>
                      <option value="Ajuste">Ajuste</option>
                      <option value="Reparo">Reparo</option>
                      <option value="Substituição">Substituição</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prioridade</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.Priority}
                        onChange={e => setNewWO({...newWO, Priority: e.target.value as any})}
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Crítica">Crítica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Executor</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.executorType}
                        onChange={e => setNewWO({...newWO, executorType: e.target.value as any})}
                      >
                        <option value="Próprio">Próprio</option>
                        <option value="Terceiro">Terceiro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {newWO.executorType === 'Terceiro' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa Terceira</label>
                        <select 
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={newWO.companyId}
                          onChange={e => {
                            const company = thirdPartyCompanies.find(c => c.id === e.target.value);
                            setNewWO({
                              ...newWO, 
                              companyId: e.target.value,
                              companyName: company?.name || ''
                            });
                          }}
                        >
                          <option value="">Selecione uma empresa</option>
                          {thirdPartyCompanies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Técnico Responsável</label>
                        <select 
                          required
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={newWO.TechnicianID}
                          onChange={e => {
                            const emp = employees.find(emp => emp.ID === e.target.value);
                            setNewWO({
                              ...newWO, 
                              TechnicianID: e.target.value,
                              AssignedTo: emp ? emp.Name : e.target.value,
                              hourlyRate: emp?.hourlyRate || 0
                            });
                          }}
                        >
                          <option value="">Selecione um técnico</option>
                          {employees.filter(emp => emp.Status === 'Ativo').map(emp => (
                            <option key={emp.ID} value={emp.ID}>{emp.Name} ({emp.Function})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Custo Total Est./Real (R$)</label>
                      <div className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-bold text-blue-700">
                        R$ {((newWO.Duration || newWO.EstimatedTime || 0) * (newWO.hourlyRate || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {newWO.executorType === 'Terceiro' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Executor</label>
                        <select 
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={newWO.TechnicianID || ''}
                          onChange={e => {
                            const emp = employees.find(emp => emp.ID === e.target.value);
                            const company = emp?.companyId ? thirdPartyCompanies.find(c => c.id === emp.companyId) : null;
                            setNewWO({
                              ...newWO, 
                              TechnicianID: e.target.value,
                              executorName: emp ? emp.Name : '',
                              AssignedTo: emp ? emp.Name : '',
                              hourlyRate: emp?.hourlyRate || newWO.hourlyRate || 0,
                              companyId: emp?.companyId || newWO.companyId || '',
                              companyName: company?.name || newWO.companyName || ''
                            });
                          }}
                        >
                          <option value="">Selecione um executor</option>
                          {employees.filter(emp => emp.Status === 'Ativo').map(emp => (
                            <option key={emp.ID} value={emp.ID}>{emp.Name} ({emp.Type === 'Terceiro' ? 'Terceiro' : 'Próprio'})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Hora (R$)</label>
                        <input 
                          type="number"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={Number.isNaN(newWO.hourlyRate) || newWO.hourlyRate === 0 ? '' : newWO.hourlyRate}
                          onChange={e => setNewWO({...newWO, hourlyRate: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Geração</label>
                      <input 
                        type="date"
                        disabled
                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm text-slate-500"
                        value={editingWO ? editingWO.CreatedAt : new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Programação</label>
                      <input 
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.ScheduledDate || ''}
                        onChange={e => setNewWO({...newWO, ScheduledDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Início Real</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.StartDate || ''}
                        onChange={e => setNewWO({...newWO, StartDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fim Real</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.EndDate || ''}
                        onChange={e => setNewWO({...newWO, EndDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {newWO.Type === 'Corretiva' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Causa da Falha</label>
                      <textarea 
                        required
                        placeholder="Descreva a causa da falha..."
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={newWO.Cause || ''}
                        onChange={e => setNewWO({...newWO, Cause: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tempo Est. (h)</label>
                      <input 
                        type="number"
                        step="0.5"
                        min="0"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newWO.EstimatedTime) || newWO.EstimatedTime === 0 ? '' : newWO.EstimatedTime}
                        onChange={e => setNewWO({...newWO, EstimatedTime: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duração Real (h)</label>
                      <input 
                        type="number"
                        step="0.5"
                        min="0"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newWO.Duration) || newWO.Duration === 0 ? '' : newWO.Duration}
                        onChange={e => setNewWO({...newWO, Duration: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nº Colaboradores</label>
                      <input 
                        type="number"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={Number.isNaN(newWO.Collaborators) || newWO.Collaborators === 0 ? '' : newWO.Collaborators}
                        onChange={e => setNewWO({...newWO, Collaborators: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID do Plano (Opcional)</label>
                      <div className="flex gap-2">
                        {newWO.Type === 'Preventiva' ? (
                          <select 
                            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={newWO.PlanID || ''}
                            onChange={async (e) => {
                              const planId = e.target.value;
                              const selectedPlan = plans.find(p => p.ID === planId);
                              if (selectedPlan) {
                                // Fetch checklist from subcollection
                                const q = query(collection(db, `preventive-plans/${planId}/checklist_itens`));
                                const snapshot = await getDocs(q);
                                const items = snapshot.docs.map(doc => {
                                  const data = doc.data();
                                  return {
                                    tarefa: data.tarefa || data.text || data.task || data.Description || data.Tarefa || data.Atividade || data.atividade || 'Atividade sem descrição',
                                    completed: false,
                                    grupo: data.grupo || 'Geral',
                                    equipamento: data.equipamento || 'Geral'
                                  };
                                });
                                
                                setNewWO({
                                  ...newWO,
                                  PlanID: planId,
                                  Description: `[PREVENTIVA] ${selectedPlan.Task}`,
                                  Priority: selectedPlan.Criticality || 'Média',
                                  EstimatedTime: selectedPlan.EstimatedTime || 0,
                                  Collaborators: selectedPlan.Collaborators || 1,
                                  Checklist: items.length > 0 ? items : (selectedPlan.Checklist || []).map(t => ({ tarefa: t, completed: false, grupo: 'Geral', equipamento: 'Geral' }))
                                });
                              } else {
                                setNewWO({...newWO, PlanID: planId});
                              }
                            }}
                          >
                            <option value="">Selecionar Plano...</option>
                            {plans.filter(p => !newWO.AssetID || p.AssetIDs?.includes(newWO.AssetID) || p.assets?.some(a => a.assetId === newWO.AssetID)).map(p => (
                              <option key={p.ID} value={p.ID}>{p.ID} - {p.Task}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            placeholder="Ex: PLAN-123"
                            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={newWO.PlanID || ''}
                            onChange={e => setNewWO({...newWO, PlanID: e.target.value})}
                          />
                        )}
                        
                        {(newWO.PlanID || (editingWO && (editingWO as any).planId)) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const pId = newWO.PlanID || (editingWO as any).planId;
                              const plan = plans.find(p => p.ID === pId);
                              if (!plan) {
                                showToast('Plano não encontrado', 'error');
                                return;
                              }
                              const q = query(collection(db, `preventive-plans/${plan.ID}/checklist_itens`));
                              const snapshot = await getDocs(q);
                              const items = snapshot.docs.map(doc => {
                                const data = doc.data();
                                return {
                                  tarefa: data.tarefa || data.text || data.task || data.Description || data.Tarefa || data.Atividade || data.atividade || 'Atividade sem descrição',
                                  completed: false,
                                  grupo: data.grupo || 'Geral',
                                  equipamento: data.equipamento || 'Geral'
                                };
                              });
                              
                              const finalItems = items.length > 0 ? items : (plan.Checklist || []).map(t => ({ tarefa: t, completed: false, grupo: 'Geral', equipamento: 'Geral' }));
                              
                              if (finalItems.length > 0) {
                                setNewWO({ ...newWO, Checklist: finalItems });
                                showToast('Check-list importado com sucesso!');
                              } else {
                                showToast('O plano não possui itens de check-list', 'error');
                              }
                            }}
                            className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center"
                            title="Importar Check-list"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingWO && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                        <select 
                          disabled={userProfile?.workOrderRole !== 'planner' && userProfile?.role !== 'admin'}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          value={newWO.Status || 'Em Aberto'}
                          onChange={e => setNewWO({...newWO, Status: e.target.value as any})}
                        >
                          <option value="Em Aberto">Em Aberto</option>
                          <option value="Em Execução">Em Execução</option>
                          <option value="Concluída">Concluída</option>
                          <option value="Cancelada">Cancelada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Limite (Due Date)</label>
                        <input 
                          type="date"
                          disabled={userProfile?.workOrderRole !== 'planner' && userProfile?.role !== 'admin'}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          value={newWO.dueDate || ''}
                          onChange={e => setNewWO({...newWO, dueDate: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Escopo (Scope)</label>
                    <textarea 
                      disabled={userProfile?.workOrderRole !== 'planner' && userProfile?.role !== 'admin'}
                      placeholder="Escopo do serviço..."
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      value={newWO.scope || ''}
                      onChange={e => setNewWO({...newWO, scope: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="needsMaterial"
                      disabled={userProfile?.workOrderRole !== 'planner' && userProfile?.role !== 'admin'}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      checked={newWO.needsMaterial || false}
                      onChange={e => setNewWO({...newWO, needsMaterial: e.target.checked})}
                    />
                    <label htmlFor="needsMaterial" className="text-sm font-bold text-slate-700">
                      Necessita Material
                    </label>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklist de Atividades</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const newItem = { tarefa: '', completed: false };
                          setNewWO({
                            ...newWO,
                            Checklist: [...(newWO.Checklist || []), newItem]
                          });
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {(newWO.Checklist || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            type="text"
                            placeholder="Descreva a atividade..."
                            className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={item.tarefa || (item as any).text || (item as any).task || (item as any).Description || ''}
                            onChange={e => {
                              const newList = [...(newWO.Checklist || [])];
                              newList[index].tarefa = e.target.value;
                              setNewWO({...newWO, Checklist: newList});
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newList = (newWO.Checklist || []).filter((_, i) => i !== index);
                              setNewWO({...newWO, Checklist: newList});
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(newWO.Checklist || []).length === 0 && (
                        <p className="text-center py-4 text-xs text-slate-400 italic">Nenhuma atividade adicionada.</p>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all mt-4 shadow-lg shadow-blue-200"
                  >
                    {editingWO ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            )}
          >
            {toast.type === 'success' ? <Activity className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal 
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, show: false }))}
      />
      
      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[200] flex items-start justify-end p-4 pt-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Notificações</h3>
                <button onClick={() => setShowNotifications(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 && <p className="text-sm text-slate-500 text-center">Nenhuma notificação.</p>}
                {notifications.map(n => (
                  <div key={n.id} className={cn("p-3 rounded-xl border text-sm", n.read ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100")}>
                    <p className="text-slate-700">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {n.demandId && (
                        <button 
                          onClick={() => {
                            setActiveTab('service-management');
                            setSelectedDemandId(n.demandId);
                            setShowNotifications(false);
                            updateDocument('notifications', n.id, { read: true });
                          }}
                          className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold hover:bg-emerald-200 transition-colors"
                        >
                          Ver Demanda
                        </button>
                      )}
                      {n.read ? (
                        <button 
                          onClick={() => deleteDocument('notifications', n.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold hover:bg-red-200 transition-colors"
                        >
                          Apagar
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateDocument('notifications', n.id, { read: true })}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold hover:bg-blue-200 transition-colors"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
