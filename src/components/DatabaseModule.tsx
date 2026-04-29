import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Database, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { auth, saveDatabaseEntry, saveGlobalData, db, collection, getDocs, query, doc, writeBatch } from '../firebase';

interface DatabaseModuleProps {
  onDataImported: (data: { bditss: any[], dinamica: any[], failureAnalysis: any[], indicators: any[], chartData: any[] }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  isAdmin?: boolean;
}

export const DatabaseModule: React.FC<DatabaseModuleProps> = ({ onDataImported, showToast, isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    bdCount: 0,
    pdgCount: 0,
    bditssCount: 0,
    lastUpdate: ''
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    let bd = [];
    let pdg = [];
    let bditss = [];
    
    try {
      const bdStr = localStorage.getItem('bdData');
      bd = bdStr && bdStr !== "undefined" ? JSON.parse(bdStr) : [];
    } catch (e) {
      console.error("Failed to parse bdData", e);
      localStorage.removeItem('bdData');
    }

    try {
      const pdgStr = localStorage.getItem('dinamicaData');
      pdg = pdgStr && pdgStr !== "undefined" ? JSON.parse(pdgStr) : [];
    } catch (e) {
      console.error("Failed to parse dinamicaData", e);
      localStorage.removeItem('dinamicaData');
    }

    try {
      const bditssStr = localStorage.getItem('bditssData');
      bditss = bditssStr && bditssStr !== "undefined" ? JSON.parse(bditssStr) : [];
    } catch (e) {
      console.error("Failed to parse bditssData", e);
      localStorage.removeItem('bditssData');
    }
    
    const lastUpdate = localStorage.getItem('lastDatabaseUpdate') || 'Nunca';

    setStats({
      bdCount: bd.length,
      pdgCount: pdg.length,
      bditssCount: bditss.length,
      lastUpdate
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      
      console.log('Sheet names found:', workbook.SheetNames);

      // 1. Parse BD (Dashboard main base)
      const bdSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'BD');
      let bdData: any[] = [];
      let bdFound = false;
      if (bdSheetName) {
        const sheet = workbook.Sheets[bdSheetName];
        bdData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        bdFound = true;
      }

      // 2. Parse PDG (Dashboard goals)
      const pdgSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'PDG');
      let pdgData: any[] = [];
      let pdgFound = false;
      if (pdgSheetName) {
        const sheet = workbook.Sheets[pdgSheetName];
        pdgData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        pdgFound = true;
      }

      // 3. Parse BDITSS (Failure Analysis base)
      const bditssSheetName = workbook.SheetNames.find(name => name.trim().toUpperCase() === 'BDITSS');
      console.log('BDITSS sheet name found:', bditssSheetName);
      let bditssData: any[] = [];
      let bditssFound = false;
      if (bditssSheetName) {
        const sheet = workbook.Sheets[bditssSheetName];
        // Read as array of arrays first to find header
        const bditssRaw: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(bditssRaw.length, 30); i++) {
          const row = bditssRaw[i];
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
        
        // Convert to objects using the found header row
        // Use raw: true to get the actual numbers directly from Excel
        const bditssParsed = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, raw: true });
        
        console.log('BDITSS parsed rows:', bditssParsed.length);
        console.log('BDITSS first row:', bditssParsed[0]);
        
        // Filter out rows that are clearly empty or just summary footers
        bditssData = bditssParsed.filter((row: any) => {
          const values = Object.values(row);
          const isEmptyRow = values.every(v => v === null || v === '' || v === undefined);
          const isSummaryRow = values.some(v => String(v).toUpperCase() === 'TOTAL GERAL') && values.length < 5;
          if (isEmptyRow || isSummaryRow) {
            console.log('Filtering out row:', row);
          }
          return !isEmptyRow && !isSummaryRow;
        });

        console.log(`BDITSS sheet found: "${bditssSheetName}" at row ${headerRowIdx + 1} with ${bditssData.length} rows.`);
        bditssFound = true;
      } else {
        console.log('BDITSS sheet not found');
      }

      // 4. Save to LocalStorage and Firestore
      const now = new Date().toLocaleString('pt-BR');
      if (bdFound) {
        const bdJson = JSON.stringify(bdData);
        localStorage.setItem('bdData', bdJson);
        if (isAdmin) {
          console.log("Saving bdData to global Firestore...");
          try {
            await saveGlobalData('bdData', bdJson);
            console.log("bdData saved successfully.");
          } catch (e) {
            console.error("Failed to save bdData to Firestore:", e);
          }
        }
      }
      if (pdgFound) {
        const pdgJson = JSON.stringify(pdgData);
        localStorage.setItem('dinamicaData', pdgJson);
        if (isAdmin) {
          console.log("Saving dinamicaData to global Firestore...");
          try {
            await saveGlobalData('dinamicaData', pdgJson);
            console.log("dinamicaData saved successfully.");
          } catch (e) {
            console.error("Failed to save dinamicaData to Firestore:", e);
          }
        }
      }
      if (bditssFound) {
        const bditssJson = JSON.stringify(bditssData);
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
        window.dispatchEvent(new Event('failureAnalysisDataUpdated'));
      }
      
      // Clear old indicators as they are now calculated dynamically
      localStorage.removeItem('dashboardIndicators');
      localStorage.removeItem('dashboardChartData');
      localStorage.setItem('lastDatabaseUpdate', now);

      if (bdFound || pdgFound || bditssFound) {
        onDataImported({ bditss: bdData, dinamica: pdgData, failureAnalysis: bditssData, indicators: [], chartData: [] });
        loadStats();
        
        const loadedSheets = [
          bdFound ? 'BD' : '',
          pdgFound ? 'PDG' : '',
          bditssFound ? 'BDITSS' : ''
        ].filter(Boolean).join(', ');
        
        showToast(`Base de dados importada com sucesso! (${loadedSheets})`, 'success');
      } else {
        showToast('Nenhuma aba compatível encontrada (BD, PDG ou BDITSS).', 'error');
      }
    } catch (error) {
      console.error('Error importing database:', error);
      showToast('Erro ao importar base de dados. Verifique o formato do arquivo.', 'error');
    } finally {
      setLoading(false);
      // Reset input so the same file can be uploaded again
      e.target.value = '';
    }
  };

  const clearDatabase = async () => {
    localStorage.removeItem('bdData');
    localStorage.removeItem('dinamicaData');
    localStorage.removeItem('bditssData');
    localStorage.removeItem('dashboardIndicators');
    localStorage.removeItem('lastDatabaseUpdate');
    localStorage.removeItem('failureAnalysisData');
    
    // If admin, also clear global storage in Firestore
    if (isAdmin) {
      try {
        await saveGlobalData('bdData', '[]');
        await saveGlobalData('dinamicaData', '[]');
        await saveGlobalData('bditssData', '[]');
        console.log("Global Firestore data cleared.");
      } catch (e) {
        console.error("Failed to clear global Firestore data:", e);
      }
    }
    
    onDataImported({ bditss: [], dinamica: [], failureAnalysis: [], indicators: [], chartData: [] });
    loadStats();
    showToast('Base de dados local limpa com sucesso!');
  };

  const handleExportSystem = async () => {
    setLoading(true);
    try {
      const collectionsToExport = [
        'assets',
        'workOrders',
        'preventivePlans',
        'employees',
        'thirdPartyCompanies',
        'serviceDemands',
        'engineeringProjects',
        'maintenanceSolutions',
        'technicalKnowledge',
        'globalData'
      ];

      const backupData: any = {};

      for (const colName of collectionsToExport) {
        const q = query(collection(db, colName));
        const snapshot = await getDocs(q);
        backupData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Add local storage data as well
      backupData.localStorage = {
        bdData: localStorage.getItem('bdData'),
        dinamicaData: localStorage.getItem('dinamicaData'),
        bditssData: localStorage.getItem('bditssData'),
        lastDatabaseUpdate: localStorage.getItem('lastDatabaseUpdate')
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CMMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Backup do sistema gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Erro ao gerar backup do sistema.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSystem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Esta ação irá sobrescrever ou adicionar dados às suas coleções atuais. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // 1. Restore Firestore Collections
      const collectionsToRestore = Object.keys(backupData).filter(key => key !== 'localStorage');
      
      for (const colName of collectionsToRestore) {
        const docs = backupData[colName];
        if (Array.isArray(docs)) {
          // Use batch for better performance (splitting into groups of 500)
          const chunks = [];
          for (let i = 0; i < docs.length; i += 500) {
            chunks.push(docs.slice(i, i + 500));
          }

          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((docData: any) => {
              const { id, ...data } = docData;
              const docRef = doc(db, colName, id || doc(collection(db, colName)).id);
              batch.set(docRef, data, { merge: true });
            });
            await batch.commit();
          }
        }
      }

      // 2. Restore LocalStorage
      if (backupData.localStorage) {
        const ls = backupData.localStorage;
        if (ls.bdData) localStorage.setItem('bdData', ls.bdData);
        if (ls.dinamicaData) localStorage.setItem('dinamicaData', ls.dinamicaData);
        if (ls.bditssData) localStorage.setItem('bditssData', ls.bditssData);
        if (ls.lastDatabaseUpdate) localStorage.setItem('lastDatabaseUpdate', ls.lastDatabaseUpdate);
      }

      onDataImported({ 
        bditss: JSON.parse(backupData.localStorage?.bdData || '[]'), 
        dinamica: JSON.parse(backupData.localStorage?.dinamicaData || '[]'), 
        failureAnalysis: JSON.parse(backupData.localStorage?.bditssData || '[]'), 
        indicators: [], 
        chartData: [] 
      });

      showToast('Importação de backup concluída com sucesso!', 'success');
      loadStats();
      window.location.reload(); // Refresh to ensure all states are synced
    } catch (error) {
      console.error('Import error:', error);
      showToast('Erro ao importar backup. Verifique o formato do arquivo.', 'error');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Banco de Dados</h1>
            <p className="text-slate-500 font-medium">Gestão de arquivos e migração de dados</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importação via Planilha (Excel)
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">Registros BD</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.bdCount}</div>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">Registros PDG</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.pdgCount}</div>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">Registros BDITSS</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.bditssCount}</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <FileSpreadsheet className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mb-4" />
          <h4 className="text-lg font-bold text-slate-900 mb-2 text-center">Importar Planilha Industrial</h4>
          <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
            Selecione uma planilha contendo as abas <span className="font-bold">BD, PDG e BDITSS</span> para alimentar os indicadores e análise de falhas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {loading ? (
              <div className="flex items-center justify-center space-x-3 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold animate-pulse w-full">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                <span>Processando...</span>
              </div>
            ) : (
              <label className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer flex items-center justify-center space-x-2 w-full sm:w-auto">
                <Upload className="w-5 h-5" />
                <span>Selecionar Planilha</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xlsb, .xls" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            )}
            
            <button 
              onClick={clearDatabase}
              disabled={loading}
              className="px-6 py-3 bg-white text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <Trash2 className="w-5 h-5" />
              <span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-800 shadow-xl text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Migration & Backup</h2>
                <p className="text-slate-400 text-sm">Transfira dados entre projetos ou gere backups completos</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                Exportar Tudo
              </h3>
              <p className="text-slate-400 text-xs mb-4">Gera um arquivo JSON contendo todos os ativos, ordens de serviço, planos, colaboradores e base industrial.</p>
              <button 
                onClick={handleExportSystem}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Exportar Backup JSON
              </button>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Importar Backup
              </h3>
              <p className="text-slate-400 text-xs mb-4">Restaura todas as informações do sistema a partir de um backup JSON. Útil para migrar dados de outro deploy.</p>
              <label className="w-full py-3 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors rounded-xl font-bold flex items-center justify-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Importar de Outro Projeto
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportSystem} 
                />
              </label>
            </div>
          </div>

          <div className="mt-8 p-4 bg-orange-500/10 text-orange-200 border border-orange-500/20 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-bold mb-1">Atenção na Migração</p>
              <p>Ao importar um backup JSON, os IDs dos documentos serão preservados. Se houver conflitos com dados existentes, eles serão unificados (merge).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

