import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Briefcase,
  User as UserIcon,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Minus,
  Truck,
  Warehouse,
  Package,
  Layers,
  Check,
  X,
  Printer,
  FileText,
  Download,
  FileCheck,
  RotateCcw,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { Loan, Material, Location, User, AppSettings } from '../types';
import { getAvailableQuantity } from '../lib/inventoryUtils';
import { 
  generateWithdrawalReceiptPDF, 
  generateWithdrawalsReportPDF,
  generateReturnReceiptPDF
} from '../lib/receiptPdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LoansProps {
  loans: Loan[];
  setLoans: (loans: Loan[]) => void;
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  addLog: (action: string, details: string) => void;
  currentUser?: User | null;
  settings?: AppSettings;
}

interface SelectedMaterialItem {
  materialId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  availableMax: number;
}

export function Loans({ 
  loans = [], 
  setLoans, 
  materials = [], 
  locations = [], 
  setLocations, 
  addLog,
  currentUser,
  settings
}: LoansProps) {
  const safeLoans = useMemo(() => Array.isArray(loans) ? loans : [], [loans]);
  const safeMaterials = useMemo(() => Array.isArray(materials) ? materials : [], [materials]);
  const safeLocations = useMemo(() => Array.isArray(locations) ? locations : [], [locations]);

  // Privilégios de Administrador
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    const username = (currentUser.username || '').toLowerCase();
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    
    return (
      role === 'super' ||
      role === 'admin' ||
      username === 'admin' ||
      username === 'cavalieri' ||
      perms.includes('admin') ||
      perms.includes('loans') ||
      perms.includes('loans_admin') ||
      perms.includes('settings') ||
      perms.includes('all')
    );
  }, [currentUser]);

  // Estados de Filtro e Busca na Lista Principal
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'devolvido' | 'faltas'>('todos');

  // Modal de Criação de Empréstimo
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    soldierName: '',
    destination: '',
    courseName: '',
    expectedDuration: '',
    observations: '',
    deliveryResponsible: '',
    sourceType: 'reserva' as 'reserva' | 'location',
    sourceLocationId: ''
  });

  // Lista de materiais adicionados à retirada atual (Múltiplos materiais)
  const [selectedItems, setSelectedItems] = useState<SelectedMaterialItem[]>([]);
  
  // Estado para o seletor do material e quantidade a adicionar
  const [currentMaterialId, setCurrentMaterialId] = useState<string>('');
  const [currentMaterialQty, setCurrentMaterialQty] = useState<number>(1);
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');

  // Modal de Edição (Apenas Admin)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editFormData, setEditFormData] = useState({
    soldierName: '',
    destination: '',
    courseName: '',
    expectedDuration: '',
    observations: '',
    deliveryResponsible: '',
    returnResponsible: '',
    returnObservations: '',
    missingObservations: '',
    status: 'ativo' as 'ativo' | 'devolvido'
  });
  const [editItems, setEditItems] = useState<SelectedMaterialItem[]>([]);
  const [editAddMaterialId, setEditAddMaterialId] = useState<string>('');
  const [editAddQty, setEditAddQty] = useState<number>(1);
  const [editMaterialSearch, setEditMaterialSearch] = useState<string>('');

  // Modal de Confirmação de Exclusão (Apenas Admin)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Modal de Comprovante / Cautela de Retirada
  const [receiptLoan, setReceiptLoan] = useState<Loan | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Modal de Devolução e Conferência Item a Item
  interface ReturnItemState {
    materialId: string;
    name: string;
    category: string;
    unit: string;
    totalQuantity: number;
    returnedQuantity: number;
    missingReason: string;
  }
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningLoan, setReturningLoan] = useState<Loan | null>(null);
  const [returnFormResponsible, setReturnFormResponsible] = useState('');
  const [returnFormObservations, setReturnFormObservations] = useState('');
  const [returnFormMissingObs, setReturnFormMissingObs] = useState('');
  const [returnItemsState, setReturnItemsState] = useState<ReturnItemState[]>([]);

  // Modal de Ficha Oficial / Termo de Devolução (PDF e Visualização)
  const [returnReceiptLoan, setReturnReceiptLoan] = useState<Loan | null>(null);
  const [isReturnReceiptModalOpen, setIsReturnReceiptModalOpen] = useState(false);

  // Abrir Modal de Comprovante
  const handleOpenReceipt = (loan: Loan) => {
    setReceiptLoan(loan);
    setIsReceiptOpen(true);
  };

  // Baixar PDF do Comprovante Individual
  const handleDownloadReceiptPDF = async (loan: Loan) => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Gerando Comprovante em PDF...');
    try {
      await generateWithdrawalReceiptPDF({
        loan,
        materials: safeMaterials,
        locations: safeLocations,
        settings,
        action: 'download'
      });
      addLog('Comprovante de Retirada', `PDF do Comprovante emitido para ${loan.soldierName} (${loan.destination}).`);
      toast.success('Comprovante baixado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF do comprovante.', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Imprimir Comprovante Individual
  const handlePrintReceipt = async (loan: Loan) => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Preparando impressão do comprovante...');
    try {
      await generateWithdrawalReceiptPDF({
        loan,
        materials: safeMaterials,
        locations: safeLocations,
        settings,
        action: 'print'
      });
      addLog('Impressão de Comprovante', `Comprovante impresso para ${loan.soldierName} (${loan.destination}).`);
      toast.success('Comando de impressão enviado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar para impressão.', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Exportar Relatório Consolidado de Retiradas em PDF
  const handleExportWithdrawalsReport = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Gerando Relatório de Retiradas em PDF...');
    try {
      await generateWithdrawalsReportPDF({
        loans: filteredLoans,
        materials: safeMaterials,
        locations: safeLocations,
        settings,
        statusFilter
      });
      addLog('Relatório de Retiradas', `Relatório de retiradas em PDF exportado com ${filteredLoans.length} registros.`);
      toast.success('Relatório de retiradas exportado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório de retiradas.', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper para obter nome/descrição legível do material (evitando mostrar IDs)
  const getMaterialDescription = (materialId: string): string => {
    if (!materialId) return 'Material não especificado';
    const cleanId = String(materialId).trim();
    const found = safeMaterials.find(m => 
      String(m.id).trim() === cleanId || 
      String(m.name).trim().toLowerCase() === cleanId.toLowerCase()
    );
    return found ? found.name : materialId;
  };

  const getMaterialDetails = (materialId: string): Material | undefined => {
    const cleanId = String(materialId).trim();
    return safeMaterials.find(m => 
      String(m.id).trim() === cleanId || 
      String(m.name).trim().toLowerCase() === cleanId.toLowerCase()
    );
  };

  // Helper para obter nome legível do local de retirada (evitando mostrar IDs)
  const getLocationDisplayName = (locationId?: string): string => {
    if (!locationId || locationId === 'reserva' || locationId === 'reserva-central') {
      return 'Reserva Central';
    }
    const cleanId = String(locationId).trim();
    const loc = safeLocations.find(l => 
      String(l.id).trim() === cleanId || 
      String(l.name).trim().toLowerCase() === cleanId.toLowerCase()
    );
    if (loc) {
      const prefix = loc.prefixo ? ` (${loc.prefixo})` : '';
      const typeLabel = loc.type === 'viatura' ? 'Viatura' : loc.type === 'reserva' ? 'Reserva' : 'Compartimento';
      return `${loc.name}${prefix} • ${typeLabel}`;
    }
    return locationId;
  };

  // Obter estoque disponível de um material em determinada origem
  const getStockForOrigin = (
    mat: Material, 
    sourceType: 'reserva' | 'location', 
    sourceLocationId: string
  ): number => {
    if (sourceType === 'reserva') {
      return Math.max(0, getAvailableQuantity(mat, safeLocations, safeLoans));
    }
    const loc = safeLocations.find(l => l.id === sourceLocationId);
    if (!loc) return 0;
    const locItem = loc.materials.find(m => m.materialId === mat.id);
    return locItem ? Math.max(0, locItem.quantity) : 0;
  };

  // Lista de materiais disponíveis na origem selecionada para o modal de criação
  const availableMaterialsForCreate = useMemo(() => {
    if (createFormData.sourceType === 'reserva') {
      return safeMaterials.map(m => {
        const available = Math.max(0, getAvailableQuantity(m, safeLocations, safeLoans));
        return {
          material: m,
          available
        };
      });
    }

    const loc = safeLocations.find(l => l.id === createFormData.sourceLocationId);
    if (!loc) return [];

    return (loc.materials || []).map(item => {
      const mat = safeMaterials.find(m => m.id === item.materialId);
      return {
        material: mat || {
          id: item.materialId,
          name: item.materialId,
          category: 'Geral',
          totalQuantity: item.quantity,
          availableQuantity: item.quantity,
          unit: 'un',
          minStock: 0,
          lastUpdated: ''
        },
        available: item.quantity
      };
    });
  }, [safeMaterials, safeLocations, safeLoans, createFormData.sourceType, createFormData.sourceLocationId]);

  // Filtragem de materiais disponíveis por busca no modal
  const filteredAvailableMaterialsForCreate = useMemo(() => {
    return availableMaterialsForCreate.filter(item => {
      if (!materialSearchQuery) return true;
      const q = materialSearchQuery.toLowerCase();
      return (
        item.material.name.toLowerCase().includes(q) ||
        (item.material.category || '').toLowerCase().includes(q) ||
        (item.material.observations || '').toLowerCase().includes(q)
      );
    });
  }, [availableMaterialsForCreate, materialSearchQuery]);

  // Ao trocar de origem, limpa os itens selecionados para não misturar fontes
  const handleOriginChange = (type: 'reserva' | 'location', locId: string = '') => {
    setCreateFormData(prev => ({
      ...prev,
      sourceType: type,
      sourceLocationId: locId
    }));
    setSelectedItems([]);
    setCurrentMaterialId('');
    setCurrentMaterialQty(1);
    setMaterialSearchQuery('');
  };

  // Adicionar material ao "carrinho" de retirada
  const handleAddItemToCreate = () => {
    if (!currentMaterialId) {
      toast.error('Selecione um material para adicionar à retirada.');
      return;
    }

    if (currentMaterialQty <= 0) {
      toast.error('A quantidade deve ser maior que zero.');
      return;
    }

    const matItem = availableMaterialsForCreate.find(i => i.material.id === currentMaterialId);
    if (!matItem) {
      toast.error('Material não encontrado na origem selecionada.');
      return;
    }

    const alreadyAdded = selectedItems.find(i => i.materialId === currentMaterialId);
    const existingQty = alreadyAdded ? alreadyAdded.quantity : 0;
    const totalDesired = existingQty + currentMaterialQty;

    if (totalDesired > matItem.available) {
      toast.error(`Quantidade insuficiente em estoque. Disponível na origem: ${matItem.available} ${matItem.material.unit}.`);
      return;
    }

    if (alreadyAdded) {
      setSelectedItems(prev => prev.map(item => 
        item.materialId === currentMaterialId
          ? { ...item, quantity: item.quantity + currentMaterialQty }
          : item
      ));
      toast.info(`Quantidade de "${matItem.material.name}" atualizada para ${totalDesired}.`);
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          materialId: matItem.material.id,
          name: matItem.material.name,
          category: matItem.material.category || 'Geral',
          unit: matItem.material.unit || 'un',
          quantity: currentMaterialQty,
          availableMax: matItem.available
        }
      ]);
      toast.success(`"${matItem.material.name}" adicionado à retirada.`);
    }

    // Reset da seleção de adição
    setCurrentMaterialId('');
    setCurrentMaterialQty(1);
    setMaterialSearchQuery('');
  };

  // Alterar quantidade de item já adicionado
  const handleUpdateItemQty = (materialId: string, newQty: number) => {
    const item = selectedItems.find(i => i.materialId === materialId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItemFromCreate(materialId);
      return;
    }

    if (newQty > item.availableMax) {
      toast.error(`Quantidade máxima disponível: ${item.availableMax} ${item.unit}.`);
      return;
    }

    setSelectedItems(prev => prev.map(i => i.materialId === materialId ? { ...i, quantity: newQty } : i));
  };

  // Remover material da lista de retirada
  const handleRemoveItemFromCreate = (materialId: string) => {
    setSelectedItems(prev => prev.filter(i => i.materialId !== materialId));
  };

  // Confirmar criação do empréstimo com múltiplos materiais
  const handleConfirmCreateLoan = () => {
    if (!createFormData.soldierName.trim()) {
      toast.error('Informe o nome ou identificação do militar responsável.');
      return;
    }
    if (!createFormData.destination.trim()) {
      toast.error('Informe o destino ou unidade da retirada.');
      return;
    }
    if (!createFormData.courseName.trim()) {
      toast.error('Informe a finalidade ou curso.');
      return;
    }
    if (createFormData.sourceType === 'location' && !createFormData.sourceLocationId) {
      toast.error('Selecione a viatura ou compartimento de origem.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um material à lista de retirada.');
      return;
    }

    // Verificar disponibilidade de todos os itens antes de confirmar
    for (const item of selectedItems) {
      const mat = safeMaterials.find(m => m.id === item.materialId);
      if (mat) {
        const available = getStockForOrigin(mat, createFormData.sourceType, createFormData.sourceLocationId);
        if (item.quantity > available) {
          toast.error(`Quantidade insuficiente para "${item.name}". Disponível: ${available}.`);
          return;
        }
      }
    }

    const newLoan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      soldierName: createFormData.soldierName.trim(),
      destination: createFormData.destination.trim(),
      courseName: createFormData.courseName.trim(),
      observations: createFormData.observations.trim(),
      expectedDuration: createFormData.expectedDuration.trim() || 'Não especificada',
      exitDate: new Date().toISOString(),
      status: 'ativo',
      sourceLocationId: createFormData.sourceType === 'location' ? createFormData.sourceLocationId : undefined,
      deliveryResponsible: createFormData.deliveryResponsible.trim() || currentUser?.name || 'Encarregado da Reserva',
      materials: selectedItems.map(item => ({
        materialId: item.materialId,
        quantity: item.quantity
      }))
    };

    // Atualizar origem se for viatura/compartimento
    if (createFormData.sourceType === 'location') {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === createFormData.sourceLocationId) {
          const locMats = [...loc.materials];
          selectedItems.forEach(item => {
            const idx = locMats.findIndex(m => m.materialId === item.materialId);
            if (idx !== -1) {
              locMats[idx] = {
                ...locMats[idx],
                quantity: Math.max(0, locMats[idx].quantity - item.quantity)
              };
            }
          });
          return {
            ...loc,
            materials: locMats.filter(m => m.quantity > 0)
          };
        }
        return loc;
      });
      setLocations(updatedLocations);
    }

    setLoans([newLoan, ...safeLoans]);

    const itemsSummary = selectedItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const originName = getLocationDisplayName(newLoan.sourceLocationId);
    addLog(
      'Empréstimo/Carga Temporária', 
      `Retirada realizada por ${newLoan.soldierName} (${newLoan.destination}) de [${originName}]. Entregue por ${newLoan.deliveryResponsible}. Itens: ${itemsSummary}.`
    );

    toast.success('Empréstimo com múltiplos materiais registrado com sucesso!', {
      action: {
        label: 'Imprimir Comprovante',
        onClick: () => handleOpenReceipt(newLoan)
      }
    });
    setIsCreateOpen(false);
    setSelectedItems([]);
    setCreateFormData({
      soldierName: '',
      destination: '',
      courseName: '',
      expectedDuration: '',
      observations: '',
      deliveryResponsible: '',
      sourceType: 'reserva',
      sourceLocationId: ''
    });
  };

  // Abrir Modal de Devolução e Conferência Item a Item
  const handleOpenReturnModal = (loan: Loan) => {
    setReturningLoan(loan);
    setReturnFormResponsible(currentUser?.name || 'Armeiro / Recebedor');
    setReturnFormObservations(loan.returnObservations || '');
    setReturnFormMissingObs(loan.missingObservations || '');

    // Mapeia histórico de devoluções anteriores caso haja
    const prevReturnedMap = new Map<string, number>();
    (loan.returnedMaterials || []).forEach(rm => prevReturnedMap.set(rm.materialId, rm.quantity));

    const initialItemsState: ReturnItemState[] = (loan.materials || []).map(item => {
      const mat = getMaterialDetails(item.materialId);
      const prevQty = prevReturnedMap.get(item.materialId);
      // Se não havia devolução parcial registrada, assume devolução integral como padrão (editável item a item)
      const initialReturned = prevQty !== undefined ? prevQty : item.quantity;
      return {
        materialId: item.materialId,
        name: mat ? mat.name : getMaterialDescription(item.materialId),
        category: mat?.category || 'Geral',
        unit: mat?.unit || 'un',
        totalQuantity: item.quantity,
        returnedQuantity: initialReturned,
        missingReason: ''
      };
    });

    setReturnItemsState(initialItemsState);
    setIsReturnModalOpen(true);
  };

  // Confirmar Devolução (Regular, Aberta c/ Faltas ou Encerrada c/ Faltas)
  const handleConfirmReturn = (mode: 'regular' | 'keep_open_missing' | 'close_missing') => {
    if (!returningLoan) return;

    if (!returnFormResponsible.trim()) {
      toast.error('Informe o responsável pela conferência e recebimento.');
      return;
    }

    const hasMissing = returnItemsState.some(i => i.returnedQuantity < i.totalQuantity);

    if (hasMissing && mode === 'regular') {
      toast.error('Constam materiais faltantes nesta conferência. Escolha "Manter Aberto" ou "Encerrar com Faltas".');
      return;
    }

    if (hasMissing && !returnFormMissingObs.trim()) {
      toast.error('Por favor, informe a justificativa/observação dos materiais faltantes.');
      return;
    }

    // Listas discriminadas
    const returnedMaterialsList = returnItemsState.map(i => ({
      materialId: i.materialId,
      quantity: i.returnedQuantity
    }));

    const missingMaterialsList = returnItemsState
      .filter(i => i.returnedQuantity < i.totalQuantity)
      .map(i => ({
        materialId: i.materialId,
        quantity: i.totalQuantity - i.returnedQuantity,
        reason: i.missingReason.trim() || undefined
      }));

    // Se saiu de viatura/local, estorna para o local apenas os itens que foram devolvidos
    if (returningLoan.sourceLocationId) {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === returningLoan.sourceLocationId) {
          const newMaterials = [...loc.materials];
          returnItemsState.forEach(item => {
            if (item.returnedQuantity > 0) {
              const idx = newMaterials.findIndex(m => m.materialId === item.materialId);
              if (idx !== -1) {
                newMaterials[idx] = { ...newMaterials[idx], quantity: newMaterials[idx].quantity + item.returnedQuantity };
              } else {
                newMaterials.push({ materialId: item.materialId, quantity: item.returnedQuantity });
              }
            }
          });
          return { ...loc, materials: newMaterials };
        }
        return loc;
      });
      setLocations(updatedLocations);
    }

    const isClosed = mode === 'regular' || mode === 'close_missing';
    const nowIso = new Date().toISOString();

    const updatedLoan: Loan = {
      ...returningLoan,
      status: isClosed ? 'devolvido' : 'ativo',
      returnDate: nowIso,
      returnResponsible: returnFormResponsible.trim(),
      returnObservations: returnFormObservations.trim(),
      missingObservations: hasMissing ? returnFormMissingObs.trim() : undefined,
      hasMissingItems: hasMissing,
      returnedMaterials: returnedMaterialsList,
      missingMaterials: missingMaterialsList
    };

    const updatedLoans = safeLoans.map(l => l.id === returningLoan.id ? updatedLoan : l);
    setLoans(updatedLoans);

    const missingSummary = missingMaterialsList.map(m => {
      const item = returnItemsState.find(i => i.materialId === m.materialId);
      return `${m.quantity}x ${item?.name || m.materialId}`;
    }).join(', ');

    if (!hasMissing) {
      addLog(
        'Devolução Integral de Carga',
        `Todos os materiais devolvidos por ${returningLoan.soldierName} (${returningLoan.destination}). Recebido por ${returnFormResponsible.trim()}.`
      );
      toast.success('Devolução integral registrada com sucesso!');
    } else if (mode === 'keep_open_missing') {
      addLog(
        'Devolução Parcial - Carga Mantida Aberta',
        `Devolução parcial de ${returningLoan.soldierName}. Carga mantida ABERTA com faltas: [${missingSummary}]. Obs: ${returnFormMissingObs.trim()}. Recebido por ${returnFormResponsible.trim()}.`
      );
      toast.warning('Devolução parcial registrada. Carga mantida aberta com faltas pendentes!');
    } else {
      addLog(
        'Carga Encerrada com Materiais Faltantes',
        `Carga encerrada com FALTAS para ${returningLoan.soldierName}. Faltando: [${missingSummary}]. Obs: ${returnFormMissingObs.trim()}. Recebido por ${returnFormResponsible.trim()}. Ficha registrada.`
      );
      toast.error('Carga encerrada gerando materiais faltantes e termo registrado.');
    }

    setIsReturnModalOpen(false);
    setReturningLoan(null);

    // Abre a Ficha de Devolução para visualização/impressão imediata
    setReturnReceiptLoan(updatedLoan);
    setIsReturnReceiptModalOpen(true);
  };

  // Abrir Modal de Ficha Oficial de Devolução
  const handleOpenReturnReceipt = (loan: Loan) => {
    setReturnReceiptLoan(loan);
    setIsReturnReceiptModalOpen(true);
  };

  // Baixar PDF da Ficha de Devolução
  const handleDownloadReturnReceiptPDF = async (loan: Loan) => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Gerando Ficha de Devolução em PDF...');
    try {
      await generateReturnReceiptPDF({
        loan,
        materials: safeMaterials,
        locations: safeLocations,
        settings,
        action: 'download'
      });
      addLog('Ficha de Devolução', `Ficha/Termo de Devolução baixada para ${loan.soldierName} (${loan.destination}).`);
      toast.success('Ficha de Devolução baixada com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar Ficha de Devolução em PDF.', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Imprimir Ficha de Devolução
  const handlePrintReturnReceipt = async (loan: Loan) => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Preparando impressão da Ficha de Devolução...');
    try {
      await generateReturnReceiptPDF({
        loan,
        materials: safeMaterials,
        locations: safeLocations,
        settings,
        action: 'print'
      });
      addLog('Impressão da Ficha de Devolução', `Ficha de Devolução enviada para impressão: ${loan.soldierName}.`);
      toast.success('Comando de impressão enviado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar Ficha de Devolução para impressão.', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Abrir Modal de Edição (Apenas Admin)
  const handleOpenEdit = (loan: Loan) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem editar empréstimos cadastrados.');
      return;
    }

    setEditingLoan(loan);
    setEditFormData({
      soldierName: loan.soldierName || '',
      destination: loan.destination || '',
      courseName: loan.courseName || '',
      expectedDuration: loan.expectedDuration || '',
      observations: loan.observations || '',
      deliveryResponsible: loan.deliveryResponsible || '',
      returnResponsible: loan.returnResponsible || '',
      returnObservations: loan.returnObservations || '',
      missingObservations: loan.missingObservations || '',
      status: loan.status || 'ativo'
    });

    // Mapear itens atuais do empréstimo com nomes legíveis
    const mappedItems: SelectedMaterialItem[] = (loan.materials || []).map(item => {
      const mat = getMaterialDetails(item.materialId);
      const stock = mat ? getStockForOrigin(mat, loan.sourceLocationId ? 'location' : 'reserva', loan.sourceLocationId || '') : 999;
      return {
        materialId: item.materialId,
        name: mat ? mat.name : item.materialId,
        category: mat?.category || 'Geral',
        unit: mat?.unit || 'un',
        quantity: item.quantity,
        availableMax: stock + item.quantity // considera o estoque atual + o que já está neste empréstimo
      };
    });

    setEditItems(mappedItems);
    setEditAddMaterialId('');
    setEditAddQty(1);
    setEditMaterialSearch('');
    setIsEditOpen(true);
  };

  // Salvar Edição do Empréstimo (Apenas Admin)
  const handleSaveEdit = () => {
    if (!isAdmin || !editingLoan) return;

    if (!editFormData.soldierName.trim() || !editFormData.destination.trim()) {
      toast.error('Preencha os campos obrigatórios do militar e destino.');
      return;
    }

    if (editItems.length === 0) {
      toast.error('O empréstimo deve conter pelo menos um material.');
      return;
    }

    // Se o empréstimo estava ativo e de uma viatura/local, recalculamos os saldos
    if (editingLoan.status === 'ativo' && editingLoan.sourceLocationId) {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === editingLoan.sourceLocationId) {
          let locMats = [...loc.materials];
          
          // 1. Estorna os itens antigos
          (editingLoan.materials || []).forEach(oldItem => {
            const idx = locMats.findIndex(m => m.materialId === oldItem.materialId);
            if (idx !== -1) {
              locMats[idx] = { ...locMats[idx], quantity: locMats[idx].quantity + oldItem.quantity };
            } else {
              locMats.push({ materialId: oldItem.materialId, quantity: oldItem.quantity });
            }
          });

          // 2. Se o novo status continuar ativo, desconta os novos itens
          if (editFormData.status === 'ativo') {
            editItems.forEach(newItem => {
              const idx = locMats.findIndex(m => m.materialId === newItem.materialId);
              if (idx !== -1) {
                locMats[idx] = { ...locMats[idx], quantity: Math.max(0, locMats[idx].quantity - newItem.quantity) };
              }
            });
          }

          return {
            ...loc,
            materials: locMats.filter(m => m.quantity > 0)
          };
        }
        return loc;
      });
      setLocations(updatedLocations);
    } else if (editingLoan.status === 'devolvido' && editFormData.status === 'ativo' && editingLoan.sourceLocationId) {
      // Passou de devolvido para ativo: desconta do local
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === editingLoan.sourceLocationId) {
          let locMats = [...loc.materials];
          editItems.forEach(newItem => {
            const idx = locMats.findIndex(m => m.materialId === newItem.materialId);
            if (idx !== -1) {
              locMats[idx] = { ...locMats[idx], quantity: Math.max(0, locMats[idx].quantity - newItem.quantity) };
            }
          });
          return { ...loc, materials: locMats.filter(m => m.quantity > 0) };
        }
        return loc;
      });
      setLocations(updatedLocations);
    }

    const updatedLoan: Loan = {
      ...editingLoan,
      soldierName: editFormData.soldierName.trim(),
      destination: editFormData.destination.trim(),
      courseName: editFormData.courseName.trim(),
      expectedDuration: editFormData.expectedDuration.trim(),
      observations: editFormData.observations.trim(),
      deliveryResponsible: editFormData.deliveryResponsible.trim(),
      returnResponsible: editFormData.returnResponsible.trim(),
      returnObservations: editFormData.returnObservations.trim(),
      missingObservations: editFormData.missingObservations.trim(),
      status: editFormData.status,
      returnDate: editFormData.status === 'devolvido' && !editingLoan.returnDate ? new Date().toISOString() : editingLoan.returnDate,
      materials: editItems.map(i => ({ materialId: i.materialId, quantity: i.quantity }))
    };

    setLoans(safeLoans.map(l => l.id === editingLoan.id ? updatedLoan : l));
    addLog('Edição de Carga Temporária', `Carga/Empréstimo #${editingLoan.id} de ${updatedLoan.soldierName} foi atualizado pelo administrador.`);
    toast.success('Empréstimo atualizado com sucesso!');
    setIsEditOpen(false);
    setEditingLoan(null);
  };

  // Abrir Modal de Exclusão (Apenas Admin)
  const handleOpenDelete = (loan: Loan) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir empréstimos cadastrados.');
      return;
    }
    setLoanToDelete(loan);
    setIsDeleteOpen(true);
  };

  // Confirmar Exclusão (Apenas Admin)
  const handleConfirmDelete = () => {
    if (!isAdmin || !loanToDelete) return;

    // Se o empréstimo estava ativo e de uma viatura, devolve os materiais ao estoque da viatura
    if (loanToDelete.status === 'ativo' && loanToDelete.sourceLocationId) {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === loanToDelete.sourceLocationId) {
          const locMats = [...loc.materials];
          (loanToDelete.materials || []).forEach(item => {
            const idx = locMats.findIndex(m => m.materialId === item.materialId);
            if (idx !== -1) {
              locMats[idx] = { ...locMats[idx], quantity: locMats[idx].quantity + item.quantity };
            } else {
              locMats.push({ materialId: item.materialId, quantity: item.quantity });
            }
          });
          return { ...loc, materials: locMats };
        }
        return loc;
      });
      setLocations(updatedLocations);
    }

    setLoans(safeLoans.filter(l => l.id !== loanToDelete.id));
    addLog(
      'Exclusão de Carga Temporária', 
      `Registro de empréstimo de ${loanToDelete.soldierName} (${loanToDelete.destination}) foi excluído pelo administrador.`
    );
    toast.success('Registro de empréstimo excluído com sucesso!');
    setIsDeleteOpen(false);
    setLoanToDelete(null);
  };

  // Filtragem da Lista Principal
  const filteredLoans = useMemo(() => {
    return safeLoans.filter(loan => {
      if (statusFilter === 'faltas') {
        if (!loan.hasMissingItems) return false;
      } else if (statusFilter !== 'todos' && loan.status !== statusFilter) {
        return false;
      }
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      
      const soldier = (loan.soldierName || '').toLowerCase();
      const dest = (loan.destination || '').toLowerCase();
      const course = (loan.courseName || '').toLowerCase();
      const deliveryResp = (loan.deliveryResponsible || '').toLowerCase();
      const returnResp = (loan.returnResponsible || '').toLowerCase();
      const origin = getLocationDisplayName(loan.sourceLocationId).toLowerCase();
      const materialsMatch = (loan.materials || []).some(item => {
        const desc = getMaterialDescription(item.materialId).toLowerCase();
        return desc.includes(q);
      });

      return (
        soldier.includes(q) ||
        dest.includes(q) ||
        course.includes(q) ||
        deliveryResp.includes(q) ||
        returnResp.includes(q) ||
        origin.includes(q) ||
        materialsMatch
      );
    });
  }, [safeLoans, statusFilter, searchTerm, safeMaterials, safeLocations]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Empréstimos e Cursos</h1>
            {isAdmin ? (
              <Badge className="bg-emerald-600 text-white gap-1 hover:bg-emerald-700">
                <ShieldCheck size={14} /> Modo Administrador
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ShieldAlert size={14} /> Modo Operador
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Controle de carga temporária, conferência item a item na devolução e registro de faltas com termo oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline"
            className="border-[#B22222] text-[#B22222] hover:bg-[#B22222] hover:text-white shadow-sm"
            onClick={handleExportWithdrawalsReport}
            disabled={isGeneratingPdf}
            title="Exportar Relatório Geral de Retiradas em PDF"
          >
            <FileText className="mr-2 h-4 w-4" /> Relatório de Retiradas (PDF)
          </Button>

          <Button 
            className="bg-[#B22222] hover:bg-[#B22222]/90 shadow-md"
            onClick={() => {
              setCreateFormData({
                soldierName: '',
                destination: '',
                courseName: '',
                expectedDuration: '',
                observations: '',
                deliveryResponsible: currentUser?.name || 'Encarregado da Reserva',
                sourceType: 'reserva',
                sourceLocationId: ''
              });
              setSelectedItems([]);
              setCurrentMaterialId('');
              setCurrentMaterialQty(1);
              setMaterialSearchQuery('');
              setIsCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Registrar Retirada (Múltiplos Materiais)
          </Button>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por militar, destino, curso, material, responsáveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              variant={statusFilter === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('todos')}
              className={statusFilter === 'todos' ? 'bg-[#B22222] hover:bg-[#B22222]/90' : ''}
            >
              Todos ({safeLoans.length})
            </Button>
            <Button
              variant={statusFilter === 'ativo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ativo')}
              className={statusFilter === 'ativo' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
            >
              Ativos ({safeLoans.filter(l => l.status === 'ativo').length})
            </Button>
            <Button
              variant={statusFilter === 'faltas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('faltas')}
              className={statusFilter === 'faltas' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-200 text-red-700 hover:bg-red-50'}
            >
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              Com Faltas ({safeLoans.filter(l => Boolean(l.hasMissingItems)).length})
            </Button>
            <Button
              variant={statusFilter === 'devolvido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('devolvido')}
              className={statusFilter === 'devolvido' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              Devolvidos ({safeLoans.filter(l => l.status === 'devolvido').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Empréstimos */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[240px]">Militar / Destino</TableHead>
                <TableHead className="w-[180px]">Origem (Local de Retirada)</TableHead>
                <TableHead>Materiais Retirados</TableHead>
                <TableHead className="w-[130px]">Saída</TableHead>
                <TableHead className="w-[140px]">Previsão / Retorno</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[230px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.map((loan) => {
                const originLabel = getLocationDisplayName(loan.sourceLocationId);
                const isLocationSource = Boolean(loan.sourceLocationId);
                const totalItemUnits = (loan.materials || []).reduce((acc, i) => acc + (i.quantity || 0), 0);

                return (
                  <TableRow key={loan.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <UserIcon size={14} className="text-muted-foreground shrink-0" />
                          {loan.soldierName || 'Militar não identificado'}
                        </span>
                        <span className="text-xs text-[#B22222] font-semibold mt-0.5">
                          {loan.destination || 'Sem destino'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {loan.courseName || 'Missão Operacional'}
                        </span>
                        {loan.deliveryResponsible && (
                          <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1" title="Responsável pela entrega do material">
                            📦 Entregue por: <strong>{loan.deliveryResponsible}</strong>
                          </span>
                        )}
                        {loan.returnResponsible && (
                          <span className="text-[10px] text-emerald-700 flex items-center gap-1" title="Responsável pelo recebimento">
                            ✓ Recebido por: <strong>{loan.returnResponsible}</strong>
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit bg-background text-xs py-1">
                        {isLocationSource ? (
                          <Truck size={13} className="text-blue-600 shrink-0" />
                        ) : (
                          <Warehouse size={13} className="text-amber-600 shrink-0" />
                        )}
                        <span className="truncate max-w-[150px] font-medium" title={originLabel}>
                          {originLabel}
                        </span>
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1 py-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {loan.materials?.length || 0} tipo(s) • {totalItemUnits} un. total
                          </Badge>
                          {loan.hasMissingItems && (
                            <Badge variant="destructive" className="text-[10px] bg-red-600 font-semibold gap-1">
                              <AlertTriangle size={10} /> Constam Faltas
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(loan.materials || []).map((item, idx) => {
                            const desc = getMaterialDescription(item.materialId);
                            const mat = getMaterialDetails(item.materialId);
                            
                            // Verifica se este item especificamente tem faltas
                            const missingItem = (loan.missingMaterials || []).find(m => m.materialId === item.materialId);
                            const isItemMissing = Boolean(missingItem && missingItem.quantity > 0);

                            return (
                              <div 
                                key={idx} 
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border text-foreground ${
                                  isItemMissing 
                                    ? 'bg-red-50 border-red-300 text-red-900 font-semibold' 
                                    : 'bg-muted/60 border-border/50'
                                }`}
                                title={`Código: ${item.materialId}${isItemMissing ? ` - FALTANDO ${missingItem?.quantity}` : ''}`}
                              >
                                <span className={isItemMissing ? "font-bold text-red-600" : "font-bold text-[#B22222]"}>
                                  {item.quantity}x
                                </span>
                                <span className="font-medium truncate max-w-[180px]">{desc}</span>
                                {mat?.unit && <span className="text-[10px] text-muted-foreground">{mat.unit}</span>}
                                {isItemMissing && (
                                  <Badge className="bg-red-600 text-[9px] px-1 py-0 h-4 ml-0.5">
                                    Falta {missingItem?.quantity}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {loan.observations && (
                          <p className="text-[11px] text-muted-foreground italic truncate max-w-[320px] mt-1" title={loan.observations}>
                            Obs. Saída: {loan.observations}
                          </p>
                        )}
                        {loan.missingObservations && (
                          <p className="text-[11px] text-red-600 font-medium truncate max-w-[320px]" title={loan.missingObservations}>
                            ⚠️ Faltas: {loan.missingObservations}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {loan.exitDate ? format(new Date(loan.exitDate), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
                    </TableCell>

                    <TableCell className="text-xs">
                      {loan.status === 'ativo' ? (
                        loan.hasMissingItems ? (
                          <div className="flex flex-col">
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600" /> Carga c/ Faltas
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {loan.returnDate ? `Conf: ${format(new Date(loan.returnDate), "dd/MM/yy HH:mm", { locale: ptBR })}` : 'Em aberto'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-orange-600 font-semibold">{loan.expectedDuration || 'Previsto'}</span>
                            <span className="text-[10px] text-muted-foreground">Pendente devolução</span>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col">
                          <span className={loan.hasMissingItems ? "text-red-600 font-bold" : "text-emerald-600 font-semibold"}>
                            {loan.hasMissingItems ? 'Encerrado c/ Faltas' : 'Devolvido Integral'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {loan.returnDate ? format(new Date(loan.returnDate), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {loan.status === 'ativo' && !loan.hasMissingItems && (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                          ATIVO
                        </Badge>
                      )}
                      {loan.status === 'ativo' && loan.hasMissingItems && (
                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 mx-auto w-fit">
                          <AlertTriangle className="h-3 w-3" /> ABERTO (FALTAS)
                        </Badge>
                      )}
                      {loan.status === 'devolvido' && !loan.hasMissingItems && (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50">
                          DEVOLVIDO
                        </Badge>
                      )}
                      {loan.status === 'devolvido' && loan.hasMissingItems && (
                        <Badge className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 mx-auto w-fit">
                          <ShieldAlert className="h-3 w-3" /> ENCERRADO C/ FALTAS
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                          onClick={() => handleOpenReceipt(loan)}
                          title="Imprimir Comprovante / Cautela de Retirada (PDF)"
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" /> Retirada
                        </Button>

                        {(loan.status === 'devolvido' || loan.returnDate || loan.hasMissingItems) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 border-indigo-200"
                            onClick={() => handleOpenReturnReceipt(loan)}
                            title="Visualizar e Imprimir Ficha Oficial / Termo de Devolução (PDF)"
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" /> Ficha Devolução
                          </Button>
                        )}

                        {loan.status === 'ativo' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-8 text-xs ${
                              loan.hasMissingItems 
                                ? 'text-amber-700 hover:bg-amber-50 border-amber-300 font-semibold' 
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200'
                            }`}
                            onClick={() => handleOpenReturnModal(loan)}
                            title="Conferir item a item e registrar termo de devolução"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> 
                            {loan.hasMissingItems ? 'Resolver Faltas' : 'Devolver'}
                          </Button>
                        )}

                        {isAdmin && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleOpenEdit(loan)}
                              title="Editar Empréstimo e Lista de Materiais (Administrador)"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleOpenDelete(loan)}
                              title="Excluir Registro (Administrador)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredLoans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium">Nenhum registro de empréstimo encontrado.</p>
                      <p className="text-xs">Utilize o botão acima para registrar uma nova retirada temporária.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL DE CRIAÇÃO: REGISTRAR CARGA TEMPORÁRIA COM MÚLTIPLOS MATERIAIS */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-center items-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-background border rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b bg-muted/40 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#B22222] rounded-lg text-white shadow-sm">
                  <Briefcase size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Registrar Carga Temporária</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Saída de múltiplos materiais para cursos, instruções ou missões externas.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreateOpen(false)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>

            {/* Conteúdo com rolagem */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Card 1: Dados do Responsável e Destino */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserIcon size={16} className="text-[#B22222]" /> Dados do Responsável e Finalidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="soldier" className="text-xs font-semibold">
                        Militar Responsável <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="soldier" 
                        placeholder="Nome completo, Posto/Graduação ou RE" 
                        value={createFormData.soldierName} 
                        onChange={(e) => setCreateFormData({ ...createFormData, soldierName: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dest" className="text-xs font-semibold">
                        Destino / Unidade Solicitante <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="dest" 
                        placeholder="Ex: 1º Pelotão, Franca, Campo de Instrução" 
                        value={createFormData.destination} 
                        onChange={(e) => setCreateFormData({ ...createFormData, destination: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="course" className="text-xs font-semibold">
                        Curso / Finalidade da Retirada <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="course" 
                        placeholder="Ex: Salvamento em Altura, BREC, Instrução Prática" 
                        value={createFormData.courseName} 
                        onChange={(e) => setCreateFormData({ ...createFormData, courseName: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="deliveryResp" className="text-xs font-semibold">
                        Responsável pela Entrega (Despacho) <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="deliveryResp" 
                        placeholder="Nome do militar/armeiro que realizou a entrega" 
                        value={createFormData.deliveryResponsible} 
                        onChange={(e) => setCreateFormData({ ...createFormData, deliveryResponsible: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="duration" className="text-xs font-semibold">Duração Prevista</Label>
                      <Input 
                        id="duration" 
                        placeholder="Ex: 5 dias, 1 semana, até 25/10" 
                        value={createFormData.expectedDuration} 
                        onChange={(e) => setCreateFormData({ ...createFormData, expectedDuration: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="obs" className="text-xs font-semibold">Observações Gerais</Label>
                      <Input 
                        id="obs" 
                        placeholder="Detalhes adicionais sobre a saída ou estado dos equipamentos..." 
                        value={createFormData.observations} 
                        onChange={(e) => setCreateFormData({ ...createFormData, observations: e.target.value })} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Origem dos Materiais (Local de Retirada) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Warehouse size={16} className="text-[#B22222]" /> Local de Retirada (Origem do Estoque)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escolha de onde os materiais serão deduzidos (Reserva Central ou Viatura específica).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opção Reserva Central */}
                    <div 
                      onClick={() => handleOriginChange('reserva', '')}
                      className={`cursor-pointer p-3.5 rounded-lg border-2 transition-all flex items-start gap-3 ${
                        createFormData.sourceType === 'reserva'
                          ? 'border-[#B22222] bg-[#B22222]/5 shadow-xs'
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                      }`}
                    >
                      <div className={`p-2 rounded-md ${createFormData.sourceType === 'reserva' ? 'bg-[#B22222] text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Warehouse size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-foreground">Reserva Central</p>
                          {createFormData.sourceType === 'reserva' && <Check size={16} className="text-[#B22222]" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Almoxarifado Geral da Sala de Altura</p>
                      </div>
                    </div>

                    {/* Opção Viatura / Local */}
                    <div 
                      onClick={() => {
                        const firstViatura = safeLocations.find(l => l.type === 'viatura') || safeLocations[0];
                        handleOriginChange('location', firstViatura ? firstViatura.id : '');
                      }}
                      className={`cursor-pointer p-3.5 rounded-lg border-2 transition-all flex items-start gap-3 ${
                        createFormData.sourceType === 'location'
                          ? 'border-[#B22222] bg-[#B22222]/5 shadow-xs'
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                      }`}
                    >
                      <div className={`p-2 rounded-md ${createFormData.sourceType === 'location' ? 'bg-[#B22222] text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Truck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-foreground">Viatura / Compartimento</p>
                          {createFormData.sourceType === 'location' && <Check size={16} className="text-[#B22222]" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Retirar carga já alocada em viatura</p>
                      </div>
                    </div>
                  </div>

                  {/* Seleção da Viatura quando sourceType === 'location' */}
                  {createFormData.sourceType === 'location' && (
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label htmlFor="sourceLocSelect" className="text-xs font-semibold">
                        Selecione a Viatura / Local de Retirada <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="sourceLocSelect"
                        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#B22222] text-foreground"
                        value={createFormData.sourceLocationId}
                        onChange={(e) => handleOriginChange('location', e.target.value)}
                      >
                        <option value="" disabled>-- Selecione o local de retirada --</option>
                        {safeLocations.map(loc => {
                          const prefix = loc.prefixo ? ` (${loc.prefixo})` : '';
                          const typeLabel = loc.type === 'viatura' ? 'Viatura' : 'Compartimento/Depósito';
                          return (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}{prefix} — {typeLabel} ({loc.materials?.length || 0} itens carregados)
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Origem selecionada: <strong>{getLocationDisplayName(createFormData.sourceLocationId)}</strong>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Seleção e Adição de Múltiplos Materiais */}
              <Card className="border-[#B22222]/30">
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package size={16} className="text-[#B22222]" /> Seleção de Materiais para a Retirada
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Adicione um ou vários materiais na mesma saída. Os nomes abaixo são as descrições dos produtos.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-background text-[#B22222] border-[#B22222]/30">
                      {selectedItems.length} material(is) na lista
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Formulário de Adição de Item */}
                  <div className="p-3.5 bg-muted/30 rounded-lg border border-border/80 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Seletor com Descrição do Material */}
                      <div className="md:col-span-7 space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Material (Descrição / Categoria)
                        </Label>
                        <select
                          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#B22222] text-foreground truncate"
                          value={currentMaterialId}
                          onChange={(e) => {
                            setCurrentMaterialId(e.target.value);
                            setCurrentMaterialQty(1);
                          }}
                        >
                          <option value="">-- Selecione o Material pela Descrição --</option>
                          {availableMaterialsForCreate.map(item => (
                            <option 
                              key={item.material.id} 
                              value={item.material.id}
                              disabled={item.available <= 0}
                            >
                              {item.material.name} • [{item.material.category || 'Geral'}] — {item.available} {item.material.unit} disp.
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantidade */}
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold">Qtd.</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={currentMaterialQty || ''} 
                          onChange={(e) => setCurrentMaterialQty(parseInt(e.target.value) || 0)}
                          className="text-center font-bold"
                          placeholder="1"
                        />
                      </div>

                      {/* Botão Adicionar */}
                      <div className="md:col-span-3">
                        <Button 
                          type="button" 
                          onClick={handleAddItemToCreate}
                          className="w-full bg-[#B22222] hover:bg-[#B22222]/90 text-white shadow-xs"
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Adicionar à Lista
                        </Button>
                      </div>
                    </div>

                    {/* Detalhes do item atualmente selecionado no seletor */}
                    {currentMaterialId && (() => {
                      const sel = availableMaterialsForCreate.find(i => i.material.id === currentMaterialId);
                      if (!sel) return null;
                      return (
                        <div className="text-xs bg-background p-2.5 rounded border flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-foreground">Descrição: </span>
                            <span className="text-[#B22222] font-bold">{sel.material.name}</span>
                            <span className="text-muted-foreground ml-2">({sel.material.category})</span>
                          </div>
                          <div className="text-muted-foreground">
                            Disponível na Origem: <strong className="text-foreground">{sel.available} {sel.material.unit}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tabela de Itens Selecionados na Retirada */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/60 px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Lista de Materiais para esta Retirada</span>
                      <span>Total de itens: {selectedItems.length}</span>
                    </div>

                    {selectedItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead>Descrição do Material</TableHead>
                            <TableHead className="w-[140px]">Categoria</TableHead>
                            <TableHead className="w-[150px] text-center">Quantidade a Retirar</TableHead>
                            <TableHead className="w-[110px] text-center">Disp. Origem</TableHead>
                            <TableHead className="w-[60px] text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => (
                            <TableRow key={item.materialId} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="font-semibold text-sm text-foreground">{item.name}</div>
                                <div className="text-[11px] text-muted-foreground">Unidade: {item.unit}</div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-sm"
                                    onClick={() => handleUpdateItemQty(item.materialId, item.quantity - 1)}
                                  >
                                    <Minus size={12} />
                                  </Button>
                                  <Input 
                                    type="number"
                                    min="1"
                                    max={item.availableMax}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQty(item.materialId, parseInt(e.target.value) || 0)}
                                    className="w-16 h-7 text-center font-bold text-xs p-1"
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-sm"
                                    onClick={() => handleUpdateItemQty(item.materialId, item.quantity + 1)}
                                    disabled={item.quantity >= item.availableMax}
                                  >
                                    <Plus size={12} />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                <span className="font-medium text-muted-foreground">
                                  {item.availableMax} {item.unit}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveItemFromCreate(item.materialId)}
                                  title="Remover material da retirada"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground space-y-1">
                        <Layers className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-medium">Nenhum material adicionado à lista ainda.</p>
                        <p className="text-xs">Selecione o material acima e clique em "Adicionar à Lista" para montar a retirada.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rodapé com Ações */}
            <div className="p-4 border-t bg-muted/40 flex flex-row items-center justify-between shrink-0">
              <div className="text-xs text-muted-foreground">
                Total a retirar: <strong className="text-foreground">{selectedItems.reduce((acc, i) => acc + i.quantity, 0)} unidade(s)</strong> em <strong>{selectedItems.length} tipo(s) de material</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmCreateLoan} 
                  className="bg-[#B22222] hover:bg-[#B22222]/90 text-white font-semibold"
                  disabled={selectedItems.length === 0}
                >
                  Confirmar Saída ({selectedItems.length} materiais)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DO EMPRÉSTIMO E DA LISTA DE MATERIAIS (ADMINISTRADOR) */}
      {/* ========================================================================= */}
      {isEditOpen && editingLoan && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Edit2 className="h-5 w-5 text-[#B22222]" /> Editar Carga Temporária (Privilégio Administrador)
              </DialogTitle>
              <DialogDescription>
                Atualize os dados do responsável ou edite a lista de materiais retirados.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              {/* Dados do Militar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Militar Responsável</Label>
                  <Input 
                    value={editFormData.soldierName} 
                    onChange={(e) => setEditFormData({ ...editFormData, soldierName: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Destino / Unidade</Label>
                  <Input 
                    value={editFormData.destination} 
                    onChange={(e) => setEditFormData({ ...editFormData, destination: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Curso / Finalidade</Label>
                  <Input 
                    value={editFormData.courseName} 
                    onChange={(e) => setEditFormData({ ...editFormData, courseName: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Duração Prevista</Label>
                  <Input 
                    value={editFormData.expectedDuration} 
                    onChange={(e) => setEditFormData({ ...editFormData, expectedDuration: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status do Empréstimo</Label>
                  <select
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  >
                    <option value="ativo">ATIVO (Em campo)</option>
                    <option value="devolvido">DEVOLVIDO (Finalizado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Responsável pela Entrega</Label>
                  <Input 
                    value={editFormData.deliveryResponsible} 
                    placeholder="Quem entregou o material na saída"
                    onChange={(e) => setEditFormData({ ...editFormData, deliveryResponsible: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Responsável pelo Recebimento (Devolução)</Label>
                  <Input 
                    value={editFormData.returnResponsible} 
                    placeholder="Quem conferiu/recebeu na devolução"
                    onChange={(e) => setEditFormData({ ...editFormData, returnResponsible: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Observações Gerais da Saída</Label>
                <Textarea 
                  rows={2}
                  value={editFormData.observations} 
                  onChange={(e) => setEditFormData({ ...editFormData, observations: e.target.value })} 
                />
              </div>

              {(editFormData.status === 'devolvido' || editingLoan.hasMissingItems || editFormData.returnObservations || editFormData.missingObservations) && (
                <div className="p-3 bg-muted/50 rounded-lg border space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-emerald-700">Termo / Observações Registradas na Devolução</Label>
                    <Textarea 
                      rows={2}
                      value={editFormData.returnObservations} 
                      placeholder="Observações ou termo geral inserido na devolução..."
                      onChange={(e) => setEditFormData({ ...editFormData, returnObservations: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-red-700">Observações de Materiais Faltantes</Label>
                    <Textarea 
                      rows={2}
                      value={editFormData.missingObservations} 
                      placeholder="Justificativa ou registro de itens faltantes..."
                      onChange={(e) => setEditFormData({ ...editFormData, missingObservations: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Edição da Lista de Materiais */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold flex items-center gap-1.5">
                      <Package size={15} className="text-[#B22222]" /> Editar Materiais Deste Empréstimo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Origem: <strong>{getLocationDisplayName(editingLoan.sourceLocationId)}</strong>
                    </p>
                  </div>
                  <Badge variant="outline">{editItems.length} material(is)</Badge>
                </div>

                {/* Adicionar mais material à lista */}
                <div className="p-3 bg-muted/40 rounded-lg border grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-7 space-y-1">
                    <Label className="text-[11px] font-semibold">Adicionar outro material</Label>
                    <select
                      className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-md truncate"
                      value={editAddMaterialId}
                      onChange={(e) => setEditAddMaterialId(e.target.value)}
                    >
                      <option value="">-- Selecione o material pela descrição --</option>
                      {safeMaterials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} [{m.category || 'Geral'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold">Qtd.</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={editAddQty} 
                      onChange={(e) => setEditAddQty(parseInt(e.target.value) || 1)}
                      className="h-8 text-xs text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={() => {
                        if (!editAddMaterialId) {
                          toast.error('Selecione um material para adicionar.');
                          return;
                        }
                        const mat = safeMaterials.find(m => m.id === editAddMaterialId);
                        if (!mat) return;
                        
                        const already = editItems.find(i => i.materialId === editAddMaterialId);
                        if (already) {
                          setEditItems(editItems.map(i => i.materialId === editAddMaterialId ? { ...i, quantity: i.quantity + editAddQty } : i));
                        } else {
                          setEditItems([
                            ...editItems,
                            {
                              materialId: mat.id,
                              name: mat.name,
                              category: mat.category || 'Geral',
                              unit: mat.unit || 'un',
                              quantity: editAddQty,
                              availableMax: 999
                            }
                          ]);
                        }
                        setEditAddMaterialId('');
                        setEditAddQty(1);
                        toast.success(`"${mat.name}" adicionado.`);
                      }}
                      className="w-full bg-[#B22222] hover:bg-[#B22222]/90 text-white h-8 text-xs"
                    >
                      <Plus size={14} className="mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>

                {/* Tabela de Itens em Edição */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Descrição do Material</TableHead>
                        <TableHead className="w-[140px] text-center">Quantidade</TableHead>
                        <TableHead className="w-[60px] text-right">Excluir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editItems.map((item) => (
                        <TableRow key={item.materialId}>
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground">{item.category} • {item.unit}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setEditItems(editItems.map(i => i.materialId === item.materialId ? { ...i, quantity: i.quantity - 1 } : i));
                                  } else {
                                    setEditItems(editItems.filter(i => i.materialId !== item.materialId));
                                  }
                                }}
                              >
                                <Minus size={10} />
                              </Button>
                              <Input 
                                type="number" 
                                min="1" 
                                value={item.quantity} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setEditItems(editItems.map(i => i.materialId === item.materialId ? { ...i, quantity: val } : i));
                                }}
                                className="w-14 h-6 text-center text-xs font-bold p-1"
                              />
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditItems(editItems.map(i => i.materialId === item.materialId ? { ...i, quantity: i.quantity + 1 } : i));
                                }}
                              >
                                <Plus size={10} />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setEditItems(editItems.filter(i => i.materialId !== item.materialId))}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {editItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                            Nenhum material na lista. Adicione materiais acima.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} className="bg-[#B22222] hover:bg-[#B22222]/90 text-white">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (ADMINISTRADOR) */}
      {/* ========================================================================= */}
      {isDeleteOpen && loanToDelete && (
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Excluir Registro de Empréstimo
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <p>
                  Tem certeza que deseja excluir o empréstimo registrado para <strong>{loanToDelete.soldierName}</strong> ({loanToDelete.destination})?
                </p>
                {loanToDelete.status === 'ativo' && loanToDelete.sourceLocationId && (
                  <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2 rounded border border-amber-500/20">
                    Aviso: Como este empréstimo está com status <strong>ATIVO</strong>, os materiais retirados serão automaticamente restaurados ao estoque de origem (<strong>{getLocationDisplayName(loanToDelete.sourceLocationId)}</strong>).
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE COMPROVANTE / CAUTELA DE RETIRADA (IMPRESSÃO E PDF) */}
      {/* ========================================================================= */}
      {isReceiptOpen && receiptLoan && (
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-muted/30 border-b shrink-0 flex-row items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Printer className="h-5 w-5 text-[#B22222]" />
                  Comprovante de Retirada de Materiais
                </DialogTitle>
                <DialogDescription>
                  Cautela e termo de responsabilidade operacional emitido eletronicamente.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 pr-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePrintReceipt(receiptLoan)}
                  disabled={isGeneratingPdf}
                  className="gap-1.5"
                >
                  <Printer size={15} /> Imprimir Comprovante
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleDownloadReceiptPDF(receiptLoan)}
                  disabled={isGeneratingPdf}
                  className="bg-[#B22222] hover:bg-[#B22222]/90 text-white gap-1.5"
                >
                  <Download size={15} /> Baixar PDF
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-900 flex justify-center">
              <div className="w-full max-w-3xl bg-white text-zinc-900 shadow-xl border border-border/80 rounded-lg p-6 sm:p-8 space-y-6 text-sm relative">
                {/* Faixa decorativa #B22222 */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#B22222] rounded-t-lg" />

                {/* Cabeçalho */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#B22222] uppercase tracking-wide">
                      {settings?.hierarchy?.matrizName || 'SALA DE ALTURA'}
                    </h3>
                    <h4 className="font-bold text-sm text-zinc-800">
                      {settings?.unitName || 'CORPO DE BOMBEIROS'}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {settings?.hierarchy?.subunitName || 'Companhia'} / {settings?.hierarchy?.postName || 'Posto Operacional'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-mono text-xs font-bold border-[#B22222] text-[#B22222]">
                      CAUTELA #{(receiptLoan.id || '').slice(-6).toUpperCase()}
                    </Badge>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Data: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Título Oficial */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900">
                    Termo de Cautela e Retirada de Materiais
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Documento de controle de carga operacional e responsabilidade individual
                  </p>
                </div>

                {/* Quadro de Informações */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-50 border rounded-md text-xs">
                  <div>
                    <span className="font-bold text-zinc-500 block">Militar Responsável:</span>
                    <span className="font-bold text-[#B22222] text-sm">{receiptLoan.soldierName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Destino / Finalidade:</span>
                    <span className="font-semibold text-zinc-800">{receiptLoan.destination}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Curso / Missão:</span>
                    <span className="text-zinc-800">{receiptLoan.courseName || 'Missão Operacional'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Local de Retirada (Origem):</span>
                    <span className="font-semibold text-zinc-800">{getLocationDisplayName(receiptLoan.sourceLocationId)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Responsável pela Entrega:</span>
                    <span className="font-semibold text-zinc-800">{receiptLoan.deliveryResponsible || 'Encarregado da Reserva'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Data e Hora de Saída:</span>
                    <span className="text-zinc-800">
                      {receiptLoan.exitDate ? format(new Date(receiptLoan.exitDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Previsão de Devolução:</span>
                    <span className="text-zinc-800">{receiptLoan.expectedDuration || 'Conforme escala'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Status Atual:</span>
                    <Badge variant={receiptLoan.status === 'ativo' ? 'default' : 'secondary'} className={receiptLoan.status === 'ativo' ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'}>
                      {receiptLoan.status === 'ativo' ? (receiptLoan.hasMissingItems ? 'ABERTO (COM FALTAS)' : 'CARGA ATIVA') : 'DEVOLVIDO'}
                    </Badge>
                  </div>
                  {receiptLoan.returnDate && (
                    <div>
                      <span className="font-bold text-zinc-500 block">Data de Retorno:</span>
                      <span className="text-zinc-800">
                        {format(new Date(receiptLoan.returnDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tabela de Materiais */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-700 mb-2">
                    Relação de Materiais Retirados
                  </h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[#B22222] text-white">
                        <tr>
                          <th className="p-2 text-center w-12 font-bold">Item</th>
                          <th className="p-2 text-left font-bold">Descrição do Material</th>
                          <th className="p-2 text-left w-32 font-bold">Categoria</th>
                          <th className="p-2 text-center w-24 font-bold">Quantidade</th>
                          <th className="p-2 text-center w-16 font-bold">Unidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {(receiptLoan.materials || []).map((item, idx) => {
                          const mat = getMaterialDetails(item.materialId);
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                              <td className="p-2 text-center font-bold text-zinc-500">{(idx + 1).toString().padStart(2, '0')}</td>
                              <td className="p-2 font-bold text-zinc-900">{getMaterialDescription(item.materialId)}</td>
                              <td className="p-2 text-zinc-600 uppercase text-[11px]">{mat?.category || 'Geral'}</td>
                              <td className="p-2 text-center font-black text-[#B22222] text-sm">{item.quantity}</td>
                              <td className="p-2 text-center text-zinc-600">{mat?.unit || 'un'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-2 px-1 text-xs text-zinc-600 font-semibold">
                    <span>Total: {(receiptLoan.materials || []).length} tipo(s) de material</span>
                    <span>Total de unidades: {(receiptLoan.materials || []).reduce((acc, curr) => acc + curr.quantity, 0)}</span>
                  </div>
                </div>

                {/* Observações */}
                {receiptLoan.observations && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs">
                    <span className="font-bold text-amber-900 block mb-0.5">Observações:</span>
                    <p className="text-zinc-700">{receiptLoan.observations}</p>
                  </div>
                )}

                {/* Termo de Responsabilidade */}
                <div className="p-3 bg-zinc-50 border rounded-md text-[11px] text-zinc-600 space-y-1">
                  <span className="font-bold text-zinc-800 block uppercase tracking-wide">
                    Termo de Compromisso e Responsabilidade:
                  </span>
                  <p>
                    Declaro haver recebido nesta data o(s) material(is) discriminado(s) acima em perfeitas condições de funcionamento e conservação, comprometendo-me a zelar pela sua guarda, emprego adequado e devolvê-los no prazo estipulado. Em caso de extravio, dano ou perda decorrente de negligência ou uso indevido, assumo a responsabilidade nos termos regulamentares.
                  </p>
                </div>

                {/* Linhas de Assinatura */}
                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                  <div>
                    <div className="border-t border-zinc-400 w-4/5 mx-auto mb-1.5" />
                    <p className="font-bold text-zinc-900 uppercase">{receiptLoan.soldierName}</p>
                    <p className="text-[11px] text-zinc-500">Militar Responsável pela Retirada</p>
                  </div>
                  <div>
                    <div className="border-t border-zinc-400 w-4/5 mx-auto mb-1.5" />
                    <p className="font-bold text-zinc-900 uppercase">
                      {receiptLoan.deliveryResponsible || 'Encarregado / Armeiro'}
                    </p>
                    <p className="text-[11px] text-zinc-500">Responsável pela Liberação / Entrega</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 bg-muted/20 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Documento oficial gerado com numeração de página no padrão institucional.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReceiptOpen(false)}>
                  Fechar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleDownloadReceiptPDF(receiptLoan)}
                  disabled={isGeneratingPdf}
                  className="bg-[#B22222] hover:bg-[#B22222]/90 text-white gap-1.5"
                >
                  <Download size={15} /> Baixar PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DEVOLUÇÃO E CONFERÊNCIA ITEM A ITEM */}
      {/* ========================================================================= */}
      {isReturnModalOpen && returningLoan && (
        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
          <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-muted/40 border-b shrink-0 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 rounded-lg text-white shadow-sm">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold">
                    Termo e Conferência de Devolução
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Confira item a item. Caso haja faltas, a carga pode permanecer aberta ou ser encerrada com termo de pendências.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Resumo da Carga Retirada */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">Militar:</span>
                  <span className="font-bold text-foreground text-sm">{returningLoan.soldierName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Destino / Finalidade:</span>
                  <span className="font-semibold text-foreground">{returningLoan.destination}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Local de Origem:</span>
                  <span className="font-semibold text-foreground">{getLocationDisplayName(returningLoan.sourceLocationId)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Entregue por:</span>
                  <span className="font-semibold text-foreground">{returningLoan.deliveryResponsible || 'Encarregado da Reserva'}</span>
                </div>
              </div>

              {/* Responsável pelo Recebimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Responsável pelo Recebimento / Devolução <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    value={returnFormResponsible}
                    onChange={(e) => setReturnFormResponsible(e.target.value)}
                    placeholder="Nome do militar ou recebedor"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Data e Hora da Conferência
                  </Label>
                  <Input 
                    value={format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              </div>

              {/* Conferência Item a Item */}
              <Card>
                <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Package size={16} className="text-emerald-600" />
                      Conferência Item a Item dos Materiais Retirados
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Selecione e ajuste a quantidade exata de cada item devolvido.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => {
                        setReturnItemsState(returnItemsState.map(i => ({ ...i, returnedQuantity: i.totalQuantity })));
                      }}
                    >
                      <Check size={13} className="mr-1" /> Devolver Todos 100%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-zinc-600 hover:bg-zinc-100"
                      onClick={() => {
                        setReturnItemsState(returnItemsState.map(i => ({ ...i, returnedQuantity: 0 })));
                      }}
                    >
                      <Minus size={13} className="mr-1" /> Zerar Todos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {returnItemsState.map((item, idx) => {
                    const isMissing = item.returnedQuantity < item.totalQuantity;
                    const missingQty = item.totalQuantity - item.returnedQuantity;

                    return (
                      <div 
                        key={item.materialId}
                        className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isMissing ? 'bg-red-50/60 dark:bg-red-950/20' : 'hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground font-semibold">
                              #{(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <span className="font-bold text-sm text-foreground">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {item.category}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>Qtd. Retirada: <strong>{item.totalQuantity} {item.unit}</strong></span>
                            <span>•</span>
                            <span className={isMissing ? "text-red-600 font-bold" : "text-emerald-600 font-semibold"}>
                              Devolvendo: <strong>{item.returnedQuantity} {item.unit}</strong>
                            </span>
                            {isMissing && (
                              <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                                Faltando: {missingQty} {item.unit}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Controles de Quantidade Item */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center border rounded-md bg-background overflow-hidden shadow-xs">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none hover:bg-muted"
                              disabled={item.returnedQuantity <= 0}
                              onClick={() => {
                                setReturnItemsState(returnItemsState.map((it, i) => 
                                  i === idx ? { ...it, returnedQuantity: Math.max(0, it.returnedQuantity - 1) } : it
                                ));
                              }}
                            >
                              <Minus size={14} />
                            </Button>
                            <Input 
                              type="number"
                              min={0}
                              max={item.totalQuantity}
                              className="w-14 h-8 text-center border-0 rounded-none focus-visible:ring-0 font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={item.returnedQuantity}
                              onChange={(e) => {
                                const val = Math.min(item.totalQuantity, Math.max(0, parseInt(e.target.value) || 0));
                                setReturnItemsState(returnItemsState.map((it, i) => 
                                  i === idx ? { ...it, returnedQuantity: val } : it
                                ));
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none hover:bg-muted"
                              disabled={item.returnedQuantity >= item.totalQuantity}
                              onClick={() => {
                                setReturnItemsState(returnItemsState.map((it, i) => 
                                  i === idx ? { ...it, returnedQuantity: Math.min(it.totalQuantity, it.returnedQuantity + 1) } : it
                                ));
                              }}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant={item.returnedQuantity === item.totalQuantity ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 text-xs ${
                              item.returnedQuantity === item.totalQuantity 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'text-zinc-600'
                            }`}
                            onClick={() => {
                              const newQty = item.returnedQuantity === item.totalQuantity ? 0 : item.totalQuantity;
                              setReturnItemsState(returnItemsState.map((it, i) => 
                                i === idx ? { ...it, returnedQuantity: newQty } : it
                              ));
                            }}
                          >
                            {item.returnedQuantity === item.totalQuantity ? (
                              <><Check size={14} className="mr-1" /> Integral</>
                            ) : (
                              'Total'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Status da Conferência e Advertência de Faltas */}
              {(() => {
                const missingList = returnItemsState.filter(i => i.returnedQuantity < i.totalQuantity);
                const hasMissing = missingList.length > 0;

                if (!hasMissing) {
                  return (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-full">
                        <Check size={16} />
                      </div>
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">
                          Conferência 100% Conforme
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-400">
                          Todos os itens foram devolvidos em suas quantidades integrais. O processo será baixado regularmente.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-600 text-white rounded-lg shrink-0 mt-0.5">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="flex-1 text-xs space-y-1">
                        <p className="font-extrabold text-red-900 dark:text-red-200 text-sm">
                          Atenção: Conferência com Materiais Faltantes ({missingList.length} item(ns) pendente(s))
                        </p>
                        <p className="text-red-700 dark:text-red-300">
                          Identificou-se divergência física na devolução. Conforme regulamento, você pode optar por manter a carga aberta aguardando a devolução restante ou encerrar a carga registrando o termo de faltas.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {missingList.map((m, idx) => (
                            <Badge key={idx} variant="destructive" className="bg-red-600 text-xs py-0.5 font-bold">
                              {m.totalQuantity - m.returnedQuantity}x {m.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                        <AlertCircle size={14} /> Observação Obrigatória de Materiais Faltantes / Justificativa *
                      </Label>
                      <Textarea 
                        rows={2}
                        value={returnFormMissingObs}
                        onChange={(e) => setReturnFormMissingObs(e.target.value)}
                        placeholder="Descreva detalhadamente o motivo da ausência dos materiais (ex: extraviado em campo, permaneceu na viatura, quebra durante treinamento)..."
                        className="border-red-300 focus-visible:ring-red-400 text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Termo e Observações Gerais da Devolução */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Termo / Observações Gerais da Devolução
                </Label>
                <Textarea 
                  rows={2}
                  value={returnFormObservations}
                  onChange={(e) => setReturnFormObservations(e.target.value)}
                  placeholder="Observações complementares sobre o estado de conservação, limpeza ou inspeção dos materiais..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Rodapé com Ações Inteligentes */}
            <DialogFooter className="p-4 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsReturnModalOpen(false)}
              >
                Cancelar
              </Button>

              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                {(() => {
                  const hasMissing = returnItemsState.some(i => i.returnedQuantity < i.totalQuantity);

                  if (!hasMissing) {
                    return (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmReturn('regular')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 size={16} /> Confirmar Devolução Integral
                      </Button>
                    );
                  }

                  return (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirmReturn('keep_open_missing')}
                        className="border-amber-400 text-amber-800 hover:bg-amber-50 dark:text-amber-200 gap-1.5 font-bold"
                        title="Dá entrada nos itens devolvidos, mas mantém a carga em aberto com termo de faltas"
                      >
                        <RotateCcw size={15} /> Manter Carga Aberta (c/ Faltas)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConfirmReturn('close_missing')}
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5 font-bold shadow-sm"
                        title="Encerra o empréstimo gerando ficha oficial com registro de materiais faltantes"
                      >
                        <ShieldAlert size={15} /> Encerrar Carga (Gerando Faltas)
                      </Button>
                    </>
                  );
                })()}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FICHA OFICIAL / TERMO DE DEVOLUÇÃO (PREVIEW, IMPRESSÃO E PDF) */}
      {/* ========================================================================= */}
      {isReturnReceiptModalOpen && returnReceiptLoan && (
        <Dialog open={isReturnReceiptModalOpen} onOpenChange={setIsReturnReceiptModalOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-muted/30 border-b shrink-0 flex-row items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileCheck className={`h-5 w-5 ${returnReceiptLoan.hasMissingItems ? 'text-red-600' : 'text-emerald-600'}`} />
                  Termo Oficial de Devolução e Conferência
                </DialogTitle>
                <DialogDescription>
                  Ficha oficial de conferência registrada no acervo da Sala de Altura.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 pr-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePrintReturnReceipt(returnReceiptLoan)}
                  disabled={isGeneratingPdf}
                  className="gap-1.5"
                >
                  <Printer size={15} /> Imprimir Ficha
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleDownloadReturnReceiptPDF(returnReceiptLoan)}
                  disabled={isGeneratingPdf}
                  className={`${returnReceiptLoan.hasMissingItems ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white gap-1.5`}
                >
                  <Download size={15} /> Baixar PDF
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-900 flex justify-center">
              <div className="w-full max-w-3xl bg-white text-zinc-900 shadow-xl border border-border/80 rounded-lg p-6 sm:p-8 space-y-6 text-sm relative">
                {/* Faixa decorativa superior */}
                <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${returnReceiptLoan.hasMissingItems ? 'bg-red-600' : 'bg-emerald-600'}`} />

                {/* Cabeçalho */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h3 className={`font-extrabold text-base uppercase tracking-wide ${returnReceiptLoan.hasMissingItems ? 'text-red-700' : 'text-emerald-700'}`}>
                      {settings?.hierarchy?.matrizName || 'SALA DE ALTURA'}
                    </h3>
                    <h4 className="font-bold text-sm text-zinc-800">
                      {settings?.unitName || 'CORPO DE BOMBEIROS'}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {settings?.hierarchy?.subunitName || 'Companhia'} / {settings?.hierarchy?.postName || 'Posto Operacional'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`font-mono text-xs font-bold ${returnReceiptLoan.hasMissingItems ? 'border-red-600 text-red-600' : 'border-emerald-600 text-emerald-600'}`}>
                      FICHA DEV-{(returnReceiptLoan.id || '').slice(-6).toUpperCase()}
                    </Badge>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Conferência: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Título Oficial */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900">
                    Termo de Devolução e Conferência de Materiais
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {returnReceiptLoan.hasMissingItems 
                      ? 'FICHA DE RECEBIMENTO PARCIAL / REGISTRO DE MATERIAIS FALTANTES'
                      : 'FICHA REGULAR DE BAIXA E CONFERÊNCIA DE CAUTELA OPERACIONAL'}
                  </p>
                </div>

                {/* Quadro de Informações da Devolução */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-50 border rounded-md text-xs">
                  <div>
                    <span className="font-bold text-zinc-500 block">Militar Devolvente:</span>
                    <span className="font-bold text-zinc-900 text-sm uppercase">{returnReceiptLoan.soldierName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Destino / Finalidade:</span>
                    <span className="font-semibold text-zinc-800">{returnReceiptLoan.destination}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Local de Retirada (Origem):</span>
                    <span className="font-semibold text-zinc-800">{getLocationDisplayName(returnReceiptLoan.sourceLocationId)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Resp. pela Entrega (Saída):</span>
                    <span className="font-semibold text-zinc-800">{returnReceiptLoan.deliveryResponsible || 'Encarregado da Reserva'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Resp. pelo Recebimento (Devolução):</span>
                    <span className="font-bold text-emerald-800">{returnReceiptLoan.returnResponsible || 'Armeiro / Recebedor'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Data/Hora Saída:</span>
                    <span className="text-zinc-800">
                      {returnReceiptLoan.exitDate ? format(new Date(returnReceiptLoan.exitDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Data da Devolução:</span>
                    <span className="text-zinc-800 font-semibold">
                      {returnReceiptLoan.returnDate ? format(new Date(returnReceiptLoan.returnDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 block">Situação da Conferência:</span>
                    <Badge variant={returnReceiptLoan.hasMissingItems ? 'destructive' : 'default'} className={returnReceiptLoan.hasMissingItems ? 'bg-red-600 text-white font-bold' : 'bg-emerald-600 text-white font-bold'}>
                      {returnReceiptLoan.hasMissingItems ? 'COM MATERIAIS FALTANTES' : '100% REGULAR / DEVOLVIDO'}
                    </Badge>
                  </div>
                </div>

                {/* Tabela de Materiais Conferidos Item a Item */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-700 mb-2">
                    Conferência Item a Item
                  </h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className={returnReceiptLoan.hasMissingItems ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'}>
                        <tr>
                          <th className="p-2 text-center w-10 font-bold">Item</th>
                          <th className="p-2 text-left font-bold">Descrição do Material</th>
                          <th className="p-2 text-center w-20 font-bold">Retirado</th>
                          <th className="p-2 text-center w-20 font-bold">Devolvido</th>
                          <th className="p-2 text-center w-20 font-bold">Faltando</th>
                          <th className="p-2 text-center w-28 font-bold">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {(() => {
                          const retMap = new Map<string, number>();
                          (returnReceiptLoan.returnedMaterials || []).forEach(rm => retMap.set(rm.materialId, rm.quantity));
                          
                          const missMap = new Map<string, number>();
                          (returnReceiptLoan.missingMaterials || []).forEach(mm => missMap.set(mm.materialId, mm.quantity));

                          return (returnReceiptLoan.materials || []).map((item, idx) => {
                            const mat = getMaterialDetails(item.materialId);
                            const totalRet = item.quantity;
                            const hasExplicitRecord = retMap.has(item.materialId) || missMap.has(item.materialId);
                            
                            const devQty = hasExplicitRecord 
                              ? (retMap.get(item.materialId) || 0)
                              : (returnReceiptLoan.hasMissingItems ? 0 : totalRet);
                            
                            const faltQty = hasExplicitRecord 
                              ? (missMap.get(item.materialId) ?? Math.max(0, totalRet - devQty))
                              : (returnReceiptLoan.hasMissingItems ? totalRet : 0);
                            
                            const isMissing = faltQty > 0;

                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                                <td className="p-2 text-center font-bold text-zinc-500">{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="p-2 font-bold text-zinc-900">{getMaterialDescription(item.materialId)}</td>
                                <td className="p-2 text-center font-medium text-zinc-700">{totalRet} {mat?.unit || 'un'}</td>
                                <td className="p-2 text-center font-bold text-emerald-700">{devQty} {mat?.unit || 'un'}</td>
                                <td className="p-2 text-center font-bold text-red-600">{faltQty} {mat?.unit || 'un'}</td>
                                <td className="p-2 text-center">
                                  {isMissing ? (
                                    <span className="text-red-700 font-bold text-[11px] bg-red-100 px-2 py-0.5 rounded">
                                      FALTA ({faltQty})
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                                      REGULAR
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Observações da Devolução */}
                {returnReceiptLoan.returnObservations && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs">
                    <span className="font-bold text-amber-900 block mb-0.5">Termo / Observações da Devolução:</span>
                    <p className="text-zinc-700">{returnReceiptLoan.returnObservations}</p>
                  </div>
                )}

                {/* Observações de Faltas */}
                {returnReceiptLoan.missingObservations && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-md text-xs">
                    <span className="font-bold text-red-900 block mb-0.5">Registro de Materiais Faltantes / Pendências:</span>
                    <p className="text-red-800 font-medium">{returnReceiptLoan.missingObservations}</p>
                  </div>
                )}

                {/* Termo de Declaração */}
                <div className="p-3 bg-zinc-50 border rounded-md text-[11px] text-zinc-600 space-y-1">
                  <span className="font-bold text-zinc-800 block uppercase tracking-wide">
                    Declaração de Devolução e Conformidade:
                  </span>
                  <p>
                    {returnReceiptLoan.hasMissingItems
                      ? 'Certifico que os materiais devolvidos foram devidamente conferidos e reintegrados ao acervo, constando as pendências e faltas discriminadas acima. O militar responsável fica ciente das pendências registradas nesta ficha para as devidas providências administrativas regulamentares.'
                      : 'Certifico haver recebido e conferido integralmente todos os materiais listados neste documento em perfeita conformidade, dando baixa total na respectiva carga e cautela operacional.'}
                  </p>
                </div>

                {/* Linhas de Assinatura */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                  <div>
                    <div className="border-t border-zinc-400 w-4/5 mx-auto mb-1.5" />
                    <p className="font-bold text-zinc-900 uppercase">{returnReceiptLoan.soldierName}</p>
                    <p className="text-[11px] text-zinc-500">Militar Devolvente</p>
                  </div>
                  <div>
                    <div className="border-t border-zinc-400 w-4/5 mx-auto mb-1.5" />
                    <p className="font-bold text-zinc-900 uppercase">
                      {returnReceiptLoan.returnResponsible || 'Armeiro / Recebedor'}
                    </p>
                    <p className="text-[11px] text-zinc-500">Responsável pelo Recebimento / Conferência</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 bg-muted/20 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Ficha oficial arquivada no histórico de cargas e devoluções.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReturnReceiptModalOpen(false)}>
                  Fechar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleDownloadReturnReceiptPDF(returnReceiptLoan)}
                  disabled={isGeneratingPdf}
                  className={`${returnReceiptLoan.hasMissingItems ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white gap-1.5`}
                >
                  <Download size={15} /> Baixar PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
