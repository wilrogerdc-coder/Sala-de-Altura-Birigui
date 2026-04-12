import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  History, 
  FileText, 
  Settings as SettingsIcon,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  Shield,
  Briefcase,
  FileCode,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unitName: string;
  unitLogo: string;
  user: User;
  onLogout: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, unitName, unitLogo, user, onLogout, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'inventory', label: 'Inventário', icon: Package, permission: 'inventory' },
    { id: 'allocations', label: 'Locais/Viaturas', icon: Truck, permission: 'allocations' },
    { id: 'loans', label: 'Empréstimos/Cursos', icon: Briefcase, permission: 'loans' },
    { id: 'documents', label: 'Documentos', icon: FileCode, permission: 'documents' },
    { id: 'logs', label: 'Logs', icon: History, permission: 'logs' },
    { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'reports' },
    { id: 'users', label: 'Usuários', icon: UsersIcon, permission: 'settings' },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, permission: 'settings' },
    { id: 'help', label: 'Ajuda', icon: HelpCircle, permission: 'help' },
  ];

  const visibleItems = menuItems.filter(item => 
    (user.permissions || []).includes(item.permission)
  );

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <div className={cn(
        "fixed md:relative flex flex-col h-screen bg-[#1A1A1A] text-white transition-all duration-300 z-50",
        isOpen ? "w-64" : "w-20",
        "left-0 top-0",
        !isMobileOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between p-4 h-20">
          {(isOpen || isMobileOpen) && (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={unitLogo} alt="Logo" className="w-10 h-10 object-contain" />
              <span className="font-bold text-sm leading-tight line-clamp-2">{unitName}</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => isMobileOpen ? setIsMobileOpen?.(false) : setIsOpen(!isOpen)} 
            className="text-white hover:bg-white/10"
          >
            {isMobileOpen ? <X size={20} /> : (isOpen ? <X size={20} /> : <Menu size={20} />)}
          </Button>
        </div>

      <Separator className="bg-white/10" />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {visibleItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-4 h-12 transition-colors",
                activeTab === item.id ? "bg-[#B22222] text-white hover:bg-[#B22222]/90" : "text-gray-400 hover:text-white hover:bg-white/5",
                !isOpen && "justify-center px-0"
              )}
              onClick={() => handleTabClick(item.id)}
            >
              <item.icon size={20} />
              {isOpen && <span className="font-medium">{item.label}</span>}
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-white/10" />

      <div className="p-4">
        <div className={cn(
          "flex items-center gap-3",
          !isOpen && "justify-center"
        )}>
          <Avatar className="h-10 w-10 border-2 border-[#B22222]">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gray-700 text-white">
              {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{user.name || 'Usuário'}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Shield size={10} className="text-[#FFD700]" /> {(user.role || 'operador').toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          onClick={onLogout}
          className={cn(
            "w-full mt-4 justify-start gap-4 text-gray-400 hover:text-red-400 hover:bg-red-400/10",
            !isOpen && "justify-center px-0"
          )}
        >
          <LogOut size={20} />
          {isOpen && <span>Sair</span>}
        </Button>
      </div>
    </div>
    </>
  );
}
