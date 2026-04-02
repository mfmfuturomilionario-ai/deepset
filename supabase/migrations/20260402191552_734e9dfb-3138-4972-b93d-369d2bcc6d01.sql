
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.llm_scope AS ENUM ('global', 'user');
CREATE TYPE public.credit_transaction_type AS ENUM ('add', 'deduct');

-- ============================================================
-- Table: user_roles (FIRST - needed by is_admin function)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: is_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- Table: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- Table: credits
-- ============================================================
CREATE TABLE public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.credits FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own credits" ON public.credits FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "System can insert credits" ON public.credits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- Table: credit_transactions
-- ============================================================
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type credit_transaction_type NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "System can insert transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- Table: diagnostic_responses
-- ============================================================
CREATE TABLE public.diagnostic_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostic_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses" ON public.diagnostic_responses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own responses" ON public.diagnostic_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own responses" ON public.diagnostic_responses FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can delete own responses" ON public.diagnostic_responses FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- Table: diagnostic_results
-- ============================================================
CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.diagnostic_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own results" ON public.diagnostic_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can delete own results" ON public.diagnostic_results FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- Table: protocol_days
-- ============================================================
CREATE TABLE public.protocol_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL UNIQUE CHECK (day_number >= 1 AND day_number <= 21),
  title TEXT NOT NULL,
  action TEXT NOT NULL,
  challenge TEXT NOT NULL,
  reflection TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view protocol days" ON public.protocol_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert protocol days" ON public.protocol_days FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update protocol days" ON public.protocol_days FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete protocol days" ON public.protocol_days FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- Table: user_progress
-- ============================================================
CREATE TABLE public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 21),
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_number)
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- Table: llm_settings
-- ============================================================
CREATE TABLE public.llm_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope llm_scope NOT NULL DEFAULT 'global',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View global and own LLM settings" ON public.llm_settings FOR SELECT TO authenticated USING (scope = 'global' OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert LLM settings" ON public.llm_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR (scope = 'user' AND user_id = auth.uid()));
CREATE POLICY "Admins can update LLM settings" ON public.llm_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR (scope = 'user' AND user_id = auth.uid()));
CREATE POLICY "Admins can delete LLM settings" ON public.llm_settings FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- Table: api_keys
-- ============================================================
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API keys" ON public.api_keys FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert API keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update API keys" ON public.api_keys FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete API keys" ON public.api_keys FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_diagnostic_responses_updated_at BEFORE UPDATE ON public.diagnostic_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_llm_settings_updated_at BEFORE UPDATE ON public.llm_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Auto-create profile, role, credits on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 10);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Credit functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer, _description text DEFAULT 'AI usage')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance FROM public.credits WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < _amount THEN RETURN false; END IF;
  UPDATE public.credits SET balance = balance - _amount WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, type, description) VALUES (_user_id, _amount, 'deduct', _description);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Admin credit')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credits SET balance = balance + _amount WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, type, description) VALUES (_user_id, _amount, 'add', _description);
END;
$$;

-- ============================================================
-- Seed Protocol 21 Days
-- ============================================================
INSERT INTO public.protocol_days (day_number, title, action, challenge, reflection) VALUES
(1, 'Despertar da Consciência', 'Escreva 3 coisas que você tolera na sua vida e não deveria.', 'Elimine uma dessas tolerâncias hoje.', 'O que você está aceitando que está abaixo do seu padrão?'),
(2, 'Clareza de Visão', 'Defina com detalhes onde você quer estar em 90 dias.', 'Visualize por 5 minutos esse cenário como se já fosse real.', 'Sua visão atual é clara o suficiente para guiar suas decisões?'),
(3, 'Identidade Forte', 'Escreva quem você precisa se tornar para alcançar seus objetivos.', 'Aja como essa pessoa por pelo menos 2 horas hoje.', 'Quais comportamentos da sua versão atual precisam morrer?'),
(4, 'Eliminação de Ruído', 'Liste 5 distrações que roubam seu tempo diariamente.', 'Elimine ou reduza drasticamente pelo menos 2 delas hoje.', 'O que você faz por hábito que não te leva a lugar nenhum?'),
(5, 'Rotina de Poder', 'Crie uma rotina matinal de 30 minutos focada em performance.', 'Execute essa rotina amanhã pela primeira vez.', 'Como você começa seu dia determina como você vive sua vida.'),
(6, 'Confronto com o Medo', 'Identifique seu maior medo atual relacionado ao crescimento.', 'Faça uma ação pequena que confronte diretamente esse medo.', 'O que aconteceria se esse medo se realizasse? Você sobreviveria?'),
(7, 'Compromisso Inabalável', 'Faça uma promessa escrita para si mesmo sobre este protocolo.', 'Compartilhe esse compromisso com alguém de confiança.', 'Qual a diferença entre querer e estar comprometido?'),
(8, 'Energia Física', 'Avalie sua alimentação, sono e exercício dos últimos 7 dias.', 'Melhore um desses pilares drasticamente hoje.', 'Seu corpo está sendo tratado como o veículo da sua ambição?'),
(9, 'Círculo de Influência', 'Liste as 5 pessoas com quem mais convive.', 'Identifique quem eleva e quem puxa você para baixo.', 'Você é a média das pessoas ao seu redor. Essa média te orgulha?'),
(10, 'Execução Implacável', 'Escolha a tarefa mais importante e faça-a primeiro.', 'Complete 3 tarefas de alto impacto antes do meio-dia.', 'Quantas vezes você procrastina o que realmente importa?'),
(11, 'Feedback Brutal', 'Peça feedback honesto para 3 pessoas sobre seus pontos fracos.', 'Aceite sem defender e anote os padrões.', 'Você está aberto à verdade ou prefere viver na ilusão?'),
(12, 'Resiliência Mental', 'Relembre uma situação difícil que você superou.', 'Use essa memória como combustível para o desafio de hoje.', 'Suas cicatrizes são provas de que você é mais forte do que imagina.'),
(13, 'Foco Absoluto', 'Trabalhe em blocos de 90 minutos com zero distrações.', 'Faça pelo menos 2 blocos de deep work hoje.', 'O multitasking é a ilusão de produtividade. Você está caindo nela?'),
(14, 'Revisão de Meio Caminho', 'Revise seu progresso nos últimos 13 dias.', 'Ajuste o que não está funcionando e dobre o que está.', 'Você está mais perto da pessoa que definiu no Dia 3?'),
(15, 'Gratidão Estratégica', 'Liste 10 coisas pelas quais você é genuinamente grato.', 'Expresse gratidão para alguém que impactou sua jornada.', 'A gratidão te mantém forte quando as circunstâncias tentam te derrubar.'),
(16, 'Desconforto Proposital', 'Faça algo que te tira completamente da zona de conforto.', 'O desconforto de hoje é o crescimento de amanhã.', 'Quando foi a última vez que você fez algo pela primeira vez?'),
(17, 'Sistemas vs Metas', 'Crie um sistema diário que garanta progresso independente de motivação.', 'Implemente esse sistema hoje e teste.', 'Pessoas de alta performance não dependem de motivação. Elas dependem de sistemas.'),
(18, 'Legado', 'Escreva como você quer ser lembrado daqui 10 anos.', 'Faça uma ação hoje que esteja alinhada com esse legado.', 'Suas ações de hoje estão construindo o legado que você deseja?'),
(19, 'Mentalidade de Abundância', 'Identifique 3 crenças limitantes sobre dinheiro, sucesso ou merecimento.', 'Reescreva cada uma como uma crença fortalecedora.', 'Suas crenças são os limites invisíveis da sua realidade.'),
(20, 'Accountability Total', 'Assuma 100% de responsabilidade por tudo na sua vida.', 'Identifique algo que você culpava outros e assuma a responsabilidade.', 'Quando você para de culpar, você começa a construir.'),
(21, 'Alta Performance Ativada', 'Escreva sua declaração de identidade de alta performance.', 'Leia em voz alta e comprometa-se com essa versão de você mesmo.', 'Este não é o fim. É o começo da sua nova realidade.');

-- Insert default global LLM setting
INSERT INTO public.llm_settings (scope, provider, model, is_active) VALUES ('global', 'lovable', 'google/gemini-3-flash-preview', true);
