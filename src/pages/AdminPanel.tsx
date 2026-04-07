import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, Coins, Brain, Plus, Minus, Search, Key, Settings, BarChart3, BookOpen } from 'lucide-react';
import { AdminAnalytics } from '@/components/AdminAnalytics';
import { KnowledgeManager } from '@/components/KnowledgeManager';

const LLM_PROVIDERS = [
  { value: 'lovable', label: 'Global' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'groq', label: 'Groq' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'perplexity', label: 'Perplexity' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [llmSettings, setLlmSettings] = useState<any[]>([]);
  const [creditAmount, setCreditAmount] = useState('10');
  const [newApiKey, setNewApiKey] = useState({ provider: '', api_key: '', model: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [profilesRes, creditsRes, rolesRes, apiKeysRes, llmRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('credits').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('api_keys').select('*'),
      supabase.from('llm_settings').select('*'),
    ]);

    const profiles = profilesRes.data || [];
    const credits = creditsRes.data || [];
    const roles = rolesRes.data || [];

    const merged = profiles.map(p => ({
      ...p,
      balance: credits.find(c => c.user_id === p.user_id)?.balance ?? 0,
      role: roles.find(r => r.user_id === p.user_id)?.role ?? 'user',
    }));

    setUsers(merged);
    setApiKeys(apiKeysRes.data || []);
    setLlmSettings(llmRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id?.includes(search)
  );

  const handleAddCredits = async (userId: string, amount: number) => {
    const { error } = await supabase.rpc('add_credits', { _user_id: userId, _amount: amount, _description: 'Admin: créditos adicionados' });
    if (error) { toast.error('Erro ao adicionar créditos'); return; }
    toast.success(`${amount} créditos adicionados!`);
    fetchData();
  };

  const handleRemoveCredits = async (userId: string, amount: number) => {
    const { data, error } = await supabase.rpc('deduct_credits', { _user_id: userId, _amount: amount, _description: 'Admin: créditos removidos' });
    if (error || data === false) { toast.error('Erro ao remover créditos'); return; }
    toast.success(`${amount} créditos removidos!`);
    fetchData();
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    await supabase.from('profiles').update({ is_active: !isActive }).eq('user_id', userId);
    toast.success(isActive ? 'Usuário desativado' : 'Usuário ativado');
    fetchData();
  };

  const handleSaveApiKey = async () => {
    if (!newApiKey.provider || !newApiKey.api_key) { toast.error('Preencha provedor e API Key'); return; }
    
    // Save API key
    const { error: keyError } = await supabase.from('api_keys').upsert(
      { provider: newApiKey.provider, api_key: newApiKey.api_key, is_active: true },
      { onConflict: 'provider' }
    );
    if (keyError) { toast.error('Erro ao salvar API Key'); return; }

    // Auto-set as global LLM if model specified
    if (newApiKey.model) {
      const existing = llmSettings.find(s => s.scope === 'global');
      if (existing) {
        await supabase.from('llm_settings').update({ 
          provider: newApiKey.provider, 
          model: newApiKey.model, 
          is_active: true 
        }).eq('id', existing.id);
      } else {
        await supabase.from('llm_settings').insert({ 
          scope: 'global' as any, 
          provider: newApiKey.provider, 
          model: newApiKey.model, 
          is_active: true 
        });
      }
    }

    toast.success('API Key salva com sucesso!');
    setNewApiKey({ provider: '', api_key: '', model: '' });
    fetchData();
  };

  const handleTestApiKey = async (provider: string) => {
    toast.info('Testando conexão...');
    try {
      const { data, error } = await supabase.functions.invoke('ai-diagnostic', {
        body: { mode: 'generate_questions', life_area: 'general', sub_goals: 'teste de conexão' },
      });
      if (error) throw error;
      if (data?.questions?.length > 0) {
        toast.success(`✅ Conexão com ${provider} funcionando!`);
      } else {
        toast.warning('Resposta recebida mas sem perguntas geradas');
      }
    } catch (err: any) {
      toast.error(`❌ Erro: ${err.message}`);
    }
  };

  const handleSetGlobalLLM = async (provider: string) => {
    const existing = llmSettings.find(s => s.scope === 'global');
    const defaultModel = provider === 'lovable' ? 'google/gemini-3-flash-preview' : 'default';
    if (existing) {
      await supabase.from('llm_settings').update({ provider, model: defaultModel, is_active: true }).eq('id', existing.id);
    } else {
      await supabase.from('llm_settings').insert({ scope: 'global' as any, provider, model: defaultModel, is_active: true });
    }
    toast.success('LLM global atualizado!');
    fetchData();
  };

  const handleSetUserLLM = async (userId: string, provider: string) => {
    const existing = llmSettings.find(s => s.scope === 'user' && s.user_id === userId);
    if (existing) {
      await supabase.from('llm_settings').update({ provider }).eq('id', existing.id);
    } else {
      await supabase.from('llm_settings').insert({ scope: 'user' as any, user_id: userId, provider, model: 'default', is_active: true });
    }
    toast.success('LLM do usuário atualizado!');
    fetchData();
  };

  const getModelHints = (provider: string) => {
    switch (provider) {
      case 'openai': return ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];
      case 'anthropic': return ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
      case 'google': return ['gemini-2.0-flash', 'gemini-1.5-pro'];
      case 'groq': return ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];
      case 'deepseek': return ['deepseek-chat', 'deepseek-reasoner'];
      case 'perplexity': return ['sonar', 'sonar-pro'];
      default: return [];
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const globalLLM = llmSettings.find(s => s.scope === 'global');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> Super Admin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão completa do sistema DeepSet</p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="bg-secondary flex-wrap">
          <TabsTrigger value="analytics" className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Usuários</TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> Créditos</TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> LLMs</TabsTrigger>
          <TabsTrigger value="keys" className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> API Keys</TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Conhecimento</TabsTrigger>
        </TabsList>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics"><AdminAnalytics /></TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome</TableHead><TableHead>Role</TableHead><TableHead>Créditos</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div><p className="font-medium">{u.full_name || 'Sem nome'}</p><p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}...</p></div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{u.role}</span>
                    </TableCell>
                    <TableCell className="font-bold">{u.balance}</TableCell>
                    <TableCell><Switch checked={u.is_active} onCheckedChange={() => toggleUserActive(u.user_id, u.is_active)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleAddCredits(u.user_id, parseInt(creditAmount) || 10)}><Plus className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveCredits(u.user_id, parseInt(creditAmount) || 10)}><Minus className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CREDITS TAB */}
        <TabsContent value="credits" className="space-y-4">
          <Card className="glass-card"><CardHeader><CardTitle className="text-base font-display">Gerenciar Créditos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Quantidade de créditos por operação</Label><Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} min="1" /></div>
              <p className="text-sm text-muted-foreground">Use os botões + e - na tabela de usuários para adicionar ou remover créditos.</p>
            </CardContent>
          </Card>
          <Card className="glass-card"><CardHeader><CardTitle className="text-base font-display">Resumo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center"><p className="text-2xl font-bold font-display text-primary">{users.reduce((sum, u) => sum + u.balance, 0)}</p><p className="text-sm text-muted-foreground">Total créditos ativos</p></div>
                <div className="text-center"><p className="text-2xl font-bold font-display">{users.length}</p><p className="text-sm text-muted-foreground">Usuários registrados</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM TAB */}
        <TabsContent value="llm" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Settings className="w-4 h-4" /> LLM Padrão Global</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={globalLLM?.provider || 'lovable'} onValueChange={handleSetGlobalLLM}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LLM_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Provedor atual: <span className="text-primary font-bold">{LLM_PROVIDERS.find(p => p.value === (globalLLM?.provider || 'lovable'))?.label}</span>
                {globalLLM?.model && globalLLM.model !== 'default' && <span> — Modelo: {globalLLM.model}</span>}
              </p>
              <p className="text-xs text-muted-foreground">Este provedor será usado por padrão para todos os usuários. Para usar provedores externos, adicione a API Key na aba "API Keys".</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-display">LLM por Usuário (Override)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>LLM Atual</TableHead><TableHead>Alterar</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.map(u => {
                    const userLLM = llmSettings.find(s => s.scope === 'user' && s.user_id === u.user_id);
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>{u.full_name || u.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{userLLM ? LLM_PROVIDERS.find(p => p.value === userLLM.provider)?.label || userLLM.provider : 'Global'}</TableCell>
                        <TableCell>
                          <Select value={userLLM?.provider || ''} onValueChange={v => handleSetUserLLM(u.user_id, v)}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Global" /></SelectTrigger>
                            <SelectContent>{LLM_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API KEYS TAB */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-display">Adicionar API Key</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Provedor</Label>
                <Select value={newApiKey.provider} onValueChange={v => setNewApiKey(prev => ({ ...prev, provider: v, model: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o provedor..." /></SelectTrigger>
                  <SelectContent>{LLM_PROVIDERS.filter(p => p.value !== 'lovable').map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>API Key</Label><Input type="password" value={newApiKey.api_key} onChange={e => setNewApiKey(prev => ({ ...prev, api_key: e.target.value }))} placeholder="sk-..." /></div>
              {newApiKey.provider && (
                <div>
                  <Label>Modelo (opcional)</Label>
                  <Select value={newApiKey.model} onValueChange={v => setNewApiKey(prev => ({ ...prev, model: v }))}>
                    <SelectTrigger><SelectValue placeholder="Modelo padrão do provedor" /></SelectTrigger>
                    <SelectContent>
                      {getModelHints(newApiKey.provider).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleSaveApiKey} className="gradient-orange text-primary-foreground"><Key className="w-4 h-4 mr-2" /> Salvar API Key</Button>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-display">Keys Configuradas</CardTitle></CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma API key configurada. O sistema usa a IA Global (nativa) por padrão.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Provedor</TableHead><TableHead>Key</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {apiKeys.map(k => (
                      <TableRow key={k.id}>
                        <TableCell>{LLM_PROVIDERS.find(p => p.value === k.provider)?.label || k.provider}</TableCell>
                        <TableCell className="font-mono text-xs">****{k.api_key.slice(-4)}</TableCell>
                        <TableCell>
                          <Switch checked={k.is_active} onCheckedChange={async (v) => { await supabase.from('api_keys').update({ is_active: v }).eq('id', k.id); fetchData(); }} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => handleTestApiKey(k.provider)}>Testar</Button>
                            <Button size="sm" variant="destructive" onClick={async () => { await supabase.from('api_keys').delete().eq('id', k.id); toast.success('Key removida'); fetchData(); }}>Remover</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KNOWLEDGE TAB */}
        <TabsContent value="knowledge"><KnowledgeManager /></TabsContent>
      </Tabs>
    </div>
  );
}
