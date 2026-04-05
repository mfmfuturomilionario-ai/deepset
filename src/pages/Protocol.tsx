import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, Target, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtocolDay {
  day: number;
  title: string;
  action: string;
  challenge: string;
  reflection: string;
}

interface UserProgress {
  day_number: number;
  completed: boolean;
  notes: string;
  completed_at: string | null;
}

export default function Protocol() {
  const { user } = useAuth();
  const [days, setDays] = useState<ProtocolDay[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [isGenerated, setIsGenerated] = useState(false);
  const [lifeArea, setLifeArea] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadProtocol = async () => {
      // First check for generated protocol from diagnostic
      const { data: diagResults } = await supabase
        .from('diagnostic_results')
        .select('generated_protocol, life_area')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (diagResults?.generated_protocol && Array.isArray(diagResults.generated_protocol) && diagResults.generated_protocol.length > 0) {
        // Use AI-generated protocol
        const genDays = (diagResults.generated_protocol as any[]).map((d: any) => ({
          day: d.day || d.day_number,
          title: d.title,
          action: d.action,
          challenge: d.challenge,
          reflection: d.reflection,
        }));
        setDays(genDays);
        setIsGenerated(true);
        setLifeArea(diagResults.life_area || '');
      } else {
        // Fallback to fixed protocol_days
        const { data: fixedDays } = await supabase
          .from('protocol_days')
          .select('*')
          .order('day_number');
        if (fixedDays) {
          setDays(fixedDays.map(d => ({
            day: d.day_number,
            title: d.title,
            action: d.action,
            challenge: d.challenge,
            reflection: d.reflection,
          })));
        }
      }

      // Load progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('day_number, completed, notes, completed_at')
        .eq('user_id', user.id);
      if (progressData) {
        setProgress(progressData as UserProgress[]);
        const notesMap: Record<number, string> = {};
        progressData.forEach((p: any) => { notesMap[p.day_number] = p.notes || ''; });
        setNotes(notesMap);
      }
      setLoading(false);
    };

    loadProtocol();
  }, [user]);

  const totalDays = days.length || 21;
  const completedCount = progress.filter(p => p.completed).length;
  const progressPercent = Math.round((completedCount / totalDays) * 100);

  const currentDay = (() => {
    for (let i = 1; i <= totalDays; i++) {
      if (!progress.find(p => p.day_number === i && p.completed)) return i;
    }
    return totalDays;
  })();

  const handleComplete = async (dayNumber: number) => {
    if (!user) return;
    const existing = progress.find(p => p.day_number === dayNumber);
    if (existing?.completed) return;

    const { error } = await supabase.from('user_progress').upsert({
      user_id: user.id,
      day_number: dayNumber,
      completed: true,
      notes: notes[dayNumber] || '',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day_number' });

    if (error) { toast.error('Erro ao salvar progresso'); return; }

    setProgress(prev => {
      const filtered = prev.filter(p => p.day_number !== dayNumber);
      return [...filtered, { day_number: dayNumber, completed: true, notes: notes[dayNumber] || '', completed_at: new Date().toISOString() }];
    });
    toast.success(`Dia ${dayNumber} concluído! 🔥`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Sparkles className="w-12 h-12 text-primary" />
        <p className="text-center text-muted-foreground">
          Nenhum protocolo disponível ainda.<br />
          <Link to="/diagnostic" className="text-primary font-bold hover:underline">Faça seu diagnóstico</Link> para gerar um protocolo personalizado.
        </p>
      </div>
    );
  }

  const getPhaseLabel = (day: number) => {
    if (day <= 7) return { label: 'RESET', color: 'text-red-400' };
    if (day <= 14) return { label: 'RECALIBRAÇÃO', color: 'text-yellow-400' };
    return { label: 'DOMÍNIO', color: 'text-green-400' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Calendar className="w-7 h-7 text-primary" /> DeepSet {totalDays} Dias
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isGenerated ? (
            <><Sparkles className="w-3 h-3 inline mr-1" />Protocolo personalizado por IA{lifeArea ? ` — ${lifeArea}` : ''}</>
          ) : 'Reset → Recalibração → Domínio'}
        </p>
      </div>

      {/* Progress bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-bold text-primary">{completedCount}/{totalDays} dias ({progressPercent}%)</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalDays }, (_, i) => {
              const isCompleted = progress.find(p => p.day_number === i + 1)?.completed;
              const isCurrent = i + 1 === currentDay;
              return (
                <div key={i} className={`h-2 flex-1 rounded-full transition-all ${
                  isCompleted ? 'bg-primary' : isCurrent ? 'bg-primary/40 animate-pulse-glow' : 'bg-secondary'
                }`} />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <div className="space-y-3">
        {days.map(day => {
          const dayNum = day.day;
          const isCompleted = progress.find(p => p.day_number === dayNum)?.completed;
          const isExpanded = expandedDay === dayNum;
          const isCurrent = dayNum === currentDay;
          const isLocked = dayNum > currentDay && !isCompleted;
          const phase = getPhaseLabel(dayNum);

          return (
            <motion.div key={dayNum} layout>
              <Card className={`glass-card transition-all ${isCurrent ? 'border-primary/50 glow-orange' : ''} ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedDay(isExpanded ? null : dayNum)}
                  disabled={isLocked}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">DIA {dayNum}</span>
                      <span className={`text-[10px] font-bold ${phase.color}`}>{phase.label}</span>
                      {isCurrent && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Atual</span>}
                    </div>
                    <p className="font-medium font-display truncate">{day.title}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div><p className="text-xs font-medium text-primary">AÇÃO PRÁTICA</p><p className="text-sm text-muted-foreground">{day.action}</p></div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Flame className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                            <div><p className="text-xs font-medium text-warning">MICRO DESAFIO</p><p className="text-sm text-muted-foreground">{day.challenge}</p></div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div><p className="text-xs font-medium text-blue-400">REFLEXÃO</p><p className="text-sm text-muted-foreground italic">"{day.reflection}"</p></div>
                          </div>
                        </div>

                        {!isCompleted && (
                          <div className="space-y-3 pt-2">
                            <Textarea
                              placeholder="Suas anotações sobre este dia..."
                              value={notes[dayNum] || ''}
                              onChange={e => setNotes(prev => ({ ...prev, [dayNum]: e.target.value }))}
                              className="min-h-[80px] resize-none"
                            />
                            <Button onClick={() => handleComplete(dayNum)} className="w-full gradient-orange text-primary-foreground">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Concluído
                            </Button>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="bg-primary/10 rounded-lg p-3 text-sm text-primary flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Dia concluído!
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
