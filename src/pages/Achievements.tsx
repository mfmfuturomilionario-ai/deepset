import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameification } from '@/hooks/useGameification';
import { XPBar } from '@/components/XPBar';
import { Trophy } from 'lucide-react';

export default function Achievements() {
  const { stats, achievements, userAchievements, loading, levelName } = useGameification();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" /> Conquistas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Suas conquistas e evolução no DeepSet</p>
      </div>

      {/* XP Card */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <XPBar xp={stats.xp} level={stats.level} />
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold font-display text-primary">{stats.total_days_completed}</p>
              <p className="text-xs text-muted-foreground">Dias totais</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-display text-primary">{stats.best_streak}</p>
              <p className="text-xs text-muted-foreground">Melhor streak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-display">{unlockedIds.size}/{achievements.length}</p>
              <p className="text-xs text-muted-foreground">Conquistas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {achievements.map((ach, i) => {
          const unlocked = unlockedIds.has(ach.id);
          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`glass-card h-full transition-all ${unlocked ? 'border-primary/30 glow-orange' : 'opacity-50 grayscale'}`}>
                <CardContent className="p-4 text-center">
                  <span className="text-3xl">{ach.icon}</span>
                  <p className="font-display font-bold text-sm mt-2">{ach.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                  <p className="text-xs text-primary mt-2 font-bold">+{ach.xp_reward} XP</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
