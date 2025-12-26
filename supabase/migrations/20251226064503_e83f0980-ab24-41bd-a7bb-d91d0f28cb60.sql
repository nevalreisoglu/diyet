-- Create beverage intake table for coffee/tea tracking
CREATE TABLE public.beverage_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  beverage_type TEXT NOT NULL CHECK (beverage_type IN ('coffee', 'tea')),
  cups INTEGER NOT NULL DEFAULT 1,
  intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise log table
CREATE TABLE public.exercise_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  exercise_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.beverage_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_log ENABLE ROW LEVEL SECURITY;

-- Beverage intake policies
CREATE POLICY "Users can view their own beverage intake" ON public.beverage_intake FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own beverage intake" ON public.beverage_intake FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own beverage intake" ON public.beverage_intake FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own beverage intake" ON public.beverage_intake FOR DELETE USING (auth.uid() = user_id);

-- Exercise log policies
CREATE POLICY "Users can view their own exercise log" ON public.exercise_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exercise log" ON public.exercise_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise log" ON public.exercise_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise log" ON public.exercise_log FOR DELETE USING (auth.uid() = user_id);

-- Update default target_calories to 1500
ALTER TABLE public.profiles ALTER COLUMN target_calories SET DEFAULT 1500;