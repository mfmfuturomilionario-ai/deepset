import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, Target, Lightbulb } from 'lucide-react';

interface ProtocolDay {
  id: string;
  day_number: number;
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

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('protocol_days').select('*').order('day_number'),
      supabase.from('user_progress').select('day_number, completed, notes, completed_at').eq('user_id', user.id),
    ]).then(([daysRes, progressRes]) => {
      if (daysRes.data) setDays(daysRes.data);
      if (progressRes.data) {
        setProgress(progressRes.data as UserProgress[]);
        const notesMap: Record<number, string> = {};
        progressRes.data.forEach((p: any) => { notesMap[p.day_number] = p.notes || ''; });
        setNotes(notesMap);
      }
      setLoading(false);
    });
  }, [user]);

  const completedCount = progress.filter(p => p.completed).length;
  const progressPercent = Math.round((completedCount / 21) * 100);

  // Find current day (first incomplete)
  const currentDay = (() => {
    for (let i = 1; i <= 21; i++) {
      if (!progress.find(p => p.day_number === i && p.completed)) return i;
    }
    return 21;
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

    if (error) {
      toast.error('Erro ao salvar progresso');
      return;
    }

    setProgress(prev => {
      const filtered = prev.filter(p => p.day_number !== dayNumber);
      return [...filtered, { day_number: dayNumber, completed: true, notes: notes[dayNumber] || '', completed_at: new Date().toISOString() }];
    });
    toast.success(`Dia ${dayNumber} concluído! 🔥`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Calendar className="w-7 h-7 text-primary" /> DeepSet 21 Dias
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Reset → Recalibração → Domínio</p>
      </div>

      {/* Progress bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-bold text-primary">{completedCount}/21 dias ({progressPercent}%)</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex gap-1 mt-3">
            {Array.from({ length: 21 }, (_, i) => {
              const isCompleted = progress.find(p => p.day_number === i + 1)?.completed;
              const isCurrent = i + 1 === currentDay;
              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    isCompleted ? 'bg-primary' : isCurrent ? 'bg-primary/40 animate-pulse-glow' : 'bg-secondary'
                  }`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <div className="space-y-3">
        {days.map(day => {
          const isCompleted = progress.find(p => p.day_number === day.day_number)?.completed;
          const isExpanded = expandedDay === day.day_number;
          const isCurrent = day.day_number === currentDay;
          const isLocked = day.day_number > currentDay && !isCompleted;

          return (
            <motion.div key={day.day_number} layout>
              <Card className={`glass-card transition-all ${isCurrent ? 'border-primary/50 glow-orange' : ''} ${isLocked ? 'opacity-50' : ''}`}>
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedDay(isExpanded ? null : day.day_number)}
                  disabled={isLocked}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">DIA {day.day_number}</span>
                      {isCurrent && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Atual</span>}
                    </div>
                    <p className="font-medium font-display truncate">{day.title}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-primary">AÇÃO PRÁTICA</p>
                              <p className="text-sm text-muted-foreground">{day.action}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Flame className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-warning">MICRO DESAFIO</p>
                              <p className="text-sm text-muted-foreground">{day.challenge}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-blue-400">REFLEXÃO</p>
                              <p className="text-sm text-muted-foreground italic">"{day.reflection}"</p>
                            </div>
                          </div>
                        </div>

                        {!isCompleted && (
                          <div className="space-y-3 pt-2">
                            <Textarea
                              placeholder="Suas anotações sobre este dia..."
                              value={notes[day.day_number] || ''}
                              onChange={e => setNotes(prev => ({ ...prev, [day.day_number]: e.target.value }))}
                              className="min-h-[80px] resize-none"
                            />
                            <Button
                              onClick={() => handleComplete(day.day_number)}
                              className="w-full gradient-orange text-primary-foreground"
                            >
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
