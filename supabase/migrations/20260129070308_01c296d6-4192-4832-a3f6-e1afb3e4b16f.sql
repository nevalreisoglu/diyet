-- Create achievements table for tracking user rewards
CREATE TABLE public.achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    achievement_type text NOT NULL,
    earned_at timestamp with time zone NOT NULL DEFAULT now(),
    achievement_date date NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(user_id, achievement_type, achievement_date)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements"
ON public.achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
ON public.achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements"
ON public.achievements
FOR DELETE
USING (auth.uid() = user_id);