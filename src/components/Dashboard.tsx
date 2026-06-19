import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Material, Location, AppSettings, Loan, Log } from '../types';
import { getAvailableQuantity } from '../lib/inventoryUtils';
import { subHours, parse } from 'date-fns';

interface DashboardProps {
  materials: Material[];
  viaturas: Location[];
  loans: Loan[];
  logs: Log[];
  settings: AppSettings;
}

export function Dashboard({ materials = [], viaturas = [], loans = [], logs = [], settings }: DashboardProps) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeViaturas = Array.isArray(viaturas) ? viaturas : [];
  const systemMode = settings?.systemMode || 'local';

  // Filter for local data if needed, but usually dashboard shows everything available to the user
  const localMaterials = safeMaterials.filter(m => !m.unitId);
  const importedMaterials = safeMaterials.filter(m => m.unitId);
  
  const lowStockItems = safeMaterials.filter(m => getAvailableQuantity(m, safeViaturas, loans) <= m.minStock);
  const totalMaterials = safeMaterials.reduce((acc, m) => acc + (m.totalQuantity || 0), 0);
  const availableMaterials = safeMaterials.reduce((acc, m) => acc + getAvailableQuantity(m, safeViaturas, loans), 0);
  const operationalViaturas = safeViaturas.filter(v => v.type === 'viatura' && v.status === 'operacional').length;
  const totalViaturas = safeViaturas.filter(v => v.type === 'viatura').length;

  // New Indicators Calculation
  const activeLoans = loans.filter(l => l.status === 'ativo').length;
  
  const last24hLogs = logs.filter(log => {
    try {
      const logDate = parse(log.timestamp, 'dd/MM/yyyy HH:mm:ss', new Date());
      return logDate > subHours(new Date(), 24);
    } catch (e) {
      return false;
    }
  }).length;

  const allocatedMaterialsCount = safeMaterials.reduce((acc, m) => {
    const allocated = (m.totalQuantity || 0) - getAvailableQuantity(m, safeViaturas, loans);
    return acc + allocated;
  }, 0);

  const unitData = safeMaterials.reduce((acc: any[], m) => {
    const unitName = m.unitName || settings.unitName || 'Unidade Local';
    const existing = acc.find(item => item.name === unitName);
    if (existing) {
      existing.value += (m.totalQuantity || 0);
    } else {
      acc.push({ name: unitName, value: (m.totalQuantity || 0) });
    }
    return acc;
  }, []);

  const categoryData = safeMaterials.reduce((acc: any[], m) => {
    const existing = acc.find(item => item.name === m.category);
    if (existing) {
      existing.value += (m.totalQuantity || 0);
    } else {
      acc.push({ name: m.category || 'Sem Categoria', value: (m.totalQuantity || 0) });
    }
    return acc;
  }, []);

  const stockData = safeMaterials.slice(0, 5).map(m => ({
    name: m.name || 'Sem Nome',
    total: m.totalQuantity || 0,
    available: getAvailableQuantity(m, safeViaturas, loans)
  }));

  const COLORS = ['#B22222', '#FFD700', '#1A1A1A', '#808080', '#C0C0C0'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {systemMode === 'matriz' ? 'Painel Matriz' : 'Painel de Controle'}
        </h1>
        <p className="text-muted-foreground">
          {systemMode === 'matriz' 
            ? `Visão macro do ${settings.hierarchy?.matrizName || 'Grupamento'}.` 
            : `Visão geral da unidade ${settings.unitName}.`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#B22222]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterials}</div>
            <p className="text-xs text-muted-foreground">Itens registrados no sistema</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#FFD700]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viaturas Operacionais</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationalViaturas}/{totalViaturas}</div>
            <p className="text-xs text-muted-foreground">Prontas para atendimento</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Itens abaixo do limite mínimo</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibilidade</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterials > 0 ? Math.round((availableMaterials / totalMaterials) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">Materiais na reserva técnica</p>
          </CardContent>
        </Card>
      </div>

      {/* New Indicators Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-zinc-900 text-white border-none shadow-xl">
           <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#B22222]">Carga Ativa</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black">{allocatedMaterialsCount}</div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Materiais em viaturas/alocados</p>
                </div>
                <div className="h-10 w-10 bg-[#B22222]/20 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="text-[#B22222] h-5 w-5" />
                </div>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-zinc-900 text-white border-none shadow-xl">
           <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#FFD700]">Empréstimos</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black">{activeLoans}</div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Documentos de carga ativa</p>
                </div>
                <div className="h-10 w-10 bg-[#FFD700]/20 rounded-full flex items-center justify-center">
                  <Activity className="text-[#FFD700] h-5 w-5" />
                </div>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-zinc-900 text-white border-none shadow-xl">
           <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-500">Fluxo 24h</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black">{last24hLogs}</div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Registros de atividades recentes</p>
                </div>
                <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="text-emerald-500 h-5 w-5" />
                </div>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Nível de Estoque (Top 5)</CardTitle>
            <CardDescription>Comparativo entre total e disponível na reserva.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="total" fill="#B22222" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="available" fill="#FFD700" radius={[4, 4, 0, 0]} name="Disponível" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{systemMode === 'matriz' ? 'Distribuição por Unidade' : 'Distribuição por Categoria'}</CardTitle>
            <CardDescription>
              {systemMode === 'matriz' ? 'Volume de materiais por unidade importada.' : 'Volume de materiais por tipo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={systemMode === 'matriz' ? unitData : categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(systemMode === 'matriz' ? unitData : categoryData).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(systemMode === 'matriz' ? unitData : categoryData).map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
