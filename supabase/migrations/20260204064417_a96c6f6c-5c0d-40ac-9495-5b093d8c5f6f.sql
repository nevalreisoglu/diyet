-- Add target duration in weeks to profiles
ALTER TABLE public.profiles 
ADD COLUMN weight_goal_weeks integer NULL DEFAULT 12;