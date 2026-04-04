import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AchievementData {
  icon: string;
  title: string;
  xp_reward: number;
}

export function AchievementToast({ achievement, onDone }: { achievement: AchievementData | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => { setVisible(false); setTimeout(onDone, 500); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDone]);

  return (
    <AnimatePresence>
      {visible && achievement && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-card border border-primary/50 rounded-2xl px-6 py-4 shadow-2xl glow-orange flex items-center gap-4">
            <span className="text-4xl">{achievement.icon}</span>
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-wider">Conquista Desbloqueada!</p>
              <p className="text-foreground font-display font-bold text-lg">{achievement.title}</p>
              <p className="text-xs text-primary">+{achievement.xp_reward} XP</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
