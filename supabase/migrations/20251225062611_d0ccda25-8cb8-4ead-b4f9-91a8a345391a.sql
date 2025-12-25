-- Create a table for user's custom food list from PDF
CREATE TABLE public.custom_foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own custom foods"
ON public.custom_foods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom foods"
ON public.custom_foods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom foods"
ON public.custom_foods
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom foods"
ON public.custom_foods
FOR DELETE
USING (auth.uid() = user_id);