CREATE TABLE public.daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  headline TEXT NOT NULL,
  message TEXT NOT NULL,
  focus TEXT,
  tone TEXT NOT NULL DEFAULT 'nudge',
  inputs JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_date)
);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily summaries"
ON public.daily_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily summaries"
ON public.daily_summaries FOR DELETE
USING (auth.uid() = user_id);
