import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loan, Material, Location, AppSettings } from '../types';

interface GenerateReceiptPDFOptions {
  loan: Loan;
  materials: Material[];
  locations: Location[];
  settings?: AppSettings;
  action?: 'download' | 'print';
}

interface GenerateReturnReceiptPDFOptions {
  loan: Loan;
  materials: Material[];
  locations: Location[];
  settings?: AppSettings;
  action?: 'download' | 'print';
}

interface GenerateReportPDFOptions {
  loans: Loan[];
  materials: Material[];
  locations: Location[];
  settings?: AppSettings;
  statusFilter?: 'todos' | 'ativo' | 'devolvido';
}

/**
 * Retorna o nome amigável do material dado o seu ID
 */
export function resolveMaterialName(materials: Material[], materialId: string): string {
  const found = materials.find(m => m.id === materialId);
  return found?.name || materialId;
}

/**
 * Retorna os detalhes completos do material
 */
export function resolveMaterialDetails(materials: Material[], materialId: string): Material | undefined {
  return materials.find(m => m.id === materialId);
}

/**
 * Retorna a descrição legível da origem da retirada
 */
export function resolveLocationName(locations: Location[], sourceLocationId?: string): string {
  if (!sourceLocationId || sourceLocationId === 'reserva') {
    return 'Reserva Central';
  }
  const loc = locations.find(l => l.id === sourceLocationId);
  if (!loc) return 'Reserva Central';
  return `${loc.name} ${loc.prefixo ? `(${loc.prefixo})` : ''}`.trim();
}

/**
 * Imprime via iframe oculto sem usar window.open
 */
function printBlobPdf(doc: jsPDF): void {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;
  
  document.body.appendChild(iframe);
  
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Falha ao abrir impressão direta:', e);
      // Fallback: faz o download
      doc.save(`Comprovante_${Date.now()}.pdf`);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    }
  };
}

/**
 * Gera o Comprovante Oficial de Retirada de Materiais (Cautela / Termo de Responsabilidade)
 */
export async function generateWithdrawalReceiptPDF({
  loan,
  materials,
  locations,
  settings,
  action = 'download'
}: GenerateReceiptPDFOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const originName = resolveLocationName(locations, loan.sourceLocationId);
  const protocol = `CAUTELA-${(loan.id || '').slice(-6).toUpperCase() || '000001'}`;

  // Faixa superior institucional #B22222
  doc.setFillColor(178, 34, 34);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Cabeçalho Oficial
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(178, 34, 34);
  doc.text(settings?.hierarchy?.matrizName || 'SALA DE ALTURA', marginX, 15);

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(settings?.unitName || 'CORPO DE BOMBEIROS', marginX, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings?.hierarchy?.subunitName || 'Companhia'} / ${settings?.hierarchy?.postName || 'Posto Operacional'}`, marginX, 25);

  // Metadados do documento à direita
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`PROTOCOLO: ${protocol}`, pageWidth - marginX, 15, { align: 'right' });
  doc.text(`EMISSÃO: ${dateStr}`, pageWidth - marginX, 20, { align: 'right' });
  doc.text(`STATUS: ${loan.status === 'ativo' ? 'EM CARGA (ATIVO)' : 'DEVOLVIDO'}`, pageWidth - marginX, 25, { align: 'right' });

  // Linha separadora institucional
  doc.setDrawColor(178, 34, 34);
  doc.setLineWidth(0.6);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // Título do Documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('COMPROVANTE DE RETIRADA DE MATERIAIS', pageWidth / 2, 38, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('TERMO DE CAUTELA OPERACIONAL E RESPONSABILIDADE', pageWidth / 2, 43, { align: 'center' });

  // Bloco de Identificação da Carga / Operação (altura ajustada para 41mm para comportar o responsável pela entrega)
  const infoBoxHeight = 41;
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, 47, pageWidth - (marginX * 2), infoBoxHeight, 2, 2, 'FD');

  // Faixa do bloco
  doc.setFillColor(178, 34, 34);
  doc.rect(marginX, 47, 2, infoBoxHeight, 'F');

  // Linhas do bloco de informações
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);

  // Coluna 1
  const col1X = marginX + 5;
  const col2X = marginX + 95;
  
  doc.text('MILITAR RESPONSÁVEL:', col1X, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(178, 34, 34);
  doc.text((loan.soldierName || 'NÃO INFORMADO').toUpperCase(), col1X + 38, 53);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DESTINO / FINALIDADE:', col1X, 60);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(loan.destination || 'Operação de Rotina', col1X + 38, 60);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('CURSO / MISSÃO:', col1X, 67);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(loan.courseName || 'Missão Operacional', col1X + 38, 67);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('LOCAL DE RETIRADA:', col1X, 74);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(originName, col1X + 38, 74);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('RESP. PELA ENTREGA:', col1X, 81);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(loan.deliveryResponsible || 'Encarregado da Reserva', col1X + 38, 81);

  // Coluna 2
  const formattedExit = loan.exitDate 
    ? format(new Date(loan.exitDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
    : '-';
  const formattedReturn = loan.returnDate 
    ? format(new Date(loan.returnDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
    : '-';

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DATA/HORA SAÍDA:', col2X, 53);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(formattedExit, col2X + 35, 53);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('PREVISÃO RETORNO:', col2X, 60);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(loan.expectedDuration || 'Conforme escala', col2X + 35, 60);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DATA DEVOLUÇÃO:', col2X, 67);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(formattedReturn, col2X + 35, 67);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('SITUAÇÃO:', col2X, 74);
  doc.setFont('helvetica', 'bold');
  if (loan.status === 'ativo') {
    doc.setTextColor(190, 80, 10);
    doc.text(loan.hasMissingItems ? 'ABERTO (COM FALTAS)' : 'CARGA EM ABERTO', col2X + 35, 74);
  } else {
    doc.setTextColor(20, 120, 50);
    doc.text(loan.hasMissingItems ? 'ENCERRADO COM FALTAS' : 'DEVOLVIDO INTEGRAL', col2X + 35, 74);
  }

  // Tabela de Materiais Retirados
  const tableData = (loan.materials || []).map((item, index) => {
    const mat = resolveMaterialDetails(materials, item.materialId);
    const desc = mat?.name || item.materialId;
    const cat = mat?.category ? mat.category.toUpperCase() : 'GERAL';
    const unit = mat?.unit || 'un';
    return [
      (index + 1).toString().padStart(2, '0'),
      item.materialId,
      desc,
      cat,
      item.quantity.toString(),
      unit
    ];
  });

  const totalQuantity = (loan.materials || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  autoTable(doc, {
    startY: 92,
    head: [['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO MATERIAL', 'CATEGORIA', 'QUANTIDADE', 'UNIDADE']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [178, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'italic', textColor: [100, 100, 100] },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [178, 34, 34] },
      5: { cellWidth: 16, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      // Numeração do lado esquerdo conforme padrão do sistema
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`${data.pageNumber} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
      doc.text('SALA DE ALTURA - Sistema de Gestão e Inventário Operacional', pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 135;

  // Linha de totalizador
  currentY += 4;
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 7, 1, 1, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`TOTAL DE ITENS: ${(loan.materials || []).length} tipo(s)`, marginX + 4, currentY + 4.8);
  doc.text(`TOTAL DE UNIDADES RETIRADAS: ${totalQuantity}`, pageWidth - marginX - 4, currentY + 4.8, { align: 'right' });

  currentY += 11;

  // Observações se existirem
  if (loan.observations && loan.observations.trim()) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(210, 210, 210);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 12, 1, 1, 'D');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(178, 34, 34);
    doc.text('OBSERVAÇÕES:', marginX + 3, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitObs = doc.splitTextToSize(loan.observations.trim(), pageWidth - (marginX * 2) - 6);
    doc.text(splitObs, marginX + 3, currentY + 8);
    currentY += 16;
  }

  // Se estiver muito perto do fim da página, cria nova página para os termos e assinaturas
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 25;
  }

  // Termo de Responsabilidade e Cautela
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(210, 210, 210);
  doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 22, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(178, 34, 34);
  doc.text('TERMO DE COMPROMISSO E RESPONSABILIDADE', marginX + 4, currentY + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const termoTexto = 
    'Declaro haver recebido nesta data o(s) material(is) e equipamento(s) acima discriminados em perfeito estado de conservação e condições de operacionalidade, assumindo integral responsabilidade pela sua guarda, zelo, utilização adequada e restituição ao almoxarifado/reserva nas mesmas condições em que foram entregues, comunicando imediatamente qualquer avaria, sinistro ou inconformidade.';
  const termoLines = doc.splitTextToSize(termoTexto, pageWidth - (marginX * 2) - 8);
  doc.text(termoLines, marginX + 4, currentY + 10);

  currentY += 28;

  // Bloco de Assinaturas (Lado a Lado)
  const signWidth = 80;
  const sign1X = marginX + 5;
  const sign2X = pageWidth - marginX - signWidth - 5;
  const lineY = currentY + 16;

  // Assinatura Militar Retirante
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(sign1X, lineY, sign1X + signWidth, lineY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text((loan.soldierName || 'Militar Responsável').toUpperCase(), sign1X + (signWidth / 2), lineY + 4, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Militar Responsável pela Retirada', sign1X + (signWidth / 2), lineY + 7.5, { align: 'center' });

  // Assinatura Responsável pela Entrega
  const deliveryRespName = (loan.deliveryResponsible || 'Encarregado / Armeiro').toUpperCase();
  doc.line(sign2X, lineY, sign2X + signWidth, lineY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(deliveryRespName, sign2X + (signWidth / 2), lineY + 4, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Responsável pela Entrega / Sala de Altura', sign2X + (signWidth / 2), lineY + 7.5, { align: 'center' });

  // Atualização final de total de páginas em todas as páginas (numeração à esquerda)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${i} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
  }

  const safeSoldierName = (loan.soldierName || 'Militar').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `Comprovante_Retirada_${safeSoldierName}_${protocol}.pdf`;

  if (action === 'print') {
    printBlobPdf(doc);
  } else {
    doc.save(fileName);
  }
}

/**
 * Gera o Termo / Ficha Oficial de Devolução com Conferência e Observações de Faltas
 */
export async function generateReturnReceiptPDF({
  loan,
  materials,
  locations,
  settings,
  action = 'download'
}: GenerateReturnReceiptPDFOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const originName = resolveLocationName(locations, loan.sourceLocationId);
  const protocol = `DEV-${(loan.id || '').slice(-6).toUpperCase() || '000001'}`;

  // Faixa superior institucional: #1e3a8a se normal ou #B22222 se com faltas
  const isPendingFaltas = Boolean(loan.hasMissingItems);
  const primaryColor: [number, number, number] = isPendingFaltas ? [178, 34, 34] : [22, 101, 52];

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Cabeçalho Oficial
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(settings?.hierarchy?.matrizName || 'SALA DE ALTURA', marginX, 15);

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(settings?.unitName || 'CORPO DE BOMBEIROS', marginX, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings?.hierarchy?.subunitName || 'Companhia'} / ${settings?.hierarchy?.postName || 'Posto Operacional'}`, marginX, 25);

  // Metadados do documento à direita
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`FICHA: ${protocol}`, pageWidth - marginX, 15, { align: 'right' });
  doc.text(`CONFERÊNCIA: ${dateStr}`, pageWidth - marginX, 20, { align: 'right' });
  doc.text(
    `SITUAÇÃO: ${isPendingFaltas ? 'COM MATERIAIS FALTANTES' : 'DEVOLUÇÃO INTEGRAL'}`, 
    pageWidth - marginX, 
    25, 
    { align: 'right' }
  );

  // Linha separadora institucional
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.6);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // Título do Documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('TERMO DE DEVOLUÇÃO E CONFERÊNCIA DE MATERIAIS', pageWidth / 2, 38, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    isPendingFaltas 
      ? 'FICHA DE RECEBIMENTO PARCIAL / REGISTRO DE MATERIAIS FALTANTES' 
      : 'FICHA REGULAR DE BAIXA E CONFERÊNCIA DE CAUTELA OPERACIONAL', 
    pageWidth / 2, 
    43, 
    { align: 'center' }
  );

  // Bloco de Identificação
  const infoBoxHeight = 44;
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, 47, pageWidth - (marginX * 2), infoBoxHeight, 2, 2, 'FD');

  // Faixa do bloco
  doc.setFillColor(...primaryColor);
  doc.rect(marginX, 47, 2, infoBoxHeight, 'F');

  // Linhas do bloco de informações
  const col1X = marginX + 5;
  const col2X = marginX + 95;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('MILITAR DEVOLVENTE:', col1X, 53);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text((loan.soldierName || 'NÃO INFORMADO').toUpperCase(), col1X + 40, 53);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DESTINO / FINALIDADE:', col1X, 60);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(loan.destination || 'Operação de Rotina', col1X + 40, 60);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('LOCAL DE RETIRADA:', col1X, 67);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(originName, col1X + 40, 67);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('RESP. PELA ENTREGA:', col1X, 74);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(loan.deliveryResponsible || 'Encarregado da Reserva', col1X + 40, 74);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('RESP. RECEBIMENTO:', col1X, 81);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(loan.returnResponsible || 'Armeiro / Recebedor', col1X + 40, 81);

  // Coluna 2
  const formattedExit = loan.exitDate 
    ? format(new Date(loan.exitDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
    : '-';
  const formattedReturn = loan.returnDate 
    ? format(new Date(loan.returnDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
    : format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DATA/HORA SAÍDA:', col2X, 53);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(formattedExit, col2X + 38, 53);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('DATA DA DEVOLUÇÃO:', col2X, 60);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(formattedReturn, col2X + 38, 60);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('STATUS DO PROCESSO:', col2X, 67);
  doc.setFont('helvetica', 'bold');
  if (loan.status === 'ativo') {
    doc.setTextColor(190, 80, 10);
    doc.text('CARGA ABERTA (PENDÊNCIAS)', col2X + 38, 67);
  } else {
    doc.setTextColor(20, 120, 50);
    doc.text('CARGA ENCERRADA / BAIXADA', col2X + 38, 67);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('CONFERÊNCIA:', col2X, 74);
  doc.setFont('helvetica', 'bold');
  if (isPendingFaltas) {
    doc.setTextColor(178, 34, 34);
    doc.text('COM ITENS FALTANTES', col2X + 38, 74);
  } else {
    doc.setTextColor(20, 120, 50);
    doc.text('100% CONFORME / REGULAR', col2X + 38, 74);
  }

  // Tabela de Conferência Item a Item
  const returnedMap = new Map<string, number>();
  (loan.returnedMaterials || []).forEach(rm => {
    returnedMap.set(rm.materialId, (returnedMap.get(rm.materialId) || 0) + rm.quantity);
  });

  const missingMap = new Map<string, number>();
  (loan.missingMaterials || []).forEach(mm => {
    missingMap.set(mm.materialId, (missingMap.get(mm.materialId) || 0) + mm.quantity);
  });

  const tableData = (loan.materials || []).map((item, index) => {
    const mat = resolveMaterialDetails(materials, item.materialId);
    const desc = mat?.name || item.materialId;
    const unit = mat?.unit || 'un';
    const totalRetirado = item.quantity;
    
    // Se há registro explícito de devolução
    let qtyDevolvida = returnedMap.get(item.materialId);
    let qtyFaltando = missingMap.get(item.materialId);

    if (qtyDevolvida === undefined && qtyFaltando === undefined) {
      if (loan.status === 'devolvido' && !loan.hasMissingItems) {
        qtyDevolvida = totalRetirado;
        qtyFaltando = 0;
      } else {
        qtyDevolvida = totalRetirado;
        qtyFaltando = 0;
      }
    } else {
      qtyDevolvida = qtyDevolvida || 0;
      qtyFaltando = qtyFaltando ?? Math.max(0, totalRetirado - qtyDevolvida);
    }

    const situacaoItem = (qtyFaltando && qtyFaltando > 0)
      ? `FALTA (${qtyFaltando} ${unit})`
      : 'DEVOLVIDO INTEGRAL';

    return [
      (index + 1).toString().padStart(2, '0'),
      item.materialId,
      desc,
      `${totalRetirado} ${unit}`,
      `${qtyDevolvida} ${unit}`,
      `${qtyFaltando || 0} ${unit}`,
      situacaoItem
    ];
  });

  autoTable(doc, {
    startY: 96,
    head: [['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO MATERIAL', 'RETIRADO', 'DEVOLVIDO', 'FALTANDO', 'CONFERÊNCIA']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'italic', textColor: [100, 100, 100] },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [22, 101, 52] },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [178, 34, 34] },
      6: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`${data.pageNumber} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
      doc.text('SALA DE ALTURA - Ficha Oficial de Devolução e Conferência', pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 140;

  // Bloco de Observações / Termo de Devolução
  currentY += 5;
  if (loan.returnObservations && loan.returnObservations.trim()) {
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(234, 179, 8);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 16, 1, 1, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(161, 98, 7);
    doc.text('TERMO / OBSERVAÇÕES REGISTRADAS NA DEVOLUÇÃO:', marginX + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitReturnObs = doc.splitTextToSize(loan.returnObservations.trim(), pageWidth - (marginX * 2) - 6);
    doc.text(splitReturnObs, marginX + 3, currentY + 9.5);
    currentY += 20;
  }

  // Bloco de Materiais Faltantes (se houver)
  if (loan.missingObservations && loan.missingObservations.trim()) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 16, 1, 1, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('REGISTRO OFICIAL DE MATERIAIS FALTANTES / PENDENTES:', marginX + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const splitMissingObs = doc.splitTextToSize(loan.missingObservations.trim(), pageWidth - (marginX * 2) - 6);
    doc.text(splitMissingObs, marginX + 3, currentY + 9.5);
    currentY += 20;
  }

  // Se estiver muito próximo do rodapé, nova página para termo legal e assinaturas
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 25;
  }

  // Termo de Declaração de Devolução
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(210, 210, 210);
  doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 22, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('DECLARAÇÃO DE DEVOLUÇÃO E CONFERÊNCIA', marginX + 4, currentY + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const termoDevolucaoTexto = isPendingFaltas
    ? 'Certifico que os materiais devolvidos foram devidamente conferidos e reintegrados ao acervo, constando as pendências e faltas discriminadas acima. O militar responsável fica ciente das pendências registradas nesta ficha para as devidas providências administrativas regulamentares.'
    : 'Certifico haver recebido e conferido integralmente todos os materiais listados neste documento em perfeita conformidade, dando baixa total na respectiva carga e cautela operacional.';
  const lines = doc.splitTextToSize(termoDevolucaoTexto, pageWidth - (marginX * 2) - 8);
  doc.text(lines, marginX + 4, currentY + 10);

  currentY += 28;

  // Bloco de Assinaturas (Lado a Lado)
  const signWidth = 80;
  const sign1X = marginX + 5;
  const sign2X = pageWidth - marginX - signWidth - 5;
  const lineY = currentY + 16;

  // Assinatura Militar Devolvente
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(sign1X, lineY, sign1X + signWidth, lineY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text((loan.soldierName || 'Militar Devolvente').toUpperCase(), sign1X + (signWidth / 2), lineY + 4, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Militar Responsável pela Cautela', sign1X + (signWidth / 2), lineY + 7.5, { align: 'center' });

  // Assinatura Responsável pelo Recebimento
  const returnRespName = (loan.returnResponsible || 'Armeiro / Recebedor').toUpperCase();
  doc.line(sign2X, lineY, sign2X + signWidth, lineY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(returnRespName, sign2X + (signWidth / 2), lineY + 4, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Responsável pela Conferência / Recebimento', sign2X + (signWidth / 2), lineY + 7.5, { align: 'center' });

  // Atualização final de total de páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${i} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
  }

  const safeSoldierName = (loan.soldierName || 'Militar').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `Termo_Devolucao_${safeSoldierName}_${protocol}.pdf`;

  if (action === 'print') {
    printBlobPdf(doc);
  } else {
    doc.save(fileName);
  }
}

/**
 * Gera o Relatório Geral Consolidado de Retiradas de Materiais (Empréstimos / Cargas)
 */
export async function generateWithdrawalsReportPDF({
  loans = [],
  materials = [],
  locations = [],
  settings,
  statusFilter = 'todos'
}: GenerateReportPDFOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  // Filtra empréstimos se necessário
  let filtered = [...loans];
  if (statusFilter !== 'todos') {
    filtered = filtered.filter(l => l.status === statusFilter);
  }

  // Faixa superior institucional #B22222
  doc.setFillColor(178, 34, 34);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Cabeçalho Institucional
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(178, 34, 34);
  doc.text(settings?.hierarchy?.matrizName || 'SALA DE ALTURA', marginX, 15);

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(settings?.unitName || 'CORPO DE BOMBEIROS', marginX, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings?.hierarchy?.subunitName || 'Companhia'} / ${settings?.hierarchy?.postName || 'Posto Operacional'}`, marginX, 25);

  // Metadados do documento
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`EMISSÃO: ${dateStr}`, pageWidth - marginX, 15, { align: 'right' });
  doc.text(`TOTAL REGISTROS: ${filtered.length}`, pageWidth - marginX, 20, { align: 'right' });
  doc.text(`FILTRO: ${statusFilter.toUpperCase()}`, pageWidth - marginX, 25, { align: 'right' });

  // Linha separadora institucional
  doc.setDrawColor(178, 34, 34);
  doc.setLineWidth(0.6);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // Título do Relatório
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('RELATÓRIO CONSOLIDADO DE RETIRADA DE MATERIAIS', pageWidth / 2, 38, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CONTROLE GERAL DE CAUTELAS OPERACIONAIS E CARGAS TEMPORÁRIAS', pageWidth / 2, 43, { align: 'center' });

  // Montagem da tabela
  const tableData = filtered.map(loan => {
    const origin = resolveLocationName(locations, loan.sourceLocationId);
    const exit = loan.exitDate ? format(new Date(loan.exitDate), 'dd/MM/yy HH:mm') : '-';
    
    let status = 'EM CARGA';
    if (loan.status === 'devolvido') {
      status = loan.hasMissingItems ? 'BAIXADO C/ FALTAS' : 'DEVOLVIDO';
    } else if (loan.hasMissingItems) {
      status = 'ABERTO C/ FALTAS';
    }

    const itemsSummary = (loan.materials || []).map(m => {
      const name = resolveMaterialName(materials, m.materialId);
      return `${m.quantity}x ${name}`;
    }).join('; ');

    const totalQty = (loan.materials || []).reduce((acc, m) => acc + (m.quantity || 0), 0);

    return [
      loan.soldierName || 'Não identificado',
      loan.destination || 'Sem destino',
      origin,
      loan.deliveryResponsible ? `${itemsSummary} (Entregue por: ${loan.deliveryResponsible})` : `${itemsSummary} (${totalQty} un)`,
      exit,
      status
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [['MILITAR / RESPONSÁVEL', 'DESTINO / MISSÃO', 'LOCAL RETIRADA', 'MATERIAIS RETIRADOS', 'DATA SAÍDA', 'STATUS']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [178, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 26 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [246, 246, 246]
    },
    margin: { left: marginX, right: marginX, top: 40, bottom: 15 },
    didDrawPage: (data) => {
      // Numeração do lado esquerdo
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`${data.pageNumber} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
      doc.text('Documento oficial emitido eletronicamente pelo sistema SALA DE ALTURA', pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }
  });

  // Ajusta total de páginas em todas as páginas (numeração à esquerda)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${i} / ${totalPages}`, marginX, pageHeight - 8, { align: 'left' });
  }

  doc.save(`Relatorio_Retirada_Materiais_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
}
