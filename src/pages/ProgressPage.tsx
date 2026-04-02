import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';

export default function ProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_progress').select('*').eq('user_id', user.id).order('day_number').then(({ data }) => {
      if (data) setProgress(data);
    });
  }, [user]);

  const completedDays = progress.filter(p => p.completed).length;

  const weeklyData = [
    { week: 'Semana 1', completed: progress.filter(p => p.completed && p.day_number <= 7).length, total: 7 },
    { week: 'Semana 2', completed: progress.filter(p => p.completed && p.day_number > 7 && p.day_number <= 14).length, total: 7 },
    { week: 'Semana 3', completed: progress.filter(p => p.completed && p.day_number > 14).length, total: 7 },
  ];

  const radialData = [
    { name: 'Progresso', value: Math.round((completedDays / 21) * 100), fill: 'hsl(24, 100%, 50%)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-primary" /> Progresso Detalhado
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Visão completa da sua evolução</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Performance por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                    <XAxis dataKey="week" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(0, 0%, 7.1%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="completed" fill="hsl(24, 100%, 50%)" radius={[4, 4, 0, 0]} name="Dias completos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Taxa de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-display font-bold text-primary">{Math.round((completedDays / 21) * 100)}%</div>
                  <p className="text-muted-foreground mt-2">{completedDays} de 21 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Day-by-day breakdown */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Dia a dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 21 }, (_, i) => {
              const dayProgress = progress.find(p => p.day_number === i + 1);
              const isCompleted = dayProgress?.completed;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
