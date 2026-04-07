import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BookOpen, Upload, Link as LinkIcon, FileText, Trash2, Globe, Plus } from 'lucide-react';

const AREA_OPTIONS = [
  { value: 'general', label: '🎯 Geral' },
  { value: 'business', label: '💼 Negócios' },
  { value: 'finance', label: '💰 Finanças' },
  { value: 'relationships', label: '❤️ Relacionamentos' },
  { value: 'health', label: '🏋️ Saúde' },
  { value: 'spirituality', label: '🧘 Espiritualidade' },
  { value: 'positioning', label: '🎯 Posicionamento' },
  { value: 'sales', label: '📈 Vendas' },
  { value: 'habits', label: '⚡ Hábitos' },
  { value: 'mental_performance', label: '🧠 Performance Mental' },
  { value: 'leadership', label: '👑 Liderança' },
  { value: 'career', label: '🚀 Carreira' },
  { value: 'creativity', label: '🎨 Criatividade' },
];

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_url: string;
  area: string;
  word_count: number;
  status: string;
  created_at: string;
}

export function KnowledgeManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form states
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textArea, setTextArea] = useState('general');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkArea, setLinkArea] = useState('general');
  const [pdfArea, setPdfArea] = useState('general');

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });
    setEntries((data || []) as KnowledgeEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) { toast.error('Preencha título e conteúdo'); return; }
    setAdding(true);
    const wordCount = textContent.trim().split(/\s+/).length;
    const { error } = await supabase.from('knowledge_base').insert({
      title: textTitle,
      content: textContent,
      source_type: 'text',
      area: textArea,
      word_count: wordCount,
      status: 'active',
    } as any);
    if (error) { toast.error('Erro ao salvar'); setAdding(false); return; }
    toast.success(`Conhecimento adicionado! (${wordCount} palavras)`);
    setTextTitle(''); setTextContent(''); setTextArea('general');
    setAdding(false);
    fetchEntries();
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) { toast.error('Informe a URL'); return; }
    setAdding(true);
    const { error } = await supabase.from('knowledge_base').insert({
      title: linkTitle || linkUrl,
      content: `Fonte externa: ${linkUrl}`,
      source_type: 'link',
      source_url: linkUrl,
      area: linkArea,
      word_count: 0,
      status: 'active',
    } as any);
    if (error) { toast.error('Erro ao salvar'); setAdding(false); return; }
    toast.success('Link adicionado à base!');
    setLinkUrl(''); setLinkTitle(''); setLinkArea('general');
    setAdding(false);
    fetchEntries();
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast.error('Formato aceito: PDF, TXT ou MD');
      return;
    }
    setAdding(true);

    try {
      let content = '';
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await file.text();
      } else {
        // For PDF, extract what we can from text (basic extraction)
        content = await file.text().catch(() => '');
        if (!content || content.length < 50) {
          content = `[PDF] ${file.name} - ${(file.size / 1024).toFixed(0)}KB. Conteúdo do arquivo PDF carregado para enriquecer a base de conhecimento do DeepSet.`;
        }
      }

      const wordCount = content.split(/\s+/).length;
      const { error } = await supabase.from('knowledge_base').insert({
        title: file.name.replace(/\.(pdf|txt|md)$/i, ''),
        content: content.substring(0, 500000), // limit to ~500K chars
        source_type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
        area: pdfArea,
        word_count: wordCount,
        status: 'active',
      } as any);

      if (error) throw error;
      toast.success(`Arquivo "${file.name}" adicionado! (${wordCount} palavras)`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar arquivo');
    }
    setAdding(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('knowledge_base').delete().eq('id', id);
    toast.success('Entrada removida');
    fetchEntries();
  };

  const totalWords = entries.reduce((sum, e) => sum + e.word_count, 0);
  const activeCount = entries.filter(e => e.status === 'active').length;

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{entries.length}</p>
          <p className="text-xs text-muted-foreground">Total de fontes</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display">{totalWords.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Palavras na base</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Fontes ativas</p>
        </CardContent></Card>
      </div>

      {/* Add Knowledge */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Plus className="w-4 h-4" /> Adicionar Conhecimento</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="space-y-4">
            <TabsList className="bg-secondary">
              <TabsTrigger value="text"><FileText className="w-3.5 h-3.5 mr-1" /> Texto</TabsTrigger>
              <TabsTrigger value="link"><LinkIcon className="w-3.5 h-3.5 mr-1" /> Link</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="w-3.5 h-3.5 mr-1" /> Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3">
              <div><Label>Título</Label><Input value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="Ex: Técnicas de Vendas Avançadas" /></div>
              <div><Label>Área</Label>
                <Select value={textArea} onValueChange={setTextArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AREA_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conteúdo</Label><Textarea value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Cole aqui o conteúdo completo, resumos, transcrições, capítulos de livros..." className="min-h-[200px]" /></div>
              <Button onClick={handleAddText} disabled={adding}><Plus className="w-4 h-4 mr-1" /> Adicionar à Base</Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-3">
              <div><Label>URL</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..." /></div>
              <div><Label>Título (opcional)</Label><Input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Descrição do conteúdo" /></div>
              <div><Label>Área</Label>
                <Select value={linkArea} onValueChange={setLinkArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AREA_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddLink} disabled={adding}><Globe className="w-4 h-4 mr-1" /> Adicionar Link</Button>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <div><Label>Área</Label>
                <Select value={pdfArea} onValueChange={setPdfArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AREA_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arquivo (PDF, TXT ou MD)</Label>
                <Input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={handlePDFUpload} disabled={adding} />
              </div>
              <p className="text-xs text-muted-foreground">O conteúdo do arquivo será extraído e adicionado à base de conhecimento da IA.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Entries List */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><BookOpen className="w-4 h-4" /> Base de Conhecimento ({entries.length})</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum conhecimento adicionado ainda.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Palavras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{entry.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.source_type === 'pdf' ? '📄 PDF' : entry.source_type === 'link' ? '🔗 Link' : '📝 Texto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{AREA_OPTIONS.find(a => a.value === entry.area)?.label || entry.area}</TableCell>
                    <TableCell className="text-xs">{entry.word_count.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'active' ? 'default' : 'secondary'} className="text-xs">{entry.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
