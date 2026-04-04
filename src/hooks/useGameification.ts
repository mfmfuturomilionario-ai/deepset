import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserStats {
  xp: number;
  level: number;
  best_streak: number;
  total_days_completed: number;
  current_phase: string;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

const LEVEL_XP = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4800, 6000, 7500, 9500, 12000];

export function getLevelName(level: number): string {
  if (level >= 40) return 'Lenda Suprema';
  if (level >= 30) return 'Mestre DeepSet';
  if (level >= 20) return 'Alta Performance';
  if (level >= 15) return 'Dominador';
  if (level >= 10) return 'Disciplinado';
  if (level >= 5) return 'Focado';
  if (level >= 3) return 'Desperto';
  return 'Iniciante';
}

export function getXpForLevel(level: number): number {
  if (level <= LEVEL_XP.length) return LEVEL_XP[level - 1] || 0;
  return LEVEL_XP[LEVEL_XP.length - 1] + (level - LEVEL_XP.length) * 1500;
}

export function getXpProgress(xp: number, level: number): number {
  const current = getXpForLevel(level);
  const next = getXpForLevel(level + 1);
  return Math.min(100, Math.round(((xp - current) / (next - current)) * 100));
}

export function useGameification() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, best_streak: 0, total_days_completed: 0, current_phase: 'deepset_original' });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [statsRes, achRes, userAchRes] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('achievements').select('*'),
      supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id),
    ]);

    if (statsRes.data) {
      setStats(statsRes.data as unknown as UserStats);
    } else if (!statsRes.error) {
      // Create stats if missing
      await supabase.from('user_stats').insert({ user_id: user.id });
    }
    if (achRes.data) setAchievements(achRes.data as unknown as Achievement[]);
    if (userAchRes.data) setUserAchievements(userAchRes.data as unknown as UserAchievement[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addXP = useCallback(async (amount: number) => {
    if (!user) return;
    const newXP = stats.xp + amount;
    let newLevel = stats.level;
    while (newXP >= getXpForLevel(newLevel + 1)) {
      newLevel++;
    }
    await supabase.from('user_stats').update({ xp: newXP, level: newLevel }).eq('user_id', user.id);
    setStats(prev => ({ ...prev, xp: newXP, level: newLevel }));
  }, [user, stats]);

  const unlockAchievement = useCallback(async (achievementKey: string) => {
    if (!user) return;
    const ach = achievements.find(a => a.key === achievementKey);
    if (!ach) return;
    if (userAchievements.find(ua => ua.achievement_id === ach.id)) return;

    await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id });
    await addXP(ach.xp_reward);
    setUserAchievements(prev => [...prev, { achievement_id: ach.id, unlocked_at: new Date().toISOString() }]);
    return ach;
  }, [user, achievements, userAchievements, addXP]);

  const checkAndUnlockAchievements = useCallback(async (completedDays: number, streak: number) => {
    const unlocked: Achievement[] = [];
    
    for (const ach of achievements) {
      if (userAchievements.find(ua => ua.achievement_id === ach.id)) continue;
      
      let shouldUnlock = false;
      if (ach.condition_type === 'days_completed' && completedDays >= ach.condition_value) shouldUnlock = true;
      if (ach.condition_type === 'streak' && streak >= ach.condition_value) shouldUnlock = true;
      if (ach.condition_type === 'total_days' && stats.total_days_completed >= ach.condition_value) shouldUnlock = true;
      if (ach.condition_type === 'level' && stats.level >= ach.condition_value) shouldUnlock = true;

      if (shouldUnlock) {
        const result = await unlockAchievement(ach.key);
        if (result) unlocked.push(result);
      }
    }

    // Update stats
    if (completedDays > 0 || streak > 0) {
      await supabase.from('user_stats').update({
        total_days_completed: completedDays,
        best_streak: Math.max(stats.best_streak, streak),
      }).eq('user_id', user?.id);
    }

    return unlocked;
  }, [achievements, userAchievements, stats, user, unlockAchievement]);

  return {
    stats,
    achievements,
    userAchievements,
    loading,
    addXP,
    unlockAchievement,
    checkAndUnlockAchievements,
    refreshStats: fetchData,
    xpProgress: getXpProgress(stats.xp, stats.level),
    levelName: getLevelName(stats.level),
  };
}
