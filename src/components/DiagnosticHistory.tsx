import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Eye, Star, Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface DiagnosticRecord {
  id: string;
  created_at: string;
  life_area: string | null;
  analysis: any;
  generated_protocol: any;
  rating: number | null;
  questions_asked: any;
}

interface Props {
  userId: string;
  isAdmin?: boolean;
  userName?: string;
}

export function DiagnosticHistory({ userId, isAdmin, userName }: Props) {
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [resultsRes, responsesRes] = await Promise.all([
        supabase.from('diagnostic_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('diagnostic_responses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      setRecords((resultsRes.data || []) as DiagnosticRecord[]);
      setResponses(responsesRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (records.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum diagnóstico realizado.</p>;

  const areaLabels: Record<string, string> = {
    business: '💼 Negócios', finance: '💰 Finanças', relationships: '❤️ Relacionamentos',
    health: '🏋️ Saúde', spirituality: '🧘 Espiritualidade', positioning: '🎯 Posicionamento',
    sales: '📈 Vendas', habits: '⚡ Hábitos', mental_performance: '🧠 Performance Mental',
    leadership: '👑 Liderança', career: '🚀 Carreira', creativity: '🎨 Criatividade',
    general: '🎯 Geral',
  };

  return (
    <div className="space-y-3">
      {isAdmin && userName && <p className="text-sm font-medium text-muted-foreground">Diagnósticos de {userName}</p>}
      {records.map(record => {
        const resp = responses.find(r => r.life_area === record.life_area);
        const isExpanded = expandedId === record.id;
        return (
          <Card key={record.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : record.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{areaLabels[record.life_area || 'general']?.split(' ')[0] || '🎯'}</span>
                  <div>
                    <p className="font-display font-bold text-sm">{areaLabels[record.life_area || 'general'] || record.life_area}</p>
                    <p className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.rating !== null && (
                    <Badge variant={record.rating >= 7 ? 'default' : 'secondary'} className="text-xs">
                      <Star className="w-3 h-3 mr-1" />{record.rating}/10
                    </Badge>
                  )}
                  {record.generated_protocol && <Badge variant="outline" className="text-xs">21 dias</Badge>}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {/* Questions & Answers */}
                  {record.questions_asked && resp?.responses && (
                    <div>
                      <h4 className="text-sm font-display font-bold mb-2 flex items-center gap-1"><Brain className="w-4 h-4 text-primary" /> Perguntas & Respostas</h4>
                      <div className="space-y-3">
                        {(record.questions_asked as any[]).map((q: any, i: number) => (
                          <div key={i} className="bg-secondary rounded-lg p-3">
                            <p className="text-xs font-bold text-primary">{q.title || `Pergunta ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
                            <p className="text-sm mt-2">{(resp.responses as any)?.[q.key] || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {record.analysis && (
                    <div>
                      <h4 className="text-sm font-display font-bold mb-2">📋 Diagnóstico</h4>
                      {Object.entries(record.analysis as Record<string, string>).map(([key, value]) => (
                        <div key={key} className="mb-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm mt-1">{typeof value === 'string' ? value.substring(0, 300) + (value.length > 300 ? '...' : '') : JSON.stringify(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Protocol preview */}
                  {record.generated_protocol && Array.isArray(record.generated_protocol) && (
                    <div>
                      <h4 className="text-sm font-display font-bold mb-2">📅 Protocolo ({(record.generated_protocol as any[]).length} dias)</h4>
                      <div className="grid grid-cols-3 gap-1">
                        {(record.generated_protocol as any[]).slice(0, 6).map((d: any) => (
                          <div key={d.day} className="bg-secondary rounded p-2 text-center">
                            <p className="text-xs font-bold">Dia {d.day}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{d.title}</p>
                          </div>
                        ))}
                      </div>
                      {(record.generated_protocol as any[]).length > 6 && <p className="text-xs text-muted-foreground mt-1">+{(record.generated_protocol as any[]).length - 6} dias...</p>}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
