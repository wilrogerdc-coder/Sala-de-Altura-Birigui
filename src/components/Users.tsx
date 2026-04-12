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
  User as UserIcon,
  UserPlus,
  Shield,
  Key,
  CheckCircle2
} from 'lucide-react';
import { User } from '../types';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface UsersProps {
  users: User[];
  setUsers: (users: User[]) => void;
  currentUser: User;
  addLog: (action: string, details: string) => void;
}

export function Users({ users, setUsers, currentUser, addLog }: UsersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'operador' as 'admin' | 'operador'
  });

  const allPermissions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventário' },
    { id: 'allocations', label: 'Locais/Viaturas' },
    { id: 'loans', label: 'Empréstimos' },
    { id: 'documents', label: 'Documentos' },
    { id: 'logs', label: 'Logs' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'settings', label: 'Configurações' },
    { id: 'help', label: 'Ajuda' },
  ];

  const safeUsers = Array.isArray(users) ? users : [];

  const togglePermission = (userId: string, permission: string) => {
    if (permission === 'logs' && currentUser.role !== 'super') {
      toast.error('Apenas o super usuário pode conceder acesso aos logs.');
      return;
    }

    const updated = safeUsers.map(u => {
      if (u.id === userId) {
        const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
        const hasPerm = userPerms.includes(permission);
        const newPerms = hasPerm 
          ? userPerms.filter(p => p !== permission) 
          : [...userPerms, permission];
        
        if (selectedUserForPerms?.id === userId) {
          setSelectedUserForPerms({...u, permissions: newPerms});
        }
        
        return { ...u, permissions: newPerms };
      }
      return u;
    });
    setUsers(updated);
    toast.success('Permissão atualizada.');
  };

  const filteredUsers = safeUsers.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveUser = () => {
    if (!formData.name || !formData.username || (!editingUser && !formData.password)) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (editingUser) {
      const updated = safeUsers.map(u => u.id === editingUser.id ? {
        ...u,
        name: formData.name,
        username: formData.username,
        password: formData.password || u.password,
        role: formData.role,
        permissions: formData.role === 'admin' 
          ? ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'reports', 'settings', 'help']
          : ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'help']
      } : u);
      setUsers(updated);
      addLog('Edição de Usuário', `Usuário ${formData.name} foi atualizado.`);
      toast.success('Usuário atualizado!');
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        permissions: formData.role === 'admin' 
          ? ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'reports', 'settings', 'help']
          : ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'help'],
        lastAccess: new Date().toISOString()
      };
      setUsers([...safeUsers, newUser]);
      addLog('Novo Usuário', `Usuário ${formData.name} foi criado.`);
      toast.success('Usuário criado!');
    }
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', role: 'operador' });
  };

  const deleteUser = (id: string) => {
    const user = safeUsers.find(u => u.id === id);
    if (user?.username === 'admin' || user?.username === 'cavalieri') {
      toast.error('Não é possível excluir usuários do sistema.');
      return;
    }
    setUsers(safeUsers.filter(u => u.id !== id));
    addLog('Exclusão de Usuário', `Usuário ${user?.name} foi removido.`);
    toast.success('Usuário removido.');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie quem pode acessar e operar o sistema.</p>
        </div>
        <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => {
          setEditingUser(null);
          setFormData({ name: '', username: '', password: '', role: 'operador' });
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <p className="text-sm text-muted-foreground">Gerencie o acesso e as credenciais dos operadores do sistema.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveUser} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">Salvar Usuário</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Operador</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="userName">Nome Completo</Label>
                    <Input id="userName" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="login">Usuário (Login)</Label>
                      <Input id="login" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pass">Senha</Label>
                      <Input id="pass" type="password" placeholder={editingUser ? 'Deixe em branco para manter' : ''} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nível de Acesso</Label>
                    <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                        <SelectItem value="operador">Operador (Acesso Limitado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar usuários..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserIcon size={16} className="text-[#B22222]" />
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'super' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                      {user.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-orange-600"
                        title="Permissões"
                        onClick={() => {
                          setSelectedUserForPerms(user);
                          setIsPermissionsDialogOpen(true);
                        }}
                        disabled={user.role === 'super' && currentUser.role !== 'super'}
                      >
                        <Shield size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        onClick={() => {
                          setEditingUser(user);
                          setFormData({
                            name: user.name,
                            username: user.username,
                            password: '',
                            role: user.role as any
                          });
                          setIsDialogOpen(true);
                        }}
                        disabled={user.role === 'super' && currentUser.role !== 'super'}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-600"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.username === 'admin' || user.username === 'cavalieri'}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Overlay - Full Screen */}
      {isPermissionsDialogOpen && selectedUserForPerms && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gestão de Permissões</h2>
                <p className="text-sm text-muted-foreground">
                  Ajuste o que o usuário <strong>{selectedUserForPerms.name}</strong> pode acessar no sistema.
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => setIsPermissionsDialogOpen(false)} className="bg-[#B22222] hover:bg-[#B22222]/90">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir e Salvar
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Módulos do Sistema</CardTitle>
                  <CardDescription>Selecione os módulos que este usuário terá permissão para visualizar e operar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                    {allPermissions.map((perm) => (
                      <div 
                        key={perm.id} 
                        className={`flex items-center space-x-3 p-4 border rounded-xl transition-all cursor-pointer hover:shadow-md ${
                          (selectedUserForPerms.permissions || []).includes(perm.id) 
                            ? 'bg-red-50 border-red-200 shadow-sm' 
                            : 'bg-white border-gray-200'
                        }`}
                        onClick={() => {
                          if (selectedUserForPerms.role !== 'super') {
                            togglePermission(selectedUserForPerms.id, perm.id);
                          }
                        }}
                      >
                        <Checkbox 
                          id={`perm-${perm.id}`}
                          checked={(selectedUserForPerms.permissions || []).includes(perm.id)}
                          onCheckedChange={() => togglePermission(selectedUserForPerms.id, perm.id)}
                          disabled={selectedUserForPerms.role === 'super'}
                          className="h-5 w-5"
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`perm-${perm.id}`} 
                            className="text-base font-medium cursor-pointer block"
                          >
                            {perm.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">Acesso ao módulo de {perm.label.toLowerCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedUserForPerms.role === 'super' && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-yellow-800">
                  <Shield className="h-5 w-5" />
                  <p className="text-sm font-medium">Este é um Super Usuário. Todas as permissões são concedidas automaticamente e não podem ser removidas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
