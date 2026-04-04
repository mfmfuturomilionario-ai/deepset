import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Layers, Lock, CheckCircle2, Circle, ChevronDown, ChevronUp, Target, Flame, Lightbulb } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useGameification } from '@/hooks/useGameification';
import { AchievementToast } from '@/components/AchievementToast';

interface Phase {
  id: string;
  key: string;
  sort_order: number;
  name: string;
  description: string;
  days_count: number;
  unlock_condition: string;
  unlock_value: string | null;
  icon: string;
}

interface PhaseDay {
  id: string;
  phase_id: string;
  day_number: number;
  title: string;
  action: string;
  challenge: string;
  reflection: string;
}

interface PhaseProgress {
  phase_id: string;
  day_number: number;
  completed: boolean;
  notes: string;
  completed_at: string | null;
}

export default function Phases() {
  const { user } = useAuth();
  const { addXP, checkAndUnlockAchievements } = useGameification();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [activePhaseKey, setActivePhaseKey] = useState<string | null>(null);
  const [phaseDays, setPhaseDays] = useState<PhaseDay[]>([]);
  const [progress, setProgress] = useState<PhaseProgress[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [achievementToast, setAchievementToast] = useState<any>(null);

  // Also get original protocol progress for unlock checking
  const [originalCompleted, setOriginalCompleted] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('phases').select('*').order('sort_order'),
      supabase.from('user_phase_progress').select('*').eq('user_id', user.id),
      supabase.from('user_progress').select('day_number, completed').eq('user_id', user.id),
    ]).then(([phasesRes, progressRes, origRes]) => {
      if (phasesRes.data) setPhases(phasesRes.data as unknown as Phase[]);
      if (progressRes.data) setProgress(progressRes.data as unknown as PhaseProgress[]);
      if (origRes.data) setOriginalCompleted((origRes.data as any[]).filter(p => p.completed).length);
      setLoading(false);
    });
  }, [user]);

  const loadPhaseDays = async (phaseId: string) => {
    const { data } = await supabase.from('phase_days').select('*').eq('phase_id', phaseId).order('day_number');
    if (data) setPhaseDays(data as unknown as PhaseDay[]);
  };

  const isPhaseUnlocked = (phase: Phase): boolean => {
    if (phase.unlock_condition === 'none') return true;
    if (phase.unlock_condition === 'phase_complete' && phase.unlock_value) {
      if (phase.unlock_value === 'deepset_original') {
        return originalCompleted >= 21;
      }
      const requiredPhase = phases.find(p => p.key === phase.unlock_value);
      if (requiredPhase) {
        const phaseProgress = progress.filter(p => p.phase_id === requiredPhase.id && p.completed);
        return phaseProgress.length >= requiredPhase.days_count;
      }
    }
    return false;
  };

  const getPhaseProgress = (phase: Phase) => {
    if (phase.key === 'deepset_original') return { completed: originalCompleted, total: 21 };
    const phaseProgress = progress.filter(p => p.phase_id === phase.id && p.completed);
    return { completed: phaseProgress.length, total: phase.days_count };
  };

  const handleSelectPhase = (phase: Phase) => {
    if (!isPhaseUnlocked(phase)) return;
    setActivePhaseKey(phase.key);
    setExpandedDay(null);
    if (phase.key !== 'deepset_original') {
      loadPhaseDays(phase.id);
    }
  };

  const handleCompleteDay = async (phaseId: string, dayNumber: number) => {
    if (!user) return;
    const existing = progress.find(p => p.phase_id === phaseId && p.day_number === dayNumber);
    if (existing?.completed) return;

    const noteKey = `${phaseId}_${dayNumber}`;
    await supabase.from('user_phase_progress').upsert({
      user_id: user.id,
      phase_id: phaseId,
      day_number: dayNumber,
      completed: true,
      notes: notes[noteKey] || '',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,phase_id,day_number' });

    setProgress(prev => {
      const filtered = prev.filter(p => !(p.phase_id === phaseId && p.day_number === dayNumber));
      return [...filtered, { phase_id: phaseId, day_number: dayNumber, completed: true, notes: notes[noteKey] || '', completed_at: new Date().toISOString() }];
    });

    await addXP(25);
    toast.success(`Dia ${dayNumber} concluído! +25 XP 🔥`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const activePhase = phases.find(p => p.key === activePhaseKey);

  return (
    <div className="space-y-6">
      <AchievementToast achievement={achievementToast} onDone={() => setAchievementToast(null)} />

      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Layers className="w-7 h-7 text-primary" /> Fases DeepSet
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Evolua além dos 21 dias</p>
      </div>

      {/* Phase selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {phases.map((phase) => {
          const unlocked = isPhaseUnlocked(phase);
          const prog = getPhaseProgress(phase);
          const percent = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
          const isActive = activePhaseKey === phase.key;

          return (
            <motion.div key={phase.id} whileTap={{ scale: unlocked ? 0.97 : 1 }}>
              <Card
                className={`glass-card cursor-pointer transition-all ${isActive ? 'border-primary/50 glow-orange' : ''} ${!unlocked ? 'opacity-40' : ''}`}
                onClick={() => handleSelectPhase(phase)}
              >
                <CardContent className="p-4 text-center">
                  <span className="text-2xl">{unlocked ? phase.icon : '🔒'}</span>
                  <p className="font-display font-bold text-sm mt-2">{phase.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{prog.completed}/{prog.total}</p>
                  <Progress value={percent} className="h-1 mt-2" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Phase details */}
      {activePhase && activePhase.key !== 'deepset_original' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <h2 className="font-display font-bold text-lg">{activePhase.icon} {activePhase.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{activePhase.description}</p>
            </CardContent>
          </Card>

          {phaseDays.map(day => {
            const isCompleted = progress.find(p => p.phase_id === activePhase.id && p.day_number === day.day_number)?.completed;
            const isExpanded = expandedDay === day.day_number;
            const noteKey = `${activePhase.id}_${day.day_number}`;
            const completedBefore = progress.filter(p => p.phase_id === activePhase.id && p.completed && p.day_number < day.day_number).length;
            const currentDay = progress.filter(p => p.phase_id === activePhase.id && p.completed).length + 1;
            const isCurrent = day.day_number === currentDay;
            const isLocked = day.day_number > currentDay && !isCompleted;

            return (
              <Card key={day.id} className={`glass-card transition-all ${isCurrent ? 'border-primary/50 glow-orange' : ''} ${isLocked ? 'opacity-50' : ''}`}>
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
                    <span className="text-xs text-muted-foreground font-mono">DIA {day.day_number}</span>
                    {isCurrent && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">Atual</span>}
                    <p className="font-medium font-display truncate">{day.title}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5" />
                          <div><p className="text-xs font-medium text-primary">AÇÃO</p><p className="text-sm text-muted-foreground">{day.action}</p></div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Flame className="w-4 h-4 text-warning mt-0.5" />
                          <div><p className="text-xs font-medium text-warning">DESAFIO</p><p className="text-sm text-muted-foreground">{day.challenge}</p></div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5" />
                          <div><p className="text-xs font-medium text-blue-400">REFLEXÃO</p><p className="text-sm text-muted-foreground italic">"{day.reflection}"</p></div>
                        </div>
                        {!isCompleted && (
                          <div className="space-y-3 pt-2">
                            <Textarea placeholder="Suas anotações..." value={notes[noteKey] || ''} onChange={e => setNotes(prev => ({ ...prev, [noteKey]: e.target.value }))} className="min-h-[80px] resize-none" />
                            <Button onClick={() => handleCompleteDay(activePhase.id, day.day_number)} className="w-full gradient-orange text-primary-foreground">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir +25 XP
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
            );
          })}
        </motion.div>
      )}

      {activePhaseKey === 'deepset_original' && (
        <Card className="glass-card">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-muted-foreground">O DeepSet Original está na aba "DeepSet 21" no menu lateral.</p>
            <a href="/protocol" className="text-primary underline text-sm font-medium">Ir para DeepSet 21 →</a>
          </CardContent>
        </Card>
      )}

      {!activePhaseKey && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Selecione uma fase acima para começar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
