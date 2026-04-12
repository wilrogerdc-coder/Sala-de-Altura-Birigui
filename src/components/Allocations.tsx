import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Truck, 
  Plus, 
  ArrowRightLeft, 
  Edit2,
  Trash2,
  Warehouse
} from 'lucide-react';
import { Location, Material } from '../types';
import { getAllocatedQuantity } from '../lib/inventoryUtils';
import { toast } from 'sonner';

interface AllocationsProps {
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  materials: Material[];
  addLog: (action: string, details: string) => void;
}

export function Allocations({ locations, setLocations, materials, addLog }: AllocationsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    prefixo: '',
    type: 'viatura' as 'viatura' | 'outro',
    status: 'operacional' as any,
    description: ''
  });

  const handleSaveLocation = () => {
    if (!formData.name) {
      toast.error('O nome é obrigatório.');
      return;
    }

    if (editingLocation) {
      const updated = locations.map(l => l.id === editingLocation.id ? { ...l, ...formData } : l);
      setLocations(updated);
      addLog('Edição de Local', `Local ${formData.name} foi atualizado.`);
      toast.success('Local atualizado!');
    } else {
      const newLoc: Location = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        materials: []
      };
      setLocations([...locations, newLoc]);
      addLog('Novo Local', `Local ${formData.name} foi criado.`);
      toast.success('Local criado!');
    }
    setIsDialogOpen(false);
    setEditingLocation(null);
    setFormData({ name: '', prefixo: '', type: 'viatura', status: 'operacional', description: '' });
  };

  const deleteLocation = (id: string) => {
    const loc = locations.find(l => l.id === id);
    if (loc && loc.materials.length > 0) {
      toast.error('Não é possível excluir um local que possui materiais alocados.');
      return;
    }
    setLocations(locations.filter(l => l.id !== id));
    addLog('Exclusão de Local', `Local ${loc?.name} foi removido.`);
    toast.success('Local removido.');
  };

  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Locais e Viaturas</h1>
          <p className="text-muted-foreground">Gerencie as unidades operacionais e depósitos do quartel.</p>
        </div>
        <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => {
          setEditingLocation(null);
          setFormData({ name: '', prefixo: '', type: 'viatura', status: 'operacional', description: '' });
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Local / Viatura
        </Button>
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                {formData.type === 'viatura' ? <Truck size={20} /> : <Warehouse size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{editingLocation ? 'Editar Local / Viatura' : 'Novo Local / Viatura'}</h2>
                <p className="text-sm text-muted-foreground">Cadastre ou atualize as informações do compartimento de armazenamento.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveLocation} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">Salvar</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="locName">Nome do Local/Viatura</Label>
                      <Input id="locName" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prefixo">Prefixo (Opcional)</Label>
                      <Input id="prefixo" value={formData.prefixo} onChange={(e) => setFormData({...formData, prefixo: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viatura">Viatura</SelectItem>
                          <SelectItem value="outro">Outro (Depósito/Reserva)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(val: any) => setFormData({...formData, status: val})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operacional">Operacional</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="reserva">Reserva</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>
 
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Reserva Card - Always First */}
        {safeLocations.filter(l => l.type === 'reserva').map((loc) => (
          <Card key={loc.id} className="overflow-hidden border-t-4 border-t-blue-600 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Warehouse size={20} className="text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{loc.name}</CardTitle>
                    <CardDescription>Depósito Central / Reserva</CardDescription>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                SISTEMA
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Materiais em Reserva</span>
                  <span className="text-muted-foreground">
                    {safeMaterials.filter(m => (m.totalQuantity - getAllocatedQuantity(m.id, safeLocations)) > 0).length} categorias
                  </span>
                </div>
                <div className="space-y-2">
                  {safeMaterials
                    .filter(m => (m.totalQuantity - getAllocatedQuantity(m.id, safeLocations)) > 0)
                    .slice(0, 3)
                    .map((m) => {
                      const available = m.totalQuantity - getAllocatedQuantity(m.id, safeLocations);
                      return (
                        <div key={m.id} className="flex justify-between items-center text-sm p-2 bg-white/50 rounded-md border border-blue-100">
                          <span className="truncate">{m.name}</span>
                          <span className="font-bold">{available} {m.unit}</span>
                        </div>
                      );
                    })}
                  {safeMaterials.filter(m => (m.totalQuantity - getAllocatedQuantity(m.id, safeLocations)) > 0).length > 3 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                      + {safeMaterials.filter(m => (m.totalQuantity - getAllocatedQuantity(m.id, safeLocations)) > 0).length - 3} outros materiais
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    // Redirect or show details? Let's show details but specialized
                    setSelectedLocation(loc);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  Ver Inventário da Reserva
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Other Locations */}
        {safeLocations.filter(l => l.type !== 'reserva').map((loc) => (
          <Card key={loc.id} className="overflow-hidden border-t-4 border-t-[#B22222]">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {loc.type === 'viatura' ? <Truck size={20} className="text-[#B22222]" /> : <Warehouse size={20} className="text-[#B22222]" />}
                  <div>
                    <CardTitle className="text-xl">{loc.name || 'Sem Nome'}</CardTitle>
                    <CardDescription>{loc.prefixo || loc.type || 'Local'}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingLocation(loc);
                    setFormData({
                      name: loc.name || '',
                      prefixo: loc.prefixo || '',
                      type: (loc.type as any) || 'viatura',
                      status: loc.status || 'operacional',
                      description: loc.description || ''
                    });
                    setIsDialogOpen(true);
                  }}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteLocation(loc.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <Badge 
                variant={loc.status === 'operacional' || loc.status === 'ativo' ? 'outline' : 'destructive'}
                className={loc.status === 'operacional' || loc.status === 'ativo' ? 'text-green-600 border-green-200 bg-green-50' : ''}
              >
                {(loc.status || 'DESCONHECIDO').toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Carga Alocada</span>
                  <span className="text-muted-foreground">{(loc.materials || []).length} itens</span>
                </div>
                <div className="space-y-2">
                  {(loc.materials || []).slice(0, 3).map((item) => {
                    const material = safeMaterials.find(m => m.id === item.materialId);
                    return (
                      <div key={item.materialId} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                        <span className="truncate">{material?.name || 'Material Desconhecido'}</span>
                        <span className="font-bold">{item.quantity} {material?.unit || ''}</span>
                      </div>
                    );
                  })}
                  {(loc.materials || []).length > 3 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                      + {(loc.materials || []).length - 3} outros itens
                    </p>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  className="w-full mt-2"
                  onClick={() => {
                    setSelectedLocation(loc);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  Ver Detalhes da Carga
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details Overlay - Full Screen */}
      {isDetailsDialogOpen && selectedLocation && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                {selectedLocation.type === 'viatura' ? <Truck size={20} /> : <Warehouse size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-bold">Carga Detalhada: {selectedLocation.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedLocation.prefixo ? `Viatura ${selectedLocation.prefixo}` : 'Depósito / Local de Armazenamento'}
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => setIsDetailsDialogOpen(false)}>Fechar Visualização</Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-5xl mx-auto space-y-6">
              {selectedLocation.type === 'reserva' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Inventário Disponível na Reserva</CardTitle>
                    <CardDescription>Estes materiais estão prontos para alocação ou empréstimo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-center">Disponível</TableHead>
                          <TableHead className="text-right">Total Geral</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeMaterials.filter(m => (m.totalQuantity - getAllocatedQuantity(m.id, safeLocations)) > 0).map(m => {
                          const available = m.totalQuantity - getAllocatedQuantity(m.id, safeLocations);
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.name}</TableCell>
                              <TableCell>{m.category}</TableCell>
                              <TableCell className="text-center font-bold text-blue-600">{available} {m.unit}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{m.totalQuantity} {m.unit}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{(selectedLocation.materials || []).length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Status da Unidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          {(selectedLocation.status || 'operacional').toUpperCase()}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Materiais Alocados</CardTitle>
                      <CardDescription>Gerencie a carga desta unidade. Você pode retornar quantidades parciais para a reserva.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-center">Quantidade Atual</TableHead>
                            <TableHead className="w-[200px] text-center">Qtd. para Retornar</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedLocation.materials || []).map((item) => {
                            const material = safeMaterials.find(m => m.id === item.materialId);
                            return (
                              <TableRow key={item.materialId}>
                                <TableCell>
                                  <div className="font-medium">{material?.name || 'Desconhecido'}</div>
                                  <div className="text-xs text-muted-foreground">{material?.category}</div>
                                </TableCell>
                                <TableCell className="text-center font-bold text-lg">{item.quantity} {material?.unit}</TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max={item.quantity}
                                    defaultValue={item.quantity}
                                    className="w-24 mx-auto"
                                    id={`return-qty-${item.materialId}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => {
                                      if (!selectedLocation || !material) return;
                                      const input = document.getElementById(`return-qty-${item.materialId}`) as HTMLInputElement;
                                      const returnQty = parseInt(input.value) || 0;

                                      if (returnQty <= 0 || returnQty > item.quantity) {
                                        toast.error('Quantidade inválida para retorno.');
                                        return;
                                      }
                                      
                                      // Update location materials
                                      const updatedLocations = locations.map(l => {
                                        if (l.id === selectedLocation.id) {
                                          const newMaterials = l.materials.map(m => {
                                            if (m.materialId === item.materialId) {
                                              return { ...m, quantity: m.quantity - returnQty };
                                            }
                                            return m;
                                          }).filter(m => m.quantity > 0);
                                          
                                          return { ...l, materials: newMaterials };
                                        }
                                        return l;
                                      });
                                      
                                      setLocations(updatedLocations);
                                      setSelectedLocation(updatedLocations.find(l => l.id === selectedLocation.id) || null);
                                      
                                      addLog('Retorno de Material', `Retornado ${returnQty} ${material.unit} de ${material.name} de ${selectedLocation.name} para Reserva.`);
                                      toast.success(`${returnQty} ${material.unit} retornados à reserva.`);
                                    }}
                                  >
                                    Retornar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(selectedLocation.materials || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                Nenhum material alocado neste local.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
