import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  Mail, 
  Code, 
  Book, 
  Save,
  ShieldAlert
} from 'lucide-react';
import { AppSettings, User } from '../types';
import { toast } from 'sonner';

interface HelpProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  currentUser: User;
}

export function Help({ settings, setSettings, currentUser }: HelpProps) {
  const [devInfo, setDevInfo] = React.useState(settings.devInfo);

  const handleSaveDevInfo = () => {
    setSettings({ ...settings, devInfo });
    toast.success('Informações do desenvolvedor atualizadas!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Ajuda e Suporte</h1>
        <p className="text-muted-foreground">Informações sobre o uso do sistema e contato do desenvolvedor.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-[#B22222]" />
              Guia de Utilização
            </CardTitle>
            <CardDescription>Como operar as principais funções da SALA DE ALTURA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-bold">1. Inventário</p>
              <p className="text-muted-foreground">Adicione materiais e controle o estoque central. Use o ícone de localização para alocar materiais em viaturas ou outros locais.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">2. Viaturas e Locais</p>
              <p className="text-muted-foreground">Cadastre novas viaturas ou depósitos. Edite prefixos e status operacionais conforme a necessidade.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">3. Empréstimos (Cursos)</p>
              <p className="text-muted-foreground">Registre a saída temporária de materiais para militares em curso. Informe a duração e realize a baixa na devolução.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">4. Relatórios</p>
              <p className="text-muted-foreground">Gere documentos personalizados selecionando as colunas desejadas. Os relatórios possuem marca d'água e numeração de páginas.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[#B22222]" />
              Informações do Desenvolvedor
            </CardTitle>
            <CardDescription>Dados de contato e versão do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUser.role === 'super' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Editar Informações (Apenas Super Usuário)</Label>
                  <Textarea 
                    value={devInfo} 
                    onChange={(e) => setDevInfo(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={handleSaveDevInfo} className="w-full bg-[#B22222] hover:bg-[#B22222]/90">
                  <Save className="mr-2 h-4 w-4" /> Salvar Informações
                </Button>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50 whitespace-pre-wrap font-mono text-xs">
                {settings.devInfo}
              </div>
            )}
            
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-xs">
              <ShieldAlert size={16} />
              <span>Apenas o super usuário Cavalieri pode alterar estas informações.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
