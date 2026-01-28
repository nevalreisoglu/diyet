-- Add meal_type column to custom_foods table
ALTER TABLE public.custom_foods 
ADD COLUMN meal_type text;