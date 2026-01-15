-- Create a table to store meal schedule/times from PDF
CREATE TABLE public.meal_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_type TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, meal_type)
);

-- Enable RLS
ALTER TABLE public.meal_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own meal schedules" 
ON public.meal_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal schedules" 
ON public.meal_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal schedules" 
ON public.meal_schedules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal schedules" 
ON public.meal_schedules 
FOR DELETE 
USING (auth.uid() = user_id);