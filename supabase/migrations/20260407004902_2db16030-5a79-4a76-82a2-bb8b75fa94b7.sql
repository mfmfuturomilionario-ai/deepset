
CREATE TABLE public.knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'text',
  source_url text DEFAULT '',
  area text NOT NULL DEFAULT 'general',
  word_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage knowledge base"
ON public.knowledge_base
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active knowledge"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (status = 'active');

CREATE INDEX idx_knowledge_base_area ON public.knowledge_base (area);
CREATE INDEX idx_knowledge_base_status ON public.knowledge_base (status);

CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
