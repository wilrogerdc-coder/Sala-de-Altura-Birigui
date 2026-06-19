import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Allocations } from './components/Allocations';
import { Loans } from './components/Loans';
import { Documents } from './components/Documents';
import { Logs } from './components/Logs';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Users } from './components/Users';
import { Help } from './components/Help';
import { Login } from './components/Login';
import { useLocalStorage } from './hooks/useLocalStorage';
import { 
  initialMaterials, 
  initialLocations, 
  initialUsers, 
  initialSettings,
  initialDocuments,
  initialLoans
} from './mockData';
import { Material, Location, Log, User, AppSettings, Document, Loan } from './types';
import { Toaster } from 'sonner';
import { Menu } from 'lucide-react';
import { Button } from './components/ui/button';

import { GoogleSheetsService } from './services/googleSheetsService';
import { Wifi, WifiOff, RefreshCw, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error' | 'offline'>('offline');
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastSyncDataRef = useRef<string>('');
  
  const FIXED_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbz8KdGmeUJbxD5Heb__3bEIpoYpDzwo8MXzVLfBeW3atJpOL8yudJ2QvcvWgR0wEC2Y/exec';
  
  const [materials, setMaterials] = useLocalStorage<Material[]>('saladealtura_materials', initialMaterials);
  const [locations, setLocations] = useLocalStorage<Location[]>('saladealtura_locations', initialLocations);
  const [logs, setLogs] = useLocalStorage<Log[]>('saladealtura_logs', []);
  const [users, setUsers] = useLocalStorage<User[]>('saladealtura_users', initialUsers);
  const [settings, setSettings] = useLocalStorage<AppSettings>('saladealtura_settings', initialSettings);
  const [documents, setDocuments] = useLocalStorage<Document[]>('saladealtura_documents', initialDocuments);
  const [loans, setLoans] = useLocalStorage<Loan[]>('saladealtura_loans', initialLoans);

  const sheetsService = new GoogleSheetsService(FIXED_SHEETS_URL);

  // Atualiza o título da aba do navegador
  useEffect(() => {
    document.title = 'SALA DE ALTURA';
    
    // Garante que a URL do banco de dados esteja sempre correta nas configurações locais
    if (settings.googleSheetsUrl !== FIXED_SHEETS_URL) {
      setSettings(prev => ({ ...prev, googleSheetsUrl: FIXED_SHEETS_URL }));
    }

    // Migration: Atualiza informações do desenvolvedor para a nova versão
    if (settings.devInfo && settings.devInfo.includes('Equipe de Tecnologia CBPMESP')) {
      setSettings(prev => ({
        ...prev,
        devInfo: 'Desenvolvido por Cavalieri\nVersão: 2.0.0'
      }));
    }
  }, []);

  // Sincronização Inicial com Google Sheets
  const loadData = async () => {
    setDbStatus('syncing');
    setSyncError(null);
    try {
      const data = await sheetsService.fetchAllData();
      if (data) {
        if (data.Materials.length > 0) setMaterials(data.Materials);
        if (data.Locations.length > 0) setLocations(data.Locations);
        if (data.Users.length > 0) {
          console.log('SALA DE ALTURA - Usuários carregados da nuvem:', data.Users.length);
          setUsers(data.Users);
        }
        if (data.Settings.length > 0) {
          const cloudSettings = data.Settings[0];
          setSettings({
            ...settings,
            ...cloudSettings,
            googleSheetsUrl: FIXED_SHEETS_URL
          });
        }
        if (data.Documents.length > 0) setDocuments(data.Documents);
        if (data.Loans.length > 0) setLoans(data.Loans);
        if (data.Logs.length > 0) setLogs(data.Logs);
        
        // Atualiza o ref para evitar que o auto-sync dispare imediatamente após carregar
        lastSyncDataRef.current = JSON.stringify({
          Materials: data.Materials.length > 0 ? data.Materials : materials,
          Locations: data.Locations.length > 0 ? data.Locations : locations,
          Users: data.Users.length > 0 ? data.Users : users,
          Settings: data.Settings.length > 0 ? [data.Settings[0]] : [settings],
          Documents: data.Documents.length > 0 ? data.Documents : documents,
          Loans: data.Loans.length > 0 ? data.Loans : loans,
          Logs: data.Logs.length > 0 ? data.Logs : logs
        });

        setDbStatus('connected');
        setIsInitialSyncComplete(true);
        toast.success('Dados sincronizados com Google Drive');
      } else {
        setIsInitialSyncComplete(true);
      }
    } catch (error) {
      setDbStatus('error');
      setIsInitialSyncComplete(true);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setSyncError(errorMsg);
      if (errorMsg.includes('fetch')) {
        toast.error('Erro de Rede: Verifique a conexão com o Google Sheets.');
      } else {
        toast.error(`Erro ao sincronizar: ${errorMsg}`);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []); // Executa apenas na montagem inicial

  // Sincronização Automática ao mudar dados (Debounced ou em ações específicas)
  // Para simplificar e garantir persistência, vamos sincronizar em ações críticas ou via botão nas configurações
  const syncToCloud = async () => {
    const currentData = {
      Materials: materials,
      Locations: locations,
      Users: users,
      Settings: [settings],
      Documents: documents,
      Loans: loans,
      Logs: logs
    };
    
    const dataString = JSON.stringify(currentData);
    if (dataString === lastSyncDataRef.current) {
      return; // Evita sincronização redundante se os dados forem idênticos
    }

    setDbStatus('syncing');
    const success = await sheetsService.syncAll(currentData);
    if (success) {
      lastSyncDataRef.current = dataString;
      setDbStatus('connected');
    } else {
      setDbStatus('error');
    }
  };

  // Sistema de Auto-Recuperação: Garante que os usuários básicos sempre existam
  useEffect(() => {
    const hasAdmin = users.some(u => u.username?.toLowerCase() === 'admin');
    const hasCavalieri = users.some(u => u.username?.toLowerCase() === 'cavalieri');
    
    if (!hasAdmin || !hasCavalieri || users.length === 0) {
      console.log('SALA DE ALTURA: Restaurando usuários iniciais para garantir acesso...');
      // Filtra apenas os que faltam para não duplicar
      const missingUsers = initialUsers.filter(iu => 
        !users.some(u => u.username?.toLowerCase() === iu.username.toLowerCase())
      );
      
      if (missingUsers.length > 0 || users.length === 0) {
        const newUsersList = users.length === 0 ? initialUsers : [...users, ...missingUsers];
        setUsers(newUsersList);
      }
    }
  }, [users, setUsers]);

  const addLog = (action: string, details: string) => {
    if (!currentUser) return;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const newLog: Log = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details,
      timestamp: formattedDate,
    };
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    
    // Envia log para a nuvem
    sheetsService.addLog(newLog);
  };

  // Auto-sincronização quando os dados mudam (Debounced)
  useEffect(() => {
    // CRÍTICO: Não sincroniza se a carga inicial não terminou
    // Isso evita que dados antigos do localStorage sobrescrevam o banco de dados
    if (!isInitialSyncComplete) return;

    const timer = setTimeout(() => {
      syncToCloud();
    }, 5000); // Sincroniza após 5 segundos de inatividade

    return () => clearTimeout(timer);
  }, [materials, locations, users, documents, loans, settings, isInitialSyncComplete]);

  const handleLogin = (user: User) => {
    // Se o usuário mudou a senha (veio do reset), atualizamos a lista de usuários
    const existingUser = users.find(u => u.id === user.id);
    if (existingUser && (existingUser.password !== user.password || existingUser.resetPasswordNextLogin !== user.resetPasswordNextLogin)) {
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      setUsers(updatedUsers);
      addLog('Redefinição de Senha', `O usuário ${user.name} redefiniu sua senha.`);
    }
    
    setCurrentUser(user);
    addLog('Login no Sistema', `Usuário ${user.name} realizou acesso ao sistema.`);
  };

  // Registro de Navegação (Acesso a Módulos)
  useEffect(() => {
    if (currentUser && activeTab) {
      const tabNames: Record<string, string> = {
        'dashboard': 'Dashboard',
        'inventory': 'Inventário',
        'allocations': 'Locais/Viaturas',
        'loans': 'Empréstimos',
        'documents': 'Documentos',
        'logs': 'Logs do Sistema',
        'reports': 'Relatórios',
        'users': 'Gestão de Usuários',
        'settings': 'Configurações',
        'help': 'Central de Ajuda'
      };
      addLog('Acesso a Módulo', `Visualizou tela: ${tabNames[activeTab] || activeTab}`);
    }
  }, [activeTab]);

  const handleLogout = () => {
    if (currentUser) {
      addLog('Saída do Sistema', `O usuário ${currentUser.name} saiu do sistema.`);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!showLogin && !currentUser) {
    return (
      <div 
        className="relative h-screen w-full flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-black"
        onClick={() => {
          if (isInitialSyncComplete) {
            setShowLogin(true);
          } else {
            toast.info('Aguarde a sincronização inicial do banco de dados...');
          }
        }}
      >
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 transition-transform duration-10000 hover:scale-110"
          style={{ backgroundImage: `url(${settings.bgImage})` }}
        />
        <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
          <div className="p-6 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
            <img src={settings.unitLogo} alt="Logo" className="w-48 h-48 object-contain drop-shadow-2xl" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase drop-shadow-lg">
              {settings.systemName || 'SALA DE ALTURA'}
            </h1>
            <p className="text-xl text-white/80 font-medium tracking-widest uppercase">
              {settings.unitName}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 mt-8">
            {!isInitialSyncComplete ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={32} className="text-white/60 animate-spin" />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Sincronizando Banco de Dados...</span>
              </div>
            ) : syncError ? (
              <div className="flex flex-col items-center gap-3">
                <WifiOff size={32} className="text-red-500/60" />
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-red-500/60">Erro na Sincronização</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInitialSyncComplete(false);
                    loadData();
                  }}
                >
                  Tentar Novamente
                </Button>
                <div className="flex items-center gap-2 text-white/40 mt-4 animate-pulse">
                  <MousePointer2 size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Clique para entrar offline</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/60 animate-pulse">
                <MousePointer2 size={20} />
                <span className="text-sm font-bold uppercase tracking-[0.3em]">Clique para Iniciar</span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-8 left-0 right-0 text-center text-white/30 text-xs font-mono uppercase tracking-widest">
          SALA DE ALTURA • CBPMESP
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Login 
          users={users} 
          onLogin={handleLogin} 
          unitLogo={settings.unitLogo} 
          unitName={settings.unitName}
          bgImage={settings.bgImage}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard materials={materials} viaturas={locations} loans={loans} settings={settings} logs={logs} />;
      case 'inventory':
        return <Inventory materials={materials} setMaterials={setMaterials} locations={locations} setLocations={setLocations} loans={loans} addLog={addLog} />;
      case 'allocations':
        return <Allocations locations={locations} setLocations={setLocations} materials={materials} addLog={addLog} />;
      case 'loans':
        return <Loans loans={loans} setLoans={setLoans} materials={materials} setMaterials={setMaterials} locations={locations} setLocations={setLocations} addLog={addLog} />;
      case 'documents':
        return <Documents documents={documents} setDocuments={setDocuments} addLog={addLog} />;
      case 'logs':
        if (currentUser?.username?.toLowerCase() !== 'cavalieri') return <Dashboard materials={materials} viaturas={locations} loans={loans} settings={settings} logs={logs} />;
        return <Logs logs={logs} />;
      case 'reports':
        return <Reports materials={materials} locations={locations} loans={loans} logs={logs} settings={settings} addLog={addLog} />;
      case 'settings':
        if (currentUser?.username?.toLowerCase() !== 'cavalieri') return <Dashboard materials={materials} viaturas={locations} loans={loans} settings={settings} logs={logs} />;
        return (
          <Settings 
            settings={settings} 
            setSettings={setSettings} 
            currentUser={currentUser} 
            materials={materials} 
            setMaterials={setMaterials} 
            locations={locations} 
            setLocations={setLocations} 
            users={users}
            documents={documents}
            loans={loans}
            setLoans={setLoans}
            logs={logs}
            setLogs={setLogs}
            addLog={addLog} 
          />
        );
      case 'users':
        if (currentUser?.username?.toLowerCase() !== 'cavalieri') return <Dashboard materials={materials} viaturas={locations} loans={loans} settings={settings} logs={logs} />;
        return <Users users={users} setUsers={setUsers} currentUser={currentUser} addLog={addLog} />;
      case 'help':
        return <Help settings={settings} setSettings={setSettings} currentUser={currentUser} />;
      default:
        return <Dashboard materials={materials} viaturas={locations} loans={loans} settings={settings} logs={logs} />;
    }
  };

  return (
    <div className="relative flex h-screen bg-background overflow-hidden">
      {/* Background Image with Transparency */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ 
          backgroundImage: `url(${settings.bgImage})`, 
          opacity: settings.bgOpacity 
        }}
      />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unitName={settings.unitName}
        unitLogo={settings.unitLogo}
        user={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      
      <main className="relative z-10 flex-1 h-full overflow-y-auto p-4 lg:p-8 flex flex-col w-full">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center justify-between mb-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img src={settings.unitLogo} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">{settings.systemName || 'SALA DE ALTURA'}</span>
          </div>
          <div className="flex items-center gap-3">
            {settings.googleSheetsUrl && (
              <div className={`p-1.5 rounded-full ${
                dbStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                dbStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400 animate-spin' :
                'bg-red-500/20 text-red-400'
              }`}>
                {dbStatus === 'connected' ? <Wifi size={14} /> : 
                 dbStatus === 'syncing' ? <RefreshCw size={14} /> : 
                 <WifiOff size={14} />}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="text-white">
              <Menu size={24} />
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-end mb-4 gap-4">
          {settings.googleSheetsUrl && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all ${
              dbStatus === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
              dbStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' :
              'bg-red-500/10 border-red-500/20 text-red-600'
            }`}>
              {dbStatus === 'connected' ? <Wifi size={16} /> : 
               dbStatus === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : 
               <WifiOff size={16} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {dbStatus === 'connected' ? 'Nuvem Conectada' : 
                 dbStatus === 'syncing' ? 'Sincronizando...' : 
                 'Erro de Conexão'}
              </span>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto w-full flex-1">
          {renderContent()}
        </div>
        
        {/* Footer with Developer Credits */}
        <footer className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-muted-foreground/60 max-w-7xl mx-auto w-full">
          <div className="whitespace-pre-line">
            {settings.devInfo || 'SALA DE ALTURA - Sistema de Gestão de Armazenamento'}
          </div>
          <p className="mt-2">© {new Date().getFullYear()} - Todos os direitos reservados</p>
        </footer>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
}
