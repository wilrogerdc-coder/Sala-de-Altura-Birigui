import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Palette, 
  ImageIcon, 
  Save,
  UserPlus,
  Eye,
  Sliders,
  Download,
  Upload,
  Building2,
  MapPin,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  RefreshCw
} from 'lucide-react';
import { AppSettings, User, Material, Location, Loan, Log, Document } from '../types';
import { toast } from 'sonner';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface SettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  currentUser: User;
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  users: User[];
  documents: Document[];
  loans: Loan[];
  setLoans: (loans: Loan[]) => void;
  logs: Log[];
  setLogs: (logs: Log[]) => void;
  addLog: (action: string, details: string) => void;
}

export function Settings({ 
  settings, 
  setSettings, 
  currentUser,
  materials,
  setMaterials,
  locations,
  setLocations,
  users,
  documents,
  loans,
  setLoans,
  logs,
  setLogs,
  addLog
}: SettingsProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const safeSettings = (settings || {}) as Partial<AppSettings>;
  const unitName = safeSettings.unitName || '';
  const bgImage = safeSettings.bgImage || '';
  const bgOpacity = typeof safeSettings.bgOpacity === 'number' ? safeSettings.bgOpacity : 0.15;
  const reportWatermark = safeSettings.reportWatermark || '';
  const watermarkSize = safeSettings.watermarkSize || 300;
  const systemMode = safeSettings.systemMode || 'local';
  const hierarchy = safeSettings.hierarchy || { matrizName: '', subunitName: '', postName: '' };
  const googleSheetsUrl = safeSettings.googleSheetsUrl || '';

  const handleSyncNow = async () => {
    if (!googleSheetsUrl) {
      toast.error('Insira a URL do Google Sheets primeiro.');
      return;
    }
    toast.promise(
      async () => {
        const sheetsService = new GoogleSheetsService(googleSheetsUrl);
        try {
          await sheetsService.syncAll({
            Materials: materials,
            Locations: locations,
            Users: users,
            Settings: [settings],
            Documents: documents,
            Loans: loans,
            Logs: logs
          });
        } catch (error) {
          console.error('Erro no Sync Manual:', error);
          throw error;
        }
      },
      {
        loading: 'Sincronizando com Google Drive...',
        success: 'Dados sincronizados com sucesso!',
        error: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('fetch')) return 'Erro de Rede: Verifique a URL e as permissões.';
          return `Erro ao sincronizar: ${msg}`;
        }
      }
    );
  };

  const handleExport = () => {
    const data = {
      unitName,
      materials: materials.filter(m => !m.unitId), // Only local materials
      locations: locations.filter(l => !l.unitId), // Only local locations
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGA_Export_${unitName.replace(/\s+/g, '_')}.json`;
    a.click();
    addLog('Exportação de Dados', 'Arquivo de exportação gerado para a Matriz.');
    toast.success('Dados exportados com sucesso!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        const unitId = `unit_${Math.random().toString(36).substr(2, 5)}`;
        
        // Add unitId to imported items
        const newMaterials = importedData.materials.map((m: any) => ({ ...m, id: `${unitId}_${m.id}`, unitId, unitName: importedData.unitName }));
        const newLocations = importedData.locations.map((l: any) => ({ ...l, id: `${unitId}_${l.id}`, unitId, unitName: importedData.unitName }));

        setMaterials([...materials, ...newMaterials]);
        setLocations([...locations, ...newLocations]);
        
        addLog('Importação de Dados', `Dados da unidade ${importedData.unitName} importados.`);
        toast.success(`Dados da unidade ${importedData.unitName} importados com sucesso!`);
      } catch (err) {
        toast.error('Erro ao importar arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Personalize a identidade visual e gerencie permissões.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#B22222]" />
              Identidade Visual
            </CardTitle>
            <CardDescription>Personalize o nome, brasão e fundo do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unitName">Nome da Unidade</Label>
                  <Input 
                    id="unitName" 
                    value={unitName} 
                    onChange={(e) => setSettings({ ...safeSettings, unitName: e.target.value } as AppSettings)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitLogo">URL do Logo (Brasão)</Label>
                  <Input 
                    id="unitLogo" 
                    value={safeSettings.unitLogo || ''} 
                    onChange={(e) => setSettings({ ...safeSettings, unitLogo: e.target.value } as AppSettings)}
                  />
                </div>
              </div>
              <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                {safeSettings.unitLogo ? (
                  <img src={safeSettings.unitLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon className="text-gray-300" />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="bgImage">URL da Imagem de Fundo</Label>
              <Input 
                id="bgImage" 
                value={bgImage}
                onChange={(e) => setSettings({ ...safeSettings, bgImage: e.target.value } as AppSettings)}
              />
              {bgImage && (
                <div className="mt-2 h-20 rounded-md border bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})`, opacity: bgOpacity }} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Transparência do Fundo ({Math.round(bgOpacity * 100)}%)</Label>
              <input 
                type="range" 
                min="0" 
                max="0.5" 
                step="0.01" 
                className="w-full accent-[#B22222]"
                value={bgOpacity}
                onChange={(e) => setSettings({ ...safeSettings, bgOpacity: parseFloat(e.target.value) } as AppSettings)}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="watermark">URL da Marca d'água (Relatórios)</Label>
                <Input 
                  id="watermark" 
                  value={reportWatermark}
                  onChange={(e) => setSettings({ ...safeSettings, reportWatermark: e.target.value } as AppSettings)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tamanho da Marca d'água ({watermarkSize}px)</Label>
                <input 
                  type="range" 
                  min="50" 
                  max="800" 
                  step="10" 
                  className="w-full accent-[#B22222]"
                  value={watermarkSize}
                  onChange={(e) => setSettings({ ...safeSettings, watermarkSize: parseInt(e.target.value) } as AppSettings)}
                />
              </div>
              {reportWatermark && (
                <div className="flex justify-center p-4 border rounded-lg bg-white">
                  <img src={reportWatermark} alt="Watermark Preview" style={{ width: `${watermarkSize / 4}px` }} className="opacity-30" />
                </div>
              )}
            </div>

            <Button className="w-full bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => toast.success('Identidade visual salva!')}>
              <Save className="mr-2 h-4 w-4" /> Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#B22222]" />
                Configuração de Hierarquia
              </CardTitle>
              <CardDescription>Defina o nível de operação e a estrutura organizacional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modo do Sistema</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={systemMode === 'matriz' ? 'default' : 'outline'} 
                    className={systemMode === 'matriz' ? 'bg-[#B22222]' : ''}
                    onClick={() => setSettings({ ...safeSettings, systemMode: 'matriz' } as AppSettings)}
                  >
                    <Building2 className="mr-2 h-4 w-4" /> Matriz (Sede)
                  </Button>
                  <Button 
                    variant={systemMode === 'local' ? 'default' : 'outline'}
                    className={systemMode === 'local' ? 'bg-[#B22222]' : ''}
                    onClick={() => setSettings({ ...safeSettings, systemMode: 'local' } as AppSettings)}
                  >
                    <MapPin className="mr-2 h-4 w-4" /> Local (Unidade)
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nome da Matriz (Grupamento)</Label>
                  <Input 
                    value={hierarchy.matrizName} 
                    onChange={(e) => setSettings({ ...safeSettings, hierarchy: { ...hierarchy, matrizName: e.target.value } } as AppSettings)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Subunidade (SGB)</Label>
                  <Input 
                    value={hierarchy.subunitName} 
                    onChange={(e) => setSettings({ ...safeSettings, hierarchy: { ...hierarchy, subunitName: e.target.value } } as AppSettings)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Posto / Seção</Label>
                  <Input 
                    value={hierarchy.postName} 
                    onChange={(e) => setSettings({ ...safeSettings, hierarchy: { ...hierarchy, postName: e.target.value } } as AppSettings)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gsUrl" className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#B22222]" />
                    URL do Banco de Dados (Google Sheets)
                  </Label>
                  <Input 
                    id="gsUrl" 
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={googleSheetsUrl}
                    onChange={(e) => setSettings({ ...safeSettings, googleSheetsUrl: e.target.value } as AppSettings)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Insira a URL do Web App gerada no Google Apps Script para habilitar a sincronização em nuvem.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-[#B22222] text-[#B22222] hover:bg-[#B22222]/10"
                  onClick={handleSyncNow}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Agora
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Sincronização de Dados</Label>
                <div className="flex gap-2">
                  {systemMode === 'local' ? (
                    <Button variant="outline" className="w-full" onClick={handleExport}>
                      <Download className="mr-2 h-4 w-4" /> Exportar para Matriz
                    </Button>
                  ) : (
                    <div className="w-full">
                      <Label htmlFor="import-file" className="w-full">
                        <div className="flex items-center justify-center w-full h-10 px-4 border rounded-md cursor-pointer hover:bg-gray-50 border-dashed border-gray-400">
                          <Upload className="mr-2 h-4 w-4" /> Importar de Unidade Local
                        </div>
                      </Label>
                      <input id="import-file" type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </div>
                  )}
                </div>
              </div>

              {currentUser.role === 'super' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle size={18} />
                      <Label className="font-bold">Zona de Perigo</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Estas ações são irreversíveis. Use com cautela durante a implantação do sistema.
                    </p>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => setIsResetDialogOpen(true)}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Limpar Sistema (Reset Total)
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <AlertTriangle size={24} />
              <DialogTitle>Confirmar Reset Total</DialogTitle>
            </div>
            <DialogDescription>
              Esta ação irá apagar permanentemente todos os materiais, viaturas (exceto Reserva Central), empréstimos e logs do sistema.
              <br /><br />
              <strong>Deseja prosseguir com a limpeza para implantação?</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setMaterials([]);
                setLocations([
                  { id: 'reserva-central', name: 'Reserva Central', type: 'reserva', status: 'ativo', materials: [] }
                ]);
                setLoans([]);
                setLogs([]);
                setIsResetDialogOpen(false);
                toast.success('Sistema reiniciado com sucesso!');
                // We don't call addLog here because we just cleared the logs
              }}
            >
              Sim, Limpar Tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
