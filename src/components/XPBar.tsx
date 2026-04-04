import { motion } from 'framer-motion';
import { getXpProgress, getLevelName } from '@/hooks/useGameification';

interface XPBarProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export function XPBar({ xp, level, compact = false }: XPBarProps) {
  const progress = getXpProgress(xp, level);
  const levelName = getLevelName(level);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {level}
        </div>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary font-display">
            {level}
          </div>
          <div>
            <p className="text-sm font-bold font-display">{levelName}</p>
            <p className="text-xs text-muted-foreground">Nível {level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{xp} XP</p>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full gradient-orange rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
