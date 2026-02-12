
-- Kullanıcı tarafından doğrulanmış kalori değerlerini saklayan önbellek tablosu
CREATE TABLE public.calorie_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  food_name_normalized TEXT NOT NULL, -- lowercase, trimmed for matching
  calories INTEGER NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false, -- user manually verified/corrected
  source TEXT NOT NULL DEFAULT 'ai', -- 'ai' or 'user'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, food_name_normalized)
);

-- Enable RLS
ALTER TABLE public.calorie_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calorie cache"
  ON public.calorie_cache FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calorie cache"
  ON public.calorie_cache FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calorie cache"
  ON public.calorie_cache FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calorie cache"
  ON public.calorie_cache FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_calorie_cache_updated_at
  BEFORE UPDATE ON public.calorie_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
