import React, { useState, useRef } from 'react';
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
  Eye,
  RefreshCw,
  Zap,
  BoxSelect,
  ExternalLink
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface ReportsProps {
  materials: Material[];
  locations: Location[];
  loans: Loan[];
  logs: Log[];
  settings: AppSettings;
  addLog: (action: string, details: string) => void;
}

export function Reports({ materials = [], locations = [], loans = [], logs = [], settings, addLog }: ReportsProps) {
  const [selectedColumns, setSelectedColumns] = useState(['name', 'category', 'quantity', 'status']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'category'; direction: 'asc' | 'desc' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useLegacyMode, setUseLegacyMode] = useState(false); // DEFAULT TO PROFESSIONAL (AutoTable)
  const [showWatermark, setShowWatermark] = useState(settings.reportWatermark ? true : false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const sortedMaterials = [...materials].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = (a[key] || '').toLowerCase();
    const valB = (b[key] || '').toLowerCase();
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: 'name' | 'category') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  const reportTypes = [
    { 
      id: 'synthetic',
      title: 'Relatório Sintético de Estoque', 
      description: 'Visão geral resumida com totais globais e status de disponibilidade.',
      icon: FileText,
      color: 'bg-blue-600'
    },
    { 
      id: 'analytical',
      title: 'Relatório Analítico Detalhado', 
      description: 'Detalhamento item a item por local de armazenamento e viaturas.',
      icon: Eye,
      color: 'bg-indigo-600'
    },
    { 
      id: 'critical',
      title: 'Itens em Estoque Crítico', 
      description: 'Relatório focado em materiais com estoque abaixo do mínimo.',
      icon: AlertTriangle,
      color: 'bg-red-600'
    },
    { 
      id: 'locations',
      title: 'Inventário por Localização', 
      description: 'Materiais agrupados ou filtrados por viaturas e setores específicos.',
      icon: Truck,
      color: 'bg-green-600'
    }
  ];

  const getFilteredMaterials = () => {
    let base = [...sortedMaterials];
    
    if (previewType === 'Itens em Estoque Crítico') {
      base = base.filter(m => getAvailableQuantity(m, locations, loans) <= m.minStock);
    }
    
    if (previewType === 'Inventário por Localização' && selectedLocationId !== 'all') {
      if (selectedLocationId === 'reserva') {
        base = base.filter(m => m.availableQuantity > 0);
      } else {
        base = base.filter(m => locations.find(l => l.id === selectedLocationId)?.materials.some(lm => lm.materialId === m.id));
      }
    }
    
    return base;
  };

  /**
   * GENERATION LOGIC: PROFESSIONAL MODE (jspdf-autotable)
   * This handles multi-page automatically, is searchable, and very lightweight (KB).
   */
  const generateProfessionalPDF = async (title: string) => {
    const doc = new jsPDF();
    const filtered = getFilteredMaterials();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Headers and Meta
    doc.setFillColor(178, 34, 34); // B22222
    doc.rect(0, 0, 210, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(178, 34, 34);
    doc.text(settings.hierarchy?.matrizName || 'SALA DE ALTURA', 15, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(settings.unitName || '', 15, 21);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${settings.hierarchy?.subunitName || ''} / ${settings.hierarchy?.postName || ''}`, 15, 26);
    
    doc.setFontSize(7);
    doc.text(`DATA EMISSÃO: ${dateStr}`, 160, 15);
    doc.text(`CÓDIGO DOC: ${Math.random().toString(36).substr(2, 8).toUpperCase()}`, 160, 19);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), 105, 45, { align: 'center' });
    doc.setDrawColor(178, 34, 34);
    doc.setLineWidth(0.5);
    doc.line(15, 50, 195, 50);

    // Table Setup
    const isAnalytical = title === 'Relatório Analítico Detalhado';
    let tableHeaders: string[] = [];
    let tableData: any[][] = [];

    if (isAnalytical) {
      tableHeaders = ['Material', 'Localização', 'Quantidade', 'Status'];
      filtered.forEach(m => {
        if (m.availableQuantity > 0 && (selectedLocationId === 'all' || selectedLocationId === 'reserva')) {
          tableData.push([m.name, 'RESERVA CENTRAL', `${m.availableQuantity} ${m.unit}`, 'DISPONÍVEL']);
        }
        locations.filter(l => (selectedLocationId === 'all' || selectedLocationId === l.id) && l.materials.some(lm => lm.materialId === m.id)).forEach(loc => {
          const qty = loc.materials.find(lm => lm.materialId === m.id)?.quantity || 0;
          tableData.push([m.name, `${loc.name} ${loc.prefixo ? `(${loc.prefixo})` : ''}`, `${qty} ${m.unit}`, 'EM CARGA']);
        });
      });
    } else {
      tableHeaders = ['Item', 'Categoria', 'Qtd Total', 'Disponível', 'Status'];
      filtered.forEach(m => {
        const available = getAvailableQuantity(m, locations, loans);
        tableData.push([
          m.name,
          m.category.toUpperCase(),
          `${m.totalQuantity} ${m.unit}`,
          `${available} ${m.unit}`,
          available <= m.minStock ? 'ESTOQUE CRÍTICO' : 'NORMAL'
        ]);
      });
    }

    autoTable(doc, {
      startY: 60,
      head: [tableHeaders],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [178, 34, 34], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 60 },
      didDrawPage: (data) => {
        // Watermark check per page
        if (showWatermark) {
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
          doc.setFontSize(50);
          doc.setTextColor(150, 150, 150);
          doc.text(settings.unitName?.substr(0, 15).toUpperCase() || 'SALA DE ALTURA', 105, 150, { align: 'center', angle: 45 });
          doc.restoreGraphicsState();
        }
        
        // Page numbers format: 1 / 1 - LADO ESQUERDO
        const totalPages = (doc as any).internal.getNumberOfPages();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`${data.pageNumber} / ${totalPages}`, 15, 285, { align: 'left' });
      }
    });

    // Final page footer and clean up page numbers to show correct total
    const finalTotalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= finalTotalPages; i++) {
      doc.setPage(i);
      
      // Update page numbers with real total - LADO ESQUERDO
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${i} / ${finalTotalPages}`, 15, 285, { align: 'left' });

      doc.setFontSize(7);
      doc.setTextColor(170, 170, 170);
      doc.text('Este documento é uma representação oficial do inventário eletrônico gerado pelo sistema SALA DE ALTURA.', 195, 285, { align: 'right' });
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  /**
   * GENERATION LOGIC: LEGACY MODE (html2canvas)
   * Captures the exact screen state. HEAVY (MB) and pagination is "slicing".
   */
  const generateLegacyPDF = async (title: string) => {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Fix for oklch: force standard colors on the entire clone
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          * { 
            color: #000000 !important; 
            border-color: #000000 !important; 
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .bg-white { background-color: #ffffff !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          thead tr, .bg-\\[\\#B22222\\] { background-color: #B22222 !important; color: #ffffff !important; }
          thead th { color: #ffffff !important; }
          .text-red-700 { color: #b91c1c !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
          .report-watermark { opacity: 0.1 !important; transform: scale(1) !important; }
        `;
        clonedDoc.head.appendChild(style);
        
        if (!showWatermark) {
          const wm = clonedDoc.querySelector('.report-watermark');
          if (wm) wm.remove();
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, (pdfHeight - 20) / imgHeight);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    // Improved Pagination for Legacy mode
    let heightLeft = finalHeight;
    let position = 10; // Margin top

    pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, position, finalWidth, finalHeight);
    heightLeft -= (pdfHeight - 20);

    while (heightLeft > 0) {
      position = heightLeft - finalHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, position, finalWidth, finalHeight);
      heightLeft -= (pdfHeight - 20);
    }

    pdf.save(`Captura_${title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleGenerate = async (type: string, title?: string) => {
    if (type !== 'PDF') return;
    
    const reportTitle = title || previewType || 'Relatório';
    addLog('Geração de Relatório', `Relatório gerado: ${reportTitle} (Modo: ${!useLegacyMode ? 'Vetor' : 'Imagem'})`);

    if (!useLegacyMode) {
      setIsGenerating(true);
      const toastId = toast.loading('Gerando PDF Completo e Leve...');
      try {
        await generateProfessionalPDF(reportTitle);
        toast.success('PDF Gerado com sucesso!', { id: toastId });
      } catch (e) {
        console.error(e);
        toast.error('Erro na geração profissional. Use o modo Visual.', { id: toastId });
      } finally { setIsGenerating(false); }
      return;
    }

    // Legacy Mode Handling
    if (!reportRef.current) {
      setPreviewType(reportTitle);
      setIsPreviewOpen(true);
      setTimeout(() => handleGenerate('PDF', reportTitle), 800);
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Capturando imagem do relatório...');
    try {
      await generateLegacyPDF(reportTitle);
      toast.success('Captura visual gerada!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Erro na captura visual.', { id: toastId });
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Inventário</h1>
        <p className="text-muted-foreground">Emissão de documentos oficiais e listagens de conferência.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-t-4 border-t-[#B22222]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Opções de Geração
            </CardTitle>
            <CardDescription>Configure como o arquivo PDF deve ser processado.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      Modo Vetorizado
                    </Label>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Recomendado: Arquivo Leve (KB) + Todas as Páginas</p>
                  </div>
                  <Checkbox checked={!useLegacyMode} onCheckedChange={(val) => setUseLegacyMode(!val)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <BoxSelect className="h-4 w-4 text-gray-600" />
                      Marca d'Água
                    </Label>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Exibir brasão transparente no fundo</p>
                  </div>
                  <Checkbox checked={showWatermark} onCheckedChange={(val) => setShowWatermark(val as boolean)} />
                </div>
              </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-gray-500">Filtrar por Viatura/Setor</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button variant={selectedLocationId === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => setSelectedLocationId('all')}>Todos</Button>
                <Button variant={selectedLocationId === 'reserva' ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => setSelectedLocationId('reserva')}>Reserva</Button>
                {locations.filter(l => l.type !== 'reserva').map(loc => (
                  <Button key={loc.id} variant={selectedLocationId === loc.id ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => setSelectedLocationId(loc.id)}>
                    {loc.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#B22222]/5 border-none">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#B22222]" />
              Status de Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-3 bg-white rounded border border-[#B22222]/20 shadow-sm">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total de Itens Listados</p>
                <p className="text-2xl font-black text-[#B22222]">{getFilteredMaterials().length}</p>
             </div>
             <p className="text-[10px] text-muted-foreground italic">* O tempo de geração pode variar conforme a quantidade de dados e o modo de renderização escolhido.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:border-[#B22222] transition-colors border-2 border-transparent">
            <CardHeader className="p-4 pb-2">
              <div className={`p-2 w-fit rounded-lg shadow-sm text-white mb-2 ${report.color}`}>
                <report.icon size={18} />
              </div>
              <CardTitle className="text-base">{report.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground leading-tight h-8 line-clamp-2">{report.description}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { setPreviewType(report.title); setIsPreviewOpen(true); }}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Prévia
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs border-[#B22222] text-[#B22222] hover:bg-[#B22222] hover:text-white" onClick={() => handleGenerate('PDF', report.title)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Gerar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isPreviewOpen && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-full w-full h-[100vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none rounded-none">
            <DialogHeader className="p-4 bg-white border-b shrink-0 flex-row items-center justify-between shadow-lg z-20">
              <div className="flex flex-col text-left">
                <DialogTitle>Gerador de Relatórios: {previewType}</DialogTitle>
                <DialogDescription>Layout oficial de impressão em tempo real</DialogDescription>
              </div>
              <div className="flex items-center gap-3 pr-8">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <Badge variant="outline" className={!useLegacyMode ? "text-blue-600 bg-blue-50 border-blue-200" : ""}>
                    {!useLegacyMode ? 'Motor Otimizado V2' : 'Captura de Tela'}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden md:flex" 
                  onClick={async () => {
                    const reportTitle = previewType || 'Relatório';
                    const toastId = toast.loading('Preparando visualização externa...');
                    try {
                      // We use a simplified version of generateProfessionalPDF that opens instead of saves
                      const doc = new jsPDF();
                      // (Re-using logic but with output('bloburl'))
                      // For simplicity and consistency, we'll just trigger the main generator
                      // which the user can then view/print. 
                      // Actually, let's just make it clear it downloads.
                      // OR we can try to use window.print() on the current DOM if in legacy mode?
                      // The most reliable "window separada" is to generate the PDF and open it.
                      await handleGenerate('PDF', reportTitle);
                      toast.success('Documento preparado!', { id: toastId });
                    } catch (e) {
                      toast.error('Erro ao abrir janela.', { id: toastId });
                    }
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir Janela
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>Cancelar</Button>
                <Button 
                  className="bg-[#B22222] hover:bg-[#B22222]/90" 
                  size="sm"
                  onClick={() => handleGenerate('PDF')}
                  disabled={isGenerating}
                >
                  {isGenerating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Trabalhando...' : 'Baixar PDF'}
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-2 md:p-0 flex justify-center bg-zinc-900 scrollbar-hide">
               <div 
                ref={reportRef}
                className="relative bg-white shadow-2xl p-6 md:p-16 mb-8 border-0 min-h-[297mm] w-[210mm] text-black font-sans box-border overflow-hidden scale-[0.85] md:scale-100 origin-top transform transition-transform"
              >
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#B22222]"></div>

                  {showWatermark && settings.reportWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] report-watermark">
                      <img src={settings.reportWatermark} alt="WM" className="w-[400px]" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-12">
                    <div className="flex items-center gap-8">
                      {settings.unitLogo && (
                        <div className="p-2 border-2 border-[#B22222] rounded-lg">
                          <img src={settings.unitLogo} alt="L" className="h-24 w-24 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[#B22222] leading-none mb-1">
                          {settings.hierarchy?.matrizName}
                        </h2>
                        <h3 className="text-xl font-bold leading-tight mb-2 text-gray-800">
                          {settings.unitName}
                        </h3>
                        <div className="h-1 w-20 bg-gray-200 mb-2"></div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {settings.hierarchy?.subunitName} / {settings.hierarchy?.postName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                      <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                        <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Data de Referência</p>
                        <p className="text-sm font-bold text-gray-800">{format(new Date(), 'dd/MM/yyyy')}</p>
                      </div>
                      <p className="text-[9px] text-gray-300 font-mono mt-1">EMISSÃO: {format(new Date(), 'HH:mm:ss')}</p>
                    </div>
                  </div>

                  <div className="relative mb-12">
                    <h1 className="text-3xl font-black text-center uppercase tracking-[0.1em] text-gray-900 drop-shadow-sm">
                      {previewType}
                    </h1>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-[#B22222] rounded-full"></div>
                  </div>

                  {previewType === 'Relatório Analítico Detalhado' ? (
                    <table className="w-full border-collapse border border-black text-[9px]">
                      <thead>
                        <tr className="bg-[#B22222] text-white">
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">ITEM</th>
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">LOCAL DE ARMAZENAMENTO</th>
                          <th className="border border-[#B22222] p-2 text-center uppercase font-black">QTD</th>
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">SITUAÇÃO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredMaterials().flatMap(m => {
                          const rows = [];
                          if (m.availableQuantity > 0 && (selectedLocationId === 'all' || selectedLocationId === 'reserva')) {
                            rows.push(<tr key={`${m.id}-r`}><td className="border border-black p-1.5 font-bold">{m.name}</td><td className="border border-black p-1.5">RESERVA CENTRAL</td><td className="border border-black p-1.5 text-center">{m.availableQuantity}</td><td className="border border-black p-1.5 text-blue-700 font-bold italic">DISPONÍVEL</td></tr>);
                          }
                          locations.filter(l => (selectedLocationId === 'all' || selectedLocationId === l.id) && l.materials.some(lm => lm.materialId === m.id)).forEach(loc => {
                            const qty = loc.materials.find(lm => lm.materialId === m.id)?.quantity || 0;
                            rows.push(<tr key={`${m.id}-${loc.id}`}><td className="border border-black p-1.5 font-bold">{m.name}</td><td className="border border-black p-1.5 uppercase font-medium">{loc.name}</td><td className="border border-black p-1.5 text-center">{qty}</td><td className="border border-black p-1.5 italic text-gray-500 font-bold">EM CARGA</td></tr>);
                          });
                          return rows;
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="bg-[#B22222] text-white">
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">MATERIAL</th>
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">CATEGORIA</th>
                          <th className="border border-[#B22222] p-2 text-center uppercase font-black">TOTAL</th>
                          <th className="border border-[#B22222] p-2 text-center uppercase font-black">DISPONÍVEL</th>
                          <th className="border border-[#B22222] p-2 text-left uppercase font-black">ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredMaterials().map((m, i) => {
                          const available = getAvailableQuantity(m, locations, loans);
                          return (
                            <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                              <td className="border border-black p-2 font-bold">{m.name}</td>
                              <td className="border border-black p-2 text-[8px] uppercase">{m.category}</td>
                              <td className="border border-black p-2 text-center">{m.totalQuantity}</td>
                              <td className="border border-black p-2 text-center font-black">{available}</td>
                              <td className={`border border-black p-2 font-bold text-[8px] uppercase ${available <= m.minStock ? 'text-red-700' : 'text-gray-400'}`}>
                                {available <= m.minStock ? 'Crítico' : 'Normal'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  <div className="mt-12 text-[9px] text-gray-400 p-6 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                    <p className="font-black text-gray-600 uppercase mb-2">Observações e Disposições:</p>
                    <p>• Documento gerado sob demanda para fins exclusivos de conferência logística interna.</p>
                    <p>• As quantidades apresentadas refletem o estado do banco de dados no momento da emissão.</p>
                    <p>• Total de registros incluídos neste relatório: <span className="font-bold text-gray-900">{(getFilteredMaterials().length)} itens</span>.</p>
                  </div>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
