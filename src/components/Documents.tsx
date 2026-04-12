import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileCode, 
  Plus, 
  Search, 
  ExternalLink,
  Edit2,
  Trash2,
  BookOpen,
  Wrench,
  FileText
} from 'lucide-react';
import { Document } from '../types';
import { toast } from 'sonner';

interface DocumentsProps {
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addLog: (action: string, details: string) => void;
}

export function Documents({ documents = [], setDocuments, addLog }: DocumentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'manual' as any,
    url: ''
  });

  const safeDocuments = Array.isArray(documents) ? documents : [];

  const handleSaveDocument = () => {
    if (!formData.title || !formData.url) {
      toast.error('Preencha o título e a URL.');
      return;
    }

    if (editingDocument) {
      const updated = documents.map(d => d.id === editingDocument.id ? {
        ...d,
        ...formData
      } : d);
      setDocuments(updated);
      addLog('Edição de Documento', `Documento "${formData.title}" foi atualizado.`);
      toast.success('Documento atualizado!');
    } else {
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        uploadDate: new Date().toISOString()
      };
      setDocuments([...documents, newDoc]);
      addLog('Novo Documento', `Documento "${formData.title}" foi adicionado.`);
      toast.success('Documento registrado!');
    }
    
    setIsDialogOpen(false);
    setEditingDocument(null);
    setFormData({ title: '', category: 'manual', url: '' });
  };

  const deleteDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    setDocuments(documents.filter(d => d.id !== id));
    addLog('Exclusão de Documento', `Documento "${doc?.title}" foi removido.`);
    toast.success('Documento removido.');
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'fundamento': return <BookOpen className="text-blue-500" />;
      case 'equipamento': return <Wrench className="text-orange-500" />;
      default: return <FileText className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Documentos</h1>
          <p className="text-muted-foreground">Manuais de fundamentos e equipamentos para consulta.</p>
        </div>
        <Button className="bg-[#B22222] hover:bg-[#B22222]/90" onClick={() => {
          setEditingDocument(null);
          setFormData({ title: '', category: 'manual', url: '' });
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Documento
        </Button>
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#B22222] rounded-lg text-white">
                <FileCode size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{editingDocument ? 'Editar Documento' : 'Registrar Documento'}</h2>
                <p className="text-sm text-muted-foreground">Adicione manuais, especificações técnicas ou procedimentos operacionais.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => {
                setIsDialogOpen(false);
                setEditingDocument(null);
              }}>Cancelar</Button>
              <Button onClick={handleSaveDocument} className="bg-[#B22222] hover:bg-[#B22222]/90" size="lg">
                {editingDocument ? 'Salvar Alterações' : 'Salvar Documento'}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Documento</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título do Documento</Label>
                    <Input id="title" placeholder="Ex: Manual de Salvamento em Altura" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(val: any) => setFormData({...formData, category: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fundamento">Manual de Fundamento</SelectItem>
                        <SelectItem value="equipamento">Manual de Equipamento</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL do Documento (PDF/Link)</Label>
                    <Input id="url" placeholder="https://exemplo.com/manual.pdf" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
                    <p className="text-xs text-muted-foreground">Insira o link direto para o arquivo ou página de consulta.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {safeDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getIcon(doc.category)}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => {
                    setEditingDocument(doc);
                    setFormData({
                      title: doc.title,
                      category: doc.category as any,
                      url: doc.url
                    });
                    setIsDialogOpen(true);
                  }}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteDocument(doc.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
              <CardDescription className="capitalize">{doc.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Acessar Documento
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
