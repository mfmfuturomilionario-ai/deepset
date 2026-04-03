import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Brain, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

const questions = [
  { key: 'pains', title: 'Suas Dores', desc: 'Quais são as principais dores que você sente hoje na sua vida pessoal e profissional?', placeholder: 'Descreva suas dores mais profundas...' },
  { key: 'frustrations', title: 'Suas Frustrações', desc: 'O que te frustra constantemente? O que você já tentou e não funcionou?', placeholder: 'O que te tira do sério ou te desanima...' },
  { key: 'goals', title: 'Seus Objetivos', desc: 'Onde você quer estar daqui 90 dias? E em 1 ano?', placeholder: 'Descreva seus objetivos com detalhes...' },
  { key: 'identity', title: 'Sua Identidade', desc: 'Como você se descreve hoje? E como gostaria de ser descrito?', placeholder: 'Quem é você hoje vs. quem quer se tornar...' },
  { key: 'fears', title: 'Seus Medos', desc: 'Qual é seu maior medo sobre o futuro? O que te paralisa?', placeholder: 'O que te impede de avançar...' },
];

export default function Diagnostic() {
  const { user, credits, refreshCredits } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  const progress = ((step + 1) / questions.length) * 100;
  const currentQ = questions[step];
  const canProceed = (answers[currentQ.key] || '').trim().length > 10;

  const handleGenerate = async () => {
    if (!user) return;
    if (credits < 1) {
      toast.error('Créditos insuficientes! Contate o administrador.');
      return;
    }

    setGenerating(true);
    try {
      // Save responses
      await supabase.from('diagnostic_responses').upsert({
        user_id: user.id,
        responses: answers,
      }, { onConflict: 'user_id' });

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('ai-diagnostic', {
        body: { responses: answers },
      });

      if (error) {
        // Check for credit/rate limit errors in the response
        if (error.message?.includes('402') || data?.error?.includes('Créditos')) {
          toast.error('Créditos insuficientes! Contate o administrador.');
          return;
        }
        if (error.message?.includes('429')) {
          toast.error('Limite de requisições. Tente novamente em alguns segundos.');
          return;
        }
        throw error;
      }
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Save results
      await supabase.from('diagnostic_results').insert({
        user_id: user.id,
        analysis: data.analysis,
      });

      await refreshCredits();
      toast.success('Diagnóstico gerado com sucesso!');
      navigate('/map');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar diagnóstico');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" /> Diagnóstico DeepSet
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Responda com profundidade. O sistema analisa em 4 camadas: sintoma, padrão, estrutura e raiz.</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pergunta {step + 1} de {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold">{currentQ.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{currentQ.desc}</p>
              </div>
              <Textarea
                value={answers[currentQ.key] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [currentQ.key]: e.target.value }))}
                placeholder={currentQ.placeholder}
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground">Mínimo 10 caracteres</p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>

        {step < questions.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={!canProceed || generating}
            className="gradient-orange text-primary-foreground"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando análise...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Gerar Diagnóstico (1 crédito)</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
