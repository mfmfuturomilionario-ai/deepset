import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Download, Target, AlertTriangle, Compass, Lightbulb, Shield, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateMapPDF } from '@/lib/pdf-generator';
import { DiagnosticHistory } from '@/components/DiagnosticHistory';

interface Analysis {
  behavioral_analysis?: string;
  pattern?: string;
  main_block?: string;
  future_prediction?: string;
  direction?: string;
}

export default function PersonMap() {
  const { user, profile } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('diagnostic_results').select('analysis').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data) setAnalysis(data.analysis as unknown as Analysis);
        setLoading(false);
      });
  }, [user]);

  const handleDownloadPDF = () => {
    if (!analysis) return;
    generateMapPDF(analysis as unknown as Record<string, string>, profile?.full_name || user?.email || undefined);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!analysis) {
    return (
      <div className="text-center py-16 space-y-4">
        <MapIcon className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-display font-bold">Mapa não disponível</h2>
        <p className="text-muted-foreground">Complete o diagnóstico primeiro para gerar seu mapa.</p>
        <Link to="/diagnostic"><Button className="gradient-orange text-primary-foreground">Fazer Diagnóstico</Button></Link>
      </div>
    );
  }

  const sections = [
    { icon: Compass, title: 'Análise Comportamental', content: analysis.behavioral_analysis, color: 'text-primary' },
    { icon: Shield, title: 'Padrão Identificado', content: analysis.pattern, color: 'text-blue-400' },
    { icon: AlertTriangle, title: 'Bloqueio Principal', content: analysis.main_block, color: 'text-destructive' },
    { icon: Target, title: 'Previsão Futura', content: analysis.future_prediction, color: 'text-warning' },
    { icon: Lightbulb, title: 'Direcionamento', content: analysis.direction, color: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <MapIcon className="w-7 h-7 text-primary" /> Meu Mapa DeepSet
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Diagnóstico em 4 camadas: sintoma, padrão, estrutura e raiz</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-1" /> {showHistory ? 'Mapa' : 'Histórico'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-1" /> PDF Premium
          </Button>
        </div>
      </div>

      {showHistory && user ? (
        <DiagnosticHistory userId={user.id} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="glass-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-base font-display flex items-center gap-2 ${section.color}`}>
                    <section.icon className="w-5 h-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content || 'Informação não disponível'}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
