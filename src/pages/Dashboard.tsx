import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TrendingUp, Flame, Target, Zap, Calendar, Trophy, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { XPBar } from '@/components/XPBar';
import { useGameification } from '@/hooks/useGameification';
import { Link } from 'react-router-dom';

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
  const { stats, userAchievements, achievements, loading: gamLoading } = useGameification();
  const [progress, setProgress] = useState<any[]>([]);
  const [hasDiagnostic, setHasDiagnostic] = useState(false);
  const [diagnosticArea, setDiagnosticArea] = useState('');
  const [hasProtocol, setHasProtocol] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_progress').select('*').eq('user_id', user.id).order('day_number').then(({ data }) => {
      if (data) setProgress(data);
    });
    supabase.from('diagnostic_results').select('id, life_area, generated_protocol').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        setHasDiagnostic(true);
        setDiagnosticArea((data[0] as any).life_area || '');
        setHasProtocol(!!(data[0] as any).generated_protocol);
      }
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

  const recentAchievements = achievements
    .filter(a => userAchievements.find(ua => ua.achievement_id === a.id))
    .slice(0, 4);

  // Smart alerts
  const alerts: { icon: any; text: string; type: 'warning' | 'info' | 'success' }[] = [];
  if (streak === 0 && completedDays > 0) alerts.push({ icon: AlertTriangle, text: 'Sua streak está em risco! Complete o dia de hoje.', type: 'warning' });
  if (completedDays > 0 && completedDays < 21) alerts.push({ icon: Flame, text: `Faltam ${21 - completedDays} dias para completar o DeepSet!`, type: 'info' });
  if (completedDays === 21) alerts.push({ icon: Trophy, text: 'Protocolo completo! Explore as Fases para continuar evoluindo.', type: 'success' });

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Sua jornada DeepSet 360{diagnosticArea ? ` — ${diagnosticArea}` : ''}</p>
      </div>

      {/* XP Bar */}
      {!gamLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card"><CardContent className="p-4"><XPBar xp={stats.xp} level={stats.level} /></CardContent></Card>
        </motion.div>
      )}

      {/* Smart Alerts */}
      {alerts.map((alert, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className={`glass-card p-4 border-l-4 ${alert.type === 'warning' ? 'border-l-destructive' : alert.type === 'success' ? 'border-l-green-500' : 'border-l-primary'}`}
        >
          <div className="flex items-center gap-3">
            <alert.icon className={`w-5 h-5 ${alert.type === 'warning' ? 'text-destructive' : alert.type === 'success' ? 'text-green-500' : 'text-primary'}`} />
            <p className="text-sm">{alert.text}</p>
          </div>
        </motion.div>
      ))}

      {/* CTA if no diagnostic */}
      {!hasDiagnostic && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="glass-card border-primary/30">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-orange flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold">Comece sua jornada DeepSet 360</p>
                <p className="text-sm text-muted-foreground">Escolha uma área da vida e receba um diagnóstico + protocolo 100% personalizado.</p>
              </div>
              <Link to="/diagnostic">
                <Button className="gradient-orange text-primary-foreground"><ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      {hasDiagnostic && (
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base font-display flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Próximos Passos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!hasProtocol && completedDays === 0 && (
                <Link to="/protocol" className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition">
                  <span className="text-primary">1.</span><span className="text-sm">Inicie seu protocolo personalizado</span><ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </Link>
              )}
              {completedDays > 0 && completedDays < 21 && (
                <Link to="/protocol" className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition">
                  <span className="text-primary">→</span><span className="text-sm">Continue o Dia {progress.filter(p => p.completed).length + 1} do protocolo</span><ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </Link>
              )}
              <Link to="/map" className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition">
                <span className="text-primary">🗺️</span><span className="text-sm">Veja seu Mapa da Pessoa</span><ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>
              <Link to="/phases" className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition">
                <span className="text-primary">🚀</span><span className="text-sm">Explore as Fases DeepSet</span><ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Consistência', value: `${consistency}%`, sub: <Progress value={consistency} className="mt-2 h-1.5" /> },
          { icon: Flame, label: 'Streak', value: streak, sub: <p className="text-xs text-muted-foreground mt-1">dias seguidos</p>, valueClass: 'text-primary' },
          { icon: Calendar, label: 'Execução', value: `${completedDays}/${totalDays}`, sub: <p className="text-xs text-muted-foreground mt-1">dias completos</p> },
          { icon: TrendingUp, label: 'Score', value: score.label, valueClass: score.color, sub: <div className="flex gap-1 mt-2">{[1,2,3,4].map(l => <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= score.level ? 'bg-primary' : 'bg-secondary'}`} />)}</div> },
        ].map((kpi, i) => (
          <motion.div key={i} variants={item}>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><kpi.icon className="w-3.5 h-3.5" /> {kpi.label}</div>
              <p className={`text-2xl font-bold font-display ${kpi.valueClass || ''}`}>{kpi.value}</p>
              {kpi.sub}
            </CardContent></Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base font-display flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Conquistas Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentAchievements.map(ach => (
                <div key={ach.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 flex-shrink-0">
                  <span className="text-xl">{ach.icon}</span>
                  <div><p className="text-xs font-bold">{ach.title}</p><p className="text-xs text-primary">+{ach.xp_reward} XP</p></div>
                </div>
              ))}
            </div>
            <Link to="/achievements" className="text-xs text-primary mt-2 block">Ver todas →</Link>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-display">Progresso ao longo dos dias</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(0, 0%, 7.1%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(24, 100%, 50%)" fill="url(#colorCumulative)" strokeWidth={2} name="Dias completos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
