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
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ArrowUpDown,
  ArrowLeftRight,
  Filter,
  MapPin,
  Package,
  Download,
  Upload,
  Activity,
  Truck,
  Warehouse
} from 'lucide-react';
import { Material, Location, Loan } from '../types';
import { getAllocatedQuantity, getAvailableQuantity, getActiveLoansQuantity } from '../lib/inventoryUtils';
import { toast } from 'sonner';

interface InventoryProps {
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  loans: Loan[];
  addLog: (action: string, details: string) => void;
}

export function Inventory({ materials, setMaterials, locations, setLocations, loans, addLog }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    totalQuantity: 0,
    unit: 'un',
    minStock: 2,
    observations: ''
  });

  const [allocationData, setAllocationData] = useState({
    locationId: '',
    quantity: 0
  });

  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeLocations = Array.isArray(locations) ? locations : [];

  const filteredMaterials = safeMaterials.filter(m => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveMaterial = () => {
    if (!formData.name || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (editingMaterial) {
      const updated = materials.map(m => m.id === editingMaterial.id ? {
        ...m,
        ...formData,
        availableQuantity: m.availableQuantity + (formData.totalQuantity - m.totalQuantity),
        lastUpdated: new Date().toISOString()
      } : m);
      setMaterials(updated);
      addLog('Edição de Material', `Material ${formData.name} foi atualizado.`);
      toast.success('Material atualizado com sucesso!');
    } else {
      const newMaterial: Material = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        availableQuantity: formData.totalQuantity,
        lastUpdated: new Date().toISOString()
      };
      setMaterials([...materials, newMaterial]);
      addLog('Novo Material', `Material ${formData.name} foi adicionado ao estoque.`);
      toast.success('Material adicionado com sucesso!');
    }
    setIsAddDialogOpen(false);
    setEditingMaterial(null);
    setFormData({ name: '', category: '', totalQuantity: 0, unit: 'un', minStock: 2, observations: '' });
  };

  const deleteMaterial = (id: string) => {
    const material = materials.find(m => m.id === id);
    if (!material) return;

    // Check if material is allocated in any location other than Reserva Central
    const isAllocated = safeLocations.some(loc => 
      loc.type !== 'reserva' && loc.materials.some(m => m.materialId === id)
    );

    if (isAllocated) {
      toast.error(`Não é possível excluir: O material "${material.name}" está alocado em viaturas ou locais. Desaloque-o primeiro.`);
      return;
    }

    // Remove from materials list
    setMaterials(materials.filter(m => m.id !== id));
    
    // Also ensure it's removed from any location (like Reserva)
    const updatedLocations = locations.map(loc => ({
      ...loc,
      materials: loc.materials.filter(m => m.materialId !== id)
    }));
    setLocations(updatedLocations);

    addLog('Exclusão de Material', `Material ${material.name} foi removido do sistema.`);
    toast.success('Material removido com sucesso.');
  };

  const handleAllocate = () => {
    if (!selectedMaterial || !allocationData.locationId || allocationData.quantity <= 0) {
      toast.error('Selecione um local e uma quantidade válida.');
      return;
    }

    const available = getAvailableQuantity(selectedMaterial, safeLocations, loans);

    if (allocationData.quantity > available) {
      toast.error('Quantidade superior à disponível na reserva.');
      return;
    }

    // Update location
    const updatedLocations = locations.map(loc => {
      if (loc.id === allocationData.locationId) {
        const existingMaterial = loc.materials.find(m => m.materialId === selectedMaterial.id);
        if (existingMaterial) {
          return {
            ...loc,
            materials: loc.materials.map(m => m.materialId === selectedMaterial.id ? { ...m, quantity: m.quantity + allocationData.quantity } : m)
          };
        } else {
          return {
            ...loc,
            materials: [...loc.materials, { materialId: selectedMaterial.id, quantity: allocationData.quantity }]
          };
        }
      }
      return loc;
    });

    // Update material available quantity
    const updatedMaterials = materials.map(m => m.id === selectedMaterial.id ? {
      ...m,
      availableQuantity: m.availableQuantity - allocationData.quantity
    } : m);

    setLocations(updatedLocations);
    setMaterials(updatedMaterials);
    
    const location = locations.find(l => l.id === allocationData.locationId);
    addLog('Alocação de Material', `Alocado ${allocationData.quantity} ${selectedMaterial.unit} de ${selectedMaterial.name} para ${location?.name}.`);
    
    toast.success('Material alocado com sucesso!');
    setIsAllocateDialogOpen(false);
    setSelectedMaterial(null);
    setAllocationData({ locationId: '', quantity: 0 });
  };

  const handleExportMaterials = () => {
    const data = {
      materials: safeMaterials,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SALA_DE_ALTURA_Materiais_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addLog('Exportação de Materiais', 'Lista de materiais exportada.');
    toast.success('Lista de materiais exportada!');
  };

  const handleImportMaterials = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported.materials)) {
          setMaterials([...materials, ...imported.materials]);
          addLog('Importação de Materiais', `${imported.materials.length} materiais importados.`);
          toast.success(`${imported.materials.length} materiais importados com sucesso!`);
        }
      } catch (err) {
        toast.error('Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Inventário de Materiais</h1>
          <p className="text-muted-foreground">Gerencie o estoque central e alocações do departamento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMaterials}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <div className="relative">
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Importar
                <input type="file" className="hidden" accept=".json" onChange={handleImportMaterials} />
              </label>
            </Button>
          </div>
          <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => {
            setEditingMaterial(null);
            setFormData({ name: '', category: '', totalQuantity: 0, unit: 'un', minStock: 2, observations: '' });
            setIsAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Material
          </Button>
          {isAddDialogOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <Package size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
                <p className="text-sm text-muted-foreground">Cadastre ou atualize as informações do item no estoque central.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveMaterial} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">Salvar Material</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Equipamento</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do Material</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Input id="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unit">Unidade de Medida</Label>
                      <Input id="unit" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="total">Quantidade Total em Carga</Label>
                      <Input id="total" type="number" value={formData.totalQuantity} onChange={(e) => setFormData({...formData, totalQuantity: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="min">Estoque Mínimo (Alerta)</Label>
                      <Input id="min" type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="obs">Observações Adicionais</Label>
                    <Input id="obs" value={formData.observations} onChange={(e) => setFormData({...formData, observations: e.target.value})} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou categoria..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Alocado</TableHead>
                <TableHead className="text-center">Reserva</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => {
                const allocated = getAllocatedQuantity(material.id, safeLocations);
                const available = getAvailableQuantity(material, safeLocations, loans);
                const isLowStock = available <= material.minStock;
                
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        {material.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold">{material.totalQuantity} {material.unit}</TableCell>
                    <TableCell className="text-center text-orange-600 font-medium">{allocated} {material.unit}</TableCell>
                    <TableCell className="text-center font-semibold">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-semibold text-blue-600"
                        onClick={() => {
                          setSelectedMaterial({...material, availableQuantity: available});
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        {available} {material.unit}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock ? (
                        <Badge variant="destructive" className="bg-red-100 text-red-600 border-red-200">Crítico</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Estável</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            setSelectedMaterial(material);
                            setIsAllocateDialogOpen(true);
                          }}
                        >
                          <MapPin size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setEditingMaterial(material);
                            setFormData({
                              name: material.name,
                              category: material.category,
                              totalQuantity: material.totalQuantity,
                              unit: material.unit,
                              minStock: material.minStock,
                              observations: material.observations || ''
                            });
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteMaterial(material.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocation Overlay */}
      {isAllocateDialogOpen && selectedMaterial && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-500 rounded-lg text-white">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Alocar Material: {selectedMaterial.name}</h2>
                <p className="text-sm text-muted-foreground">Distribua este item para uma viatura ou local específico.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setIsAllocateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAllocate} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">Confirmar Alocação</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Alocação</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <Label>Local de Destino</Label>
                    <Select onValueChange={(val) => setAllocationData({...allocationData, locationId: val})}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o local ou viatura" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.filter(l => l.type !== 'reserva').map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type === 'viatura' ? loc.prefixo : 'Depósito'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="allocQty">Quantidade a Alocar</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        id="allocQty" 
                        type="number" 
                        className="h-12 text-lg font-bold"
                        value={allocationData.quantity} 
                        onChange={(e) => setAllocationData({...allocationData, quantity: parseInt(e.target.value) || 0})} 
                      />
                      <span className="text-muted-foreground font-medium">{selectedMaterial.unit}</span>
                    </div>
                    <p className="text-sm text-blue-600">Disponível na Reserva: {getAvailableQuantity(selectedMaterial, safeLocations, loans)} {selectedMaterial.unit}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Details Overlay - Full Screen */}
      {isDetailsDialogOpen && selectedMaterial && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Distribuição de Carga: {selectedMaterial.name}</h2>
                <p className="text-sm text-muted-foreground">Veja onde este material está alocado no momento.</p>
              </div>
            </div>
            <Button size="lg" onClick={() => setIsDetailsDialogOpen(false)}>Fechar Visualização</Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 font-medium uppercase">Reserva Central</p>
                      <p className="text-4xl font-bold text-blue-700">{getAvailableQuantity(selectedMaterial, safeLocations, loans)} {selectedMaterial.unit}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-orange-600 font-medium uppercase">Alocado / Em Uso</p>
                      <p className="text-4xl font-bold text-orange-700">
                        {(selectedMaterial.totalQuantity - getAvailableQuantity(selectedMaterial, safeLocations, loans))} {selectedMaterial.unit}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento da Alocação</CardTitle>
                  <CardDescription>Lista de todas as unidades e viaturas que possuem este item.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Local / Viatura</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeLocations.filter(loc => loc.materials.some(m => m.materialId === selectedMaterial.id)).map(loc => {
                        const locMat = loc.materials.find(m => m.materialId === selectedMaterial.id);
                        return (
                          <TableRow key={loc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {loc.type === 'viatura' ? <Truck size={16} className="text-muted-foreground" /> : <Warehouse size={16} className="text-muted-foreground" />}
                                {loc.name} {loc.prefixo ? `(${loc.prefixo})` : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">
                              {locMat?.quantity} {selectedMaterial.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  if (!selectedMaterial || !locMat) return;
                                  // Transfer back to Reserva
                                  const updatedLocations = locations.map(l => {
                                    if (l.id === loc.id) {
                                      return {
                                        ...l,
                                        materials: l.materials.filter(m => m.materialId !== selectedMaterial.id)
                                      };
                                    }
                                    return l;
                                  });
                                  setLocations(updatedLocations);
                                  addLog('Transferência de Carga', `Retornado ${locMat.quantity} ${selectedMaterial.unit} de ${selectedMaterial.name} de ${loc.name} para Reserva.`);
                                  toast.success('Material retornado à reserva.');
                                }}
                              >
                                Retornar à Reserva
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Active Loans from Reserva */}
                      {getActiveLoansQuantity(selectedMaterial.id, loans, true) > 0 && (
                        <TableRow className="bg-yellow-50/50">
                          <TableCell className="font-medium italic">
                            Empréstimos Ativos (da Reserva)
                          </TableCell>
                          <TableCell className="text-center font-bold text-yellow-700 text-lg">
                            {getActiveLoansQuantity(selectedMaterial.id, loans, true)} {selectedMaterial.unit}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            Ver aba Empréstimos
                          </TableCell>
                        </TableRow>
                      )}
                      {safeLocations.filter(loc => loc.materials.some(m => m.materialId === selectedMaterial.id)).length === 0 && 
                       (getActiveLoansQuantity(selectedMaterial.id, loans, true) === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                            Este material não está alocado em nenhuma viatura ou local externo.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
