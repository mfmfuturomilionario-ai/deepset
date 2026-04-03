import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Flame, Target, Zap, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const scoreLabels = ['Iniciante', 'Inconsistente', 'Disciplinado', 'Alta Performance'];

function getScoreLabel(completed: number) {
  if (completed >= 18) return { label: scoreLabels[3], level: 4, color: 'text-primary' };
  if (completed >= 12) return { label: scoreLabels[2], level: 3, color: 'text-success' };
  if (completed >= 6) return { label: scoreLabels[1], level: 2, color: 'text-warning' };
  return { label: scoreLabels[0], level: 1, color: 'text-muted-foreground' };
}

function getStreak(progress: { day_number: number; completed: boolean }[]) {
  const completed = progress.filter(p => p.completed).map(p => p.day_number).sort((a, b) => b - a);
  let streak = 0;
  for (let i = 0; i < completed.length; i++) {
    if (i === 0 || completed[i] === completed[i - 1] - 1) streak++;
    else break;
  }
  return streak;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any[]>([]);
  const [hasDiagnostic, setHasDiagnostic] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_progress').select('*').eq('user_id', user.id).order('day_number').then(({ data }) => {
      if (data) setProgress(data);
    });
    supabase.from('diagnostic_results').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      setHasDiagnostic(!!(data && data.length > 0));
    });
  }, [user]);

  const completedDays = progress.filter(p => p.completed).length;
  const totalDays = 21;
  const consistency = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const streak = getStreak(progress);
  const score = getScoreLabel(completedDays);

  const chartData = Array.from({ length: 21 }, (_, i) => ({
    day: i + 1,
    completed: progress.find(p => p.day_number === i + 1)?.completed ? 1 : 0,
    cumulative: progress.filter(p => p.day_number <= i + 1 && p.completed).length,
  }));

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Sua jornada DeepSet de alta performance</p>
      </div>

      {/* Alert if no diagnostic */}
      {!hasDiagnostic && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-primary/30">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Comece pelo Diagnóstico</p>
              <p className="text-sm text-muted-foreground">Complete seu diagnóstico inicial para desbloquear o protocolo personalizado.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPIs */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Target className="w-3.5 h-3.5" /> Consistência
              </div>
              <p className="text-2xl font-bold font-display">{consistency}%</p>
              <Progress value={consistency} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Flame className="w-3.5 h-3.5" /> Streak
              </div>
              <p className="text-2xl font-bold font-display text-primary">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">dias seguidos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Calendar className="w-3.5 h-3.5" /> Execução
              </div>
              <p className="text-2xl font-bold font-display">{completedDays}/{totalDays}</p>
              <p className="text-xs text-muted-foreground mt-1">dias completos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <TrendingUp className="w-3.5 h-3.5" /> Score
              </div>
              <p className={`text-lg font-bold font-display ${score.color}`}>{score.label}</p>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4].map(l => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= score.level ? 'bg-primary' : 'bg-secondary'}`} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Progresso ao longo dos dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'hsl(0, 0%, 7.1%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(24, 100%, 50%)" fill="url(#colorCumulative)" strokeWidth={2} name="Dias completos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Streak alert */}
      {streak === 0 && completedDays > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-destructive/30">
          <p className="text-sm font-medium text-destructive">⚠️ Você está perdendo consistência! Volte ao protocolo hoje.</p>
        </motion.div>
      )}

      {completedDays > 0 && completedDays < 21 && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">🔥 Faltam <span className="text-primary font-bold">{21 - completedDays}</span> dias para completar o protocolo!</p>
        </div>
      )}
    </div>
  );
}
