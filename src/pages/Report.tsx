import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function Report() {
  const { user, credits, refreshCredits } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    if (!user) return;
    if (credits < 2) {
      toast.error('Créditos insuficientes! São necessários 2 créditos.');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-report', {
        body: {},
      });

      if (error) {
        if (error.message?.includes('402') || data?.error?.includes('Créditos')) {
          toast.error('Créditos insuficientes! São necessários 2 créditos.');
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
      setReport(data.report);
      await refreshCredits();
      toast.success('Relatório gerado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary" /> Relatório Final
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Sua análise completa de evolução</p>
      </div>

      {!report ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="glass-card">
            <CardContent className="p-8 text-center space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-display font-bold">Gerar Relatório de Evolução</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Análise completa com antes vs depois, padrões identificados, evolução e recomendações personalizadas.
              </p>
              <Button
                onClick={generateReport}
                disabled={generating}
                className="gradient-orange text-primary-foreground"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando relatório...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Gerar Relatório (2 créditos)</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-1" /> Salvar PDF
            </Button>
          </div>

          {Object.entries(report).map(([key, value], i) => (
            <Card key={key} className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-primary mb-2 capitalize">{key.replace(/_/g, ' ')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{String(value)}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
