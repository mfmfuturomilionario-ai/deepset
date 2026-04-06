
-- Add rating column to diagnostic_results
ALTER TABLE public.diagnostic_results ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT NULL;
ALTER TABLE public.diagnostic_results ADD COLUMN IF NOT EXISTS questions_asked JSONB DEFAULT NULL;

-- Allow users to update own results (for rating)
CREATE POLICY "Users can update own results" ON public.diagnostic_results FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
