import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Brain, ChevronRight, ChevronLeft, Loader2, Sparkles, History } from 'lucide-react';
import { DiagnosticRating } from '@/components/DiagnosticRating';
import { DiagnosticHistory } from '@/components/DiagnosticHistory';

interface LifeArea {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

interface DynamicQuestion {
  key: string;
  title: string;
  question: string;
  placeholder: string;
}

type Step = 'area' | 'subgoals' | 'loading_questions' | 'questions' | 'generating' | 'rating' | 'history';

export default function Diagnostic() {
  const { user, credits, refreshCredits } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('area');
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [subGoals, setSubGoals] = useState('');
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lastResultId, setLastResultId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('life_areas').select('*').order('sort_order').then(({ data }) => {
      if (data) setAreas(data as LifeArea[]);
    });
  }, []);

  const handleSelectArea = (area: LifeArea) => {
    setSelectedArea(area);
    setStep('subgoals');
  };

  const handleGenerateQuestions = async () => {
    if (!selectedArea) return;
    setStep('loading_questions');
    try {
      const { data, error } = await supabase.functions.invoke('ai-diagnostic', {
        body: { mode: 'generate_questions', life_area: selectedArea.key, sub_goals: subGoals },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuestions(data.questions || []);
      setCurrentQ(0);
      setAnswers({});
      setStep('questions');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar perguntas');
      setStep('subgoals');
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedArea) return;
    if (credits < 1) { toast.error('Créditos insuficientes!'); return; }
    setStep('generating');
    setLoading(true);
    try {
      // Save responses
      await supabase.from('diagnostic_responses').upsert({
        user_id: user.id,
        responses: answers,
        life_area: selectedArea.key,
      }, { onConflict: 'user_id' });

      // Call AI
      const { data, error } = await supabase.functions.invoke('ai-diagnostic', {
        body: { mode: 'diagnose', responses: answers, life_area: selectedArea.key, sub_goals: subGoals },
      });

      if (error) {
        if (error.message?.includes('402')) { toast.error('Créditos insuficientes!'); setStep('questions'); return; }
        if (error.message?.includes('429')) { toast.error('Limite de requisições.'); setStep('questions'); return; }
        throw error;
      }
      if (data?.error) { toast.error(data.error); setStep('questions'); return; }

      // Save results with generated protocol AND questions
      const { data: inserted } = await supabase.from('diagnostic_results').insert({
        user_id: user.id,
        analysis: data.analysis,
        life_area: selectedArea.key,
        generated_protocol: data.generated_protocol,
        questions_asked: questions as any,
      }).select('id').single();

      if (inserted) setLastResultId(inserted.id);

      await refreshCredits();
      toast.success('Diagnóstico e protocolo gerados com sucesso!');
      setStep('rating');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar diagnóstico');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!lastResultId) { navigate('/map'); return; }
    try {
      await supabase.from('diagnostic_results').update({ rating } as any).eq('id', lastResultId);
      toast.success('Avaliação salva! Obrigado pelo feedback.');
    } catch {
      toast.error('Erro ao salvar avaliação');
    }
    navigate('/map');
  };

  const qProgress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;
  const canProceed = questions[currentQ] ? (answers[questions[currentQ].key] || '').trim().length > 10 : false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" /> Diagnóstico DeepSet 360
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'area' && 'Escolha a área da sua vida que quer transformar'}
            {step === 'subgoals' && `Área: ${selectedArea?.icon} ${selectedArea?.name}`}
            {step === 'loading_questions' && 'Gerando perguntas personalizadas com IA...'}
            {step === 'questions' && `${selectedArea?.icon} ${selectedArea?.name} — Pergunta ${currentQ + 1}/${questions.length}`}
            {step === 'generating' && 'Gerando diagnóstico + protocolo personalizado...'}
            {step === 'rating' && 'Avalie a precisão do seu diagnóstico'}
            {step === 'history' && 'Histórico de diagnósticos'}
          </p>
        </div>
        {step === 'area' && user && (
          <Button variant="secondary" size="sm" onClick={() => setStep('history')}>
            <History className="w-4 h-4 mr-1" /> Histórico
          </Button>
        )}
        {step === 'history' && (
          <Button variant="secondary" size="sm" onClick={() => setStep('area')}>
            <Brain className="w-4 h-4 mr-1" /> Novo
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* History */}
        {step === 'history' && user && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <DiagnosticHistory userId={user.id} />
          </motion.div>
        )}

        {/* Area Selection */}
        {step === 'area' && (
          <motion.div key="area" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {areas.map(area => (
                <button key={area.id} onClick={() => handleSelectArea(area)} className="glass-card p-4 text-left hover:border-primary/50 transition-all group">
                  <span className="text-3xl block mb-2">{area.icon}</span>
                  <p className="font-display font-bold text-sm group-hover:text-primary transition-colors">{area.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{area.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sub-goals */}
        {step === 'subgoals' && (
          <motion.div key="subgoals" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="glass-card">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-display font-bold">{selectedArea?.icon} {selectedArea?.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedArea?.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Qual é sua meta principal nesta área?</label>
                  <Textarea value={subGoals} onChange={e => setSubGoals(e.target.value)} placeholder="Ex: Faturar 10K/mês, sair das dívidas, melhorar comunicação..." className="min-h-[100px] resize-none" />
                </div>
                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => { setStep('area'); setSelectedArea(null); }}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <Button onClick={handleGenerateQuestions} disabled={subGoals.trim().length < 5}>
                    <Sparkles className="w-4 h-4 mr-1" /> Gerar Perguntas com IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading questions */}
        {step === 'loading_questions' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full gradient-orange flex items-center justify-center animate-pulse">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">A IA está criando perguntas personalizadas<br />para a área <span className="text-primary font-bold">{selectedArea?.name}</span>...</p>
          </motion.div>
        )}

        {/* Questions */}
        {step === 'questions' && questions[currentQ] && (
          <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pergunta {currentQ + 1} de {questions.length}</span>
                <span>{Math.round(qProgress)}%</span>
              </div>
              <Progress value={qProgress} className="h-2" />
            </div>
            <Card className="glass-card">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-display font-bold">{questions[currentQ].title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{questions[currentQ].question}</p>
                </div>
                <Textarea value={answers[questions[currentQ].key] || ''} onChange={e => setAnswers(prev => ({ ...prev, [questions[currentQ].key]: e.target.value }))} placeholder={questions[currentQ].placeholder} className="min-h-[150px] resize-none" />
                <p className="text-xs text-muted-foreground">Mínimo 10 caracteres</p>
              </CardContent>
            </Card>
            <div className="flex justify-between mt-4">
              <Button variant="secondary" onClick={() => currentQ === 0 ? setStep('subgoals') : setCurrentQ(c => c - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {currentQ === 0 ? 'Voltar' : 'Anterior'}
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ(c => c + 1)} disabled={!canProceed}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button>
              ) : (
                <Button onClick={handleGenerate} disabled={!canProceed || loading} className="gradient-orange text-primary-foreground">
                  <Brain className="w-4 h-4 mr-2" /> Gerar Diagnóstico (1 crédito)
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Generating */}
        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground text-center">Gerando diagnóstico em 4 camadas + protocolo<br />personalizado de 21 dias para <span className="text-primary font-bold">{selectedArea?.name}</span>...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar até 30 segundos</p>
          </motion.div>
        )}

        {/* Rating */}
        {step === 'rating' && (
          <motion.div key="rating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <DiagnosticRating onRate={handleRate} />
            <div className="text-center mt-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/map')} className="text-muted-foreground">
                Pular avaliação →
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
