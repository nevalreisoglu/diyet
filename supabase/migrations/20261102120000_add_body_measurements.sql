CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'upload',
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  bmi NUMERIC,
  visceral_fat_level NUMERIC,
  body_water_pct NUMERIC,
  bone_mass_kg NUMERIC,
  bmr_kcal INTEGER,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  chest_cm NUMERIC,
  arm_cm NUMERIC,
  thigh_cm NUMERIC,
  notes TEXT,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_at)
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body measurements"
ON public.body_measurements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body measurements"
ON public.body_measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body measurements"
ON public.body_measurements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body measurements"
ON public.body_measurements FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_body_measurements_user_date
ON public.body_measurements (user_id, measured_at DESC);
