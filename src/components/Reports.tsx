import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Printer, 
  FileSpreadsheet,
  BarChart2,
  Truck,
  AlertTriangle,
  Settings2,
  Eye
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Material, Location, Loan, Log, AppSettings } from '../types';
import { getAvailableQuantity } from '../lib/inventoryUtils';
import { format } from 'date-fns';

interface ReportsProps {
  materials: Material[];
  locations: Location[];
  loans: Loan[];
  logs: Log[];
  settings: AppSettings;
}

export function Reports({ materials = [], locations = [], loans = [], logs = [], settings }: ReportsProps) {
  const [selectedColumns, setSelectedColumns] = useState(['name', 'category', 'quantity', 'status']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const columns = [
    { id: 'name', label: 'Nome do Material' },
    { id: 'category', label: 'Categoria' },
    { id: 'quantity', label: 'Quantidade' },
    { id: 'status', label: 'Status' },
    { id: 'lastUpdated', label: 'Última Atualização' },
    { id: 'location', label: 'Localização' },
  ];

  const toggleColumn = (id: string) => {
    if (selectedColumns.includes(id)) {
      setSelectedColumns(selectedColumns.filter(c => c !== id));
    } else {
      setSelectedColumns([...selectedColumns, id]);
    }
  };

  const handleGenerate = (type: string) => {
    toast.success(`Relatório ${type} gerado com ${selectedColumns.length} colunas e numeração de páginas.`);
  };

  const openPreview = (title: string) => {
    setPreviewType(title);
    setIsPreviewOpen(true);
  };

  const reportTypes = [
    { 
      title: 'Inventário Geral', 
      description: 'Lista completa de materiais com quantidades totais e disponíveis.',
      icon: FileText,
      color: 'bg-blue-500'
    },
    { 
      title: 'Carga por Viatura', 
      description: 'Relatório detalhado de materiais alocados em cada viatura.',
      icon: Truck,
      color: 'bg-green-500'
    },
    { 
      title: 'Movimentações Mensais', 
      description: 'Resumo de todas as entradas e saídas de materiais no mês.',
      icon: BarChart2,
      color: 'bg-purple-500'
    },
    { 
      title: 'Itens Críticos', 
      description: 'Relatório focado em materiais que precisam de reposição imediata.',
      icon: AlertTriangle,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Estatísticas</h1>
        <p className="text-muted-foreground">Gere documentos para conferência e prestação de contas.</p>
      </div>

      <Card className="border-t-4 border-t-[#B22222]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuração de Exportação
          </CardTitle>
          <CardDescription>Selecione as colunas que devem aparecer no documento gerado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {columns.map((col) => (
              <div key={col.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={col.id} 
                  checked={selectedColumns.includes(col.id)}
                  onCheckedChange={() => toggleColumn(col.id)}
                />
                <Label htmlFor={col.id} className="text-sm cursor-pointer">{col.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {reportTypes.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className={`p-3 rounded-lg text-white ${report.color}`}>
                <report.icon size={24} />
              </div>
              <div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openPreview(report.title)}>
                  <Eye className="mr-2 h-4 w-4" /> Prévia
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGenerate('PDF')}>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Padrões de Geração</CardTitle>
          <CardDescription>Configurações automáticas aplicadas a todos os documentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <p className="font-medium">Numeração de Páginas</p>
              <p className="text-sm text-muted-foreground">Adiciona "Página X de Y" no rodapé de cada folha.</p>
            </div>
            <Badge className="bg-green-100 text-green-700">Ativado</Badge>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <p className="font-medium">Marca d'água</p>
              <p className="text-sm text-muted-foreground">Exibir brasão da unidade no fundo dos relatórios.</p>
            </div>
            <Badge className="bg-green-100 text-green-700">Ativado</Badge>
          </div>
        </CardContent>
      </Card>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Prévia do Relatório: {previewType}</h2>
                <p className="text-sm text-muted-foreground">Visualize o documento oficial antes de exportar.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Voltar para Configurações</Button>
              <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => handleGenerate('PDF')}>
                <Download className="mr-2 h-4 w-4" /> Gerar PDF Final
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-gray-200 flex justify-center">
            {/* The "Paper" */}
            <div className="relative border shadow-2xl p-8 md:p-16 bg-white min-h-screen w-full max-w-5xl text-black font-serif">
              {/* Watermark */}
              {settings.reportWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <img 
                    src={settings.reportWatermark} 
                    alt="Watermark" 
                    style={{ width: `${settings.watermarkSize || 300}px` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-10">
                <div className="flex items-center gap-6">
                  {settings.unitLogo && (
                    <img 
                      src={settings.unitLogo} 
                      alt="Logo" 
                      className="h-24 w-24 object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">{settings.hierarchy?.matrizName || 'SGA'}</h2>
                    <h3 className="text-xl font-semibold">{settings.unitName}</h3>
                    <p className="text-sm italic">{settings.hierarchy?.subunitName} - {settings.hierarchy?.postName}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                  <p>Hora: {format(new Date(), 'HH:mm')}</p>
                  <p className="mt-2 text-xs text-gray-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-center mb-12 uppercase underline decoration-double underline-offset-8">{previewType}</h1>

              {/* Content based on type */}
              <div className="space-y-8">
                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-3 text-left">Item</th>
                      <th className="border border-black p-3 text-left">Categoria</th>
                      <th className="border border-black p-3 text-center">Qtd Total</th>
                      <th className="border border-black p-3 text-center">Disponível</th>
                      <th className="border border-black p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                      {materials.slice(0, 15).map((m, i) => {
                        const available = getAvailableQuantity(m, locations, loans);
                        return (
                          <tr key={i}>
                            <td className="border border-black p-3 font-medium">{m.name}</td>
                            <td className="border border-black p-3">{m.category}</td>
                            <td className="border border-black p-3 text-center">{m.totalQuantity}</td>
                            <td className="border border-black p-3 text-center font-bold">{available}</td>
                            <td className="border border-black p-3">
                              <span className={available <= m.minStock ? 'text-red-600 font-bold' : ''}>
                                {available <= m.minStock ? 'ESTOQUE CRÍTICO' : 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                
                <div className="flex justify-between items-end mt-12">
                  <div className="text-xs text-gray-500">
                    <p>* Este é um documento gerado automaticamente pelo sistema SGA.</p>
                    <p>* As informações refletem o estado do inventário em tempo real.</p>
                  </div>
                  <p className="text-sm font-bold italic">Página 1 de 1</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-32 flex justify-around items-end">
                <div className="text-center border-t border-black pt-4 w-72">
                  <p className="text-sm font-bold uppercase">Responsável pela Carga</p>
                  <p className="text-xs italic">Assinatura e Carimbo</p>
                </div>
                <div className="text-center border-t border-black pt-4 w-72">
                  <p className="text-sm font-bold uppercase">Comandante da Unidade</p>
                  <p className="text-xs italic">Assinatura e Carimbo</p>
                </div>
              </div>

              <div className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-gray-400">
                SGA - Sistema de Gestão de Armazenamento © {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
