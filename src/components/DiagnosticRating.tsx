import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface DiagnosticRatingProps {
  onRate: (rating: number) => void;
  loading?: boolean;
}

export function DiagnosticRating({ onRate, loading }: DiagnosticRatingProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovering, setHovering] = useState<number | null>(null);

  const display = hovering ?? selected;

  return (
    <Card className="glass-card border-primary/30">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="font-display font-bold text-lg">Avalie a Assertividade</h3>
          <p className="text-sm text-muted-foreground mt-1">
            De 0 a 10, o quanto este diagnóstico foi preciso e cirúrgico para você?
          </p>
        </div>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setHovering(i)}
              onMouseLeave={() => setHovering(null)}
              className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                display !== null && i <= display
                  ? i >= 8 ? 'bg-green-500/80 text-white' : i >= 5 ? 'bg-primary/80 text-primary-foreground' : 'bg-destructive/80 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {i}
            </motion.button>
          ))}
        </div>
        {selected !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <p className="text-sm">
              {selected >= 9 ? '🔥 Excelente! O DeepSet acertou em cheio.' :
               selected >= 7 ? '✅ Bom! O sistema está no caminho certo.' :
               selected >= 5 ? '⚡ Razoável. Vamos melhorar na próxima.' :
               selected >= 3 ? '⚠️ Precisa melhorar. Seu feedback nos ajuda.' :
               '🎯 Obrigado pelo feedback honesto. Vamos calibrar.'}
            </p>
            <Button onClick={() => onRate(selected)} disabled={loading} className="gradient-orange text-primary-foreground">
              <Star className="w-4 h-4 mr-2" /> Enviar Avaliação ({selected}/10)
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
