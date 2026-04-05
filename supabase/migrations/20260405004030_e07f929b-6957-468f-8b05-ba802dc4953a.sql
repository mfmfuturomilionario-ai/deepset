
-- Create life_areas table
CREATE TABLE public.life_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🎯',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.life_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view life areas" ON public.life_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage life areas" ON public.life_areas FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create user_context table
CREATE TABLE public.user_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area TEXT NOT NULL DEFAULT 'general',
  key_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  history_summary TEXT NOT NULL DEFAULT '',
  effectiveness_score FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, area)
);

ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context" ON public.user_context FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Users can insert own context" ON public.user_context FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own context" ON public.user_context FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_user_context_updated_at BEFORE UPDATE ON public.user_context FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create system_patterns table
CREATE TABLE public.system_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL DEFAULT 'general',
  pattern_type TEXT NOT NULL DEFAULT 'behavioral',
  pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size INTEGER NOT NULL DEFAULT 0,
  effectiveness FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view patterns" ON public.system_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage patterns" ON public.system_patterns FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_system_patterns_updated_at BEFORE UPDATE ON public.system_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add life_area and generated_protocol to diagnostic_results
ALTER TABLE public.diagnostic_results ADD COLUMN IF NOT EXISTS life_area TEXT DEFAULT 'general';
ALTER TABLE public.diagnostic_results ADD COLUMN IF NOT EXISTS generated_protocol JSONB DEFAULT NULL;

-- Add life_area to diagnostic_responses
ALTER TABLE public.diagnostic_responses ADD COLUMN IF NOT EXISTS life_area TEXT DEFAULT 'general';

-- Seed life_areas
INSERT INTO public.life_areas (key, name, description, icon, sort_order) VALUES
  ('business', 'Negócios', 'Construa, escale e domine seu negócio. MVP, esteira de produtos, posicionamento e receita.', '💼', 1),
  ('finance', 'Finanças', 'Saia das dívidas, invista com inteligência e construa liberdade financeira.', '💰', 2),
  ('relationships', 'Relacionamentos', 'Melhore suas conexões pessoais, profissionais e afetivas.', '❤️', 3),
  ('health', 'Saúde', 'Otimize corpo, mente e energia. Hábitos de alta performance.', '🏋️', 4),
  ('spirituality', 'Espiritualidade', 'Propósito, paz interior e conexão com algo maior.', '🧘', 5),
  ('positioning', 'Posicionamento', 'Autoridade, marca pessoal e presença digital estratégica.', '🎯', 6),
  ('sales', 'Vendas', 'Prospecção, conversão, scripts e processos comerciais.', '📈', 7),
  ('habits', 'Hábitos', 'Rotinas, disciplina e sistemas de execução consistente.', '⚡', 8),
  ('mental_performance', 'Performance Mental', 'Foco, clareza, produtividade e gestão emocional.', '🧠', 9),
  ('leadership', 'Liderança', 'Gestão de pessoas, influência e tomada de decisão.', '👑', 10),
  ('career', 'Carreira', 'Transição, crescimento e posicionamento profissional.', '🚀', 11),
  ('creativity', 'Criatividade', 'Desbloqueie ideias, crie conteúdo e inove em qualquer área.', '🎨', 12);
