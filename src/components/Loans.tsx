import React, { useState } from 'react';
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
  CardTitle 
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
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Briefcase,
  Calendar,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { Loan, Material, Location } from '../types';
import { getAvailableQuantity } from '../lib/inventoryUtils';
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
}

export function Loans({ loans = [], setLoans, materials = [], setMaterials, locations = [], setLocations, addLog }: LoansProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    soldierName: '',
    destination: '',
    courseName: '',
    observations: '',
    expectedDuration: '',
    sourceType: 'reserva' as 'reserva' | 'location',
    sourceLocationId: '',
    materialId: '',
    quantity: 0
  });

  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeLocations = Array.isArray(locations) ? locations : [];

  const handleCreateLoan = () => {
    if (!formData.soldierName || !formData.destination || !formData.courseName || !formData.materialId || formData.quantity <= 0) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (formData.sourceType === 'location' && !formData.sourceLocationId) {
      toast.error('Selecione o local de origem.');
      return;
    }

    const material = safeMaterials.find(m => m.id === formData.materialId);
    if (!material) {
      toast.error('Material não encontrado.');
      return;
    }

    let available = 0;
    if (formData.sourceType === 'reserva') {
      available = getAvailableQuantity(material, safeLocations, safeLoans);
    } else {
      const loc = safeLocations.find(l => l.id === formData.sourceLocationId);
      const locMat = loc?.materials.find(m => m.materialId === formData.materialId);
      available = locMat?.quantity || 0;
    }

    if (formData.quantity > available) {
      toast.error('Quantidade indisponível na origem selecionada.');
      return;
    }

    const newLoan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      soldierName: formData.soldierName,
      destination: formData.destination,
      courseName: formData.courseName,
      observations: formData.observations,
      expectedDuration: formData.expectedDuration,
      exitDate: new Date().toISOString(),
      status: 'ativo',
      sourceLocationId: formData.sourceType === 'location' ? formData.sourceLocationId : undefined,
      materials: [{ materialId: formData.materialId, quantity: formData.quantity }]
    };

    // Update sources
    if (formData.sourceType === 'reserva') {
      // No need to update availableQuantity in material object as it's now derived
      // But we can update it for compatibility if needed. 
      // For now, let's just update the materials state to trigger re-render if needed, 
      // although loans state change will already trigger it.
    } else {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === formData.sourceLocationId) {
          return {
            ...loc,
            materials: loc.materials.map(m => m.materialId === formData.materialId ? { ...m, quantity: m.quantity - formData.quantity } : m)
          };
        }
        return loc;
      });
      setLocations(updatedLocations);
    }

    setLoans([...safeLoans, newLoan]);
    addLog('Empréstimo/Carga Temporária', `Material ${material.name} (${formData.quantity}) retirado de ${formData.sourceType === 'reserva' ? 'Reserva' : 'Viatura'} para ${formData.soldierName} em ${formData.destination}.`);
    toast.success('Empréstimo registrado!');
    setIsDialogOpen(false);
    setFormData({ soldierName: '', destination: '', courseName: '', observations: '', expectedDuration: '', sourceType: 'reserva', sourceLocationId: '', materialId: '', quantity: 0 });
  };

  const handleReturn = (loan: Loan) => {
    const updatedLoans = safeLoans.map(l => l.id === loan.id ? { ...l, status: 'devolvido' as const, returnDate: new Date().toISOString() } : l);
    
    // Return materials to their source
    if (loan.sourceLocationId) {
      const updatedLocations = safeLocations.map(loc => {
        if (loc.id === loan.sourceLocationId) {
          const newMaterials = [...loc.materials];
          loan.materials.forEach(item => {
            const idx = newMaterials.findIndex(m => m.materialId === item.materialId);
            if (idx !== -1) {
              newMaterials[idx] = { ...newMaterials[idx], quantity: newMaterials[idx].quantity + item.quantity };
            } else {
              newMaterials.push({ materialId: item.materialId, quantity: item.quantity });
            }
          });
          return { ...loc, materials: newMaterials };
        }
        return loc;
      });
      setLocations(updatedLocations);
    } else {
      // No need to update availableQuantity in material object as it's now derived
    }

    setLoans(updatedLoans);
    addLog('Devolução de Material', `Materiais devolvidos por ${loan.soldierName} (${loan.destination}).`);
    toast.success('Devolução registrada com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Empréstimos e Cursos</h1>
          <p className="text-muted-foreground">Controle de carga temporária para militares em instrução.</p>
        </div>
        <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => {
          setFormData({ soldierName: '', destination: '', courseName: '', observations: '', expectedDuration: '', sourceType: 'reserva', sourceLocationId: '', materialId: '', quantity: 0 });
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Registrar Carga Temporária
        </Button>
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Registrar Carga Temporária</h2>
                <p className="text-sm text-muted-foreground">Controle a saída de materiais para cursos, instruções ou missões externas.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateLoan} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">Confirmar Saída</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Responsável e Destino</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="soldier">Militar Responsável</Label>
                      <Input id="soldier" placeholder="Nome completo ou RE" value={formData.soldierName} onChange={(e) => setFormData({...formData, soldierName: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dest">Destino / Unidade</Label>
                      <Input id="dest" placeholder="Local da missão ou curso" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="course">Curso / Finalidade</Label>
                      <Input id="course" placeholder="Ex: Salvamento em Altura" value={formData.courseName} onChange={(e) => setFormData({...formData, courseName: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duração Prevista</Label>
                      <Input id="duration" placeholder="Ex: 5 dias, 1 semana" value={formData.expectedDuration} onChange={(e) => setFormData({...formData, expectedDuration: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seleção de Materiais</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Origem do Material</Label>
                      <Select value={formData.sourceType} onValueChange={(val: any) => setFormData({...formData, sourceType: val, sourceLocationId: '', materialId: ''})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reserva">Reserva Central</SelectItem>
                          <SelectItem value="location">Viatura / Compartimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.sourceType === 'location' && (
                      <div className="grid gap-2">
                        <Label>Selecione a Viatura</Label>
                        <Select value={formData.sourceLocationId} onValueChange={(val) => setFormData({...formData, sourceLocationId: val, materialId: ''})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {safeLocations.filter(l => l.type === 'viatura').map(loc => (
                              <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.prefixo})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Material</Label>
                      <Select value={formData.materialId} onValueChange={(val) => setFormData({...formData, materialId: val})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.sourceType === 'reserva' ? (
                            safeMaterials.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name} ({getAvailableQuantity(m, safeLocations, safeLoans)})</SelectItem>
                            ))
                          ) : (
                            safeLocations.find(l => l.id === formData.sourceLocationId)?.materials.map(item => {
                              const m = safeMaterials.find(mat => mat.id === item.materialId);
                              return <SelectItem key={item.materialId} value={item.materialId}>{m?.name} ({item.quantity})</SelectItem>;
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Quantidade</Label>
                      <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="obs">Observações Adicionais</Label>
                    <Textarea id="obs" placeholder="Alguma observação sobre o estado do material ou detalhes da saída..." value={formData.observations} onChange={(e) => setFormData({...formData, observations: e.target.value})} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Militar / Curso</TableHead>
                <TableHead>Materiais</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Previsão/Retorno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{loan.soldierName || 'Militar'}</span>
                      <span className="text-xs text-[#B22222] font-semibold">{loan.destination}</span>
                      <span className="text-[10px] text-muted-foreground">{loan.courseName || 'Curso'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {(loan.materials || []).map(item => {
                        const m = safeMaterials.find(mat => mat.id === item.materialId);
                        return <div key={item.materialId} className="text-sm">{item.quantity}x {m?.name || 'Item'}</div>;
                      })}
                      {loan.sourceLocationId && (
                        <Badge variant="outline" className="text-[9px] w-fit">
                          De: {safeLocations.find(l => l.id === loan.sourceLocationId)?.name}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(loan.exitDate), "dd/MM/yy HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {loan.status === 'ativo' ? (
                      <span className="text-orange-600 font-medium">{loan.expectedDuration}</span>
                    ) : (
                      <span className="text-green-600">{format(new Date(loan.returnDate!), "dd/MM/yy HH:mm")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={loan.status === 'ativo' ? 'destructive' : 'outline'}>
                      {loan.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {loan.status === 'ativo' && (
                      <Button variant="outline" size="sm" onClick={() => handleReturn(loan)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Devolver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {safeLoans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum empréstimo ativo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
