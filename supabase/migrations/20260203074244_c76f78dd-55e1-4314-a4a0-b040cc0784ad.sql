-- Add current_weight and target_weight columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN current_weight_kg numeric NULL,
ADD COLUMN target_weight_kg numeric NULL;