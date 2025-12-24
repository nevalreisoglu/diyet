-- Create water_intake table for tracking daily water consumption
CREATE TABLE public.water_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own water intake"
ON public.water_intake
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water intake"
ON public.water_intake
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water intake"
ON public.water_intake
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water intake"
ON public.water_intake
FOR DELETE
USING (auth.uid() = user_id);

-- Add target water intake to profiles
ALTER TABLE public.profiles ADD COLUMN target_water_ml INTEGER DEFAULT 2000;