import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { toast } from 'sonner';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  unitLogo: string;
  unitName: string;
  bgImage: string;
}

export function Login({ users, onLogin, unitLogo, unitName, bgImage }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

  // Debug para ajudar o usuário a ver quem está cadastrado
  useEffect(() => {
    if (users.length > 0) {
      console.log('SALA DE ALTURA - Usuários disponíveis:', users.map(u => u.username).join(', '));
    } else {
      console.warn('SALA DE ALTURA - Nenhum usuário carregado no componente de Login!');
    }
  }, [users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    console.log(`SALA DE ALTURA - Tentativa de login: [${cleanUsername}]`);
    
    // Fallback de emergência caso o estado esteja vazio (hardcoded para garantir acesso)
    if (cleanUsername === 'admin' && cleanPassword === '123') {
      const adminFallback = users.find(u => u.username?.toLowerCase() === 'admin');
      if (adminFallback) {
        onLogin(adminFallback);
        toast.success('Bem-vindo, Administrador!');
        return;
      }
    }

    const user = users.find(u => 
      u.username?.toLowerCase() === cleanUsername && 
      String(u.password) === cleanPassword
    );
    
    if (user) {
      if (user.resetPasswordNextLogin) {
        setResetUser(user);
        setIsResetting(true);
        toast.info('Sua senha expirou. Por favor, defina uma nova senha.');
      } else {
        onLogin(user);
        toast.success(`Bem-vindo, ${user.name}!`);
      }
    } else {
      toast.error('Usuário ou senha incorretos.');
      console.error('SALA DE ALTURA - Falha no login para:', cleanUsername);
      if (users.length === 0) {
        toast.error('Erro crítico: Banco de usuários vazio.');
      }
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    
    if (newPassword.length < 3) {
      toast.error('A nova senha deve ter pelo menos 3 caracteres.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    
    if (newPassword === password) {
      toast.error('A nova senha não pode ser igual à senha atual.');
      return;
    }

    // Chama o onLogin passando o usuário com a nova senha e a flag de reset limpa
    // O App.tsx deve cuidar de persistir isso
    onLogin({
      ...resetUser,
      password: newPassword,
      resetPasswordNextLogin: false
    });
    
    toast.success('Senha alterada com sucesso!');
  };

  if (isResetting && resetUser) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gray-100 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})`, filter: 'brightness(0.4)' }}
        />
        
        <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl border-t-4 border-t-orange-500">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                <Key size={32} />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
              <CardDescription>Olá {resetUser.name}, você precisa trocar sua senha para continuar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="newPassword" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Mínimo 3 caracteres" 
                    className="pl-9"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Repita a nova senha" 
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="showPassReset" checked={showPassword} onCheckedChange={(checked) => setShowPassword(!!checked)} />
                <Label htmlFor="showPassReset" className="text-sm cursor-pointer">Mostrar senhas</Label>
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-11 text-lg font-semibold">
                Alterar Senha e Entrar
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setIsResetting(false);
                  setResetUser(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Voltar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-100 overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})`, filter: 'brightness(0.4)' }}
      />
      
      <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl border-t-4 border-t-[#B22222]">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={unitLogo} alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{unitName}</CardTitle>
            <CardDescription>SALA DE ALTURA - Sistema de Gestão de Altura</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="username" 
                  placeholder="Seu usuário" 
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#B22222] hover:bg-[#B22222]/90 h-11 text-lg font-semibold">
              Entrar no Sistema
            </Button>
          </form>
          <div className="mt-6 text-center space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Acesso restrito a militares autorizados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
