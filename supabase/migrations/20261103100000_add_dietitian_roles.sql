-- Roller
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'dietitian'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'dietitian' THEN 'dietitian' ELSE 'client' END
  );
  RETURN NEW;
END;
$$;

-- Diyetisyen - danışan bağlantısı
CREATE TABLE public.dietitian_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dietitian_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dietitian_id, client_id)
);
ALTER TABLE public.dietitian_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties can view their link" ON public.dietitian_clients FOR SELECT
USING (auth.uid() = dietitian_id OR auth.uid() = client_id);
CREATE POLICY "Parties can remove their link" ON public.dietitian_clients FOR DELETE
USING (auth.uid() = dietitian_id OR auth.uid() = client_id);

CREATE TABLE public.dietitian_invites (
  dietitian_id UUID NOT NULL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.dietitian_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dietitians can view their invite" ON public.dietitian_invites FOR SELECT
USING (auth.uid() = dietitian_id);

CREATE OR REPLACE FUNCTION public.is_dietitian_of(p_client UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dietitian_clients
    WHERE dietitian_id = auth.uid() AND client_id = p_client AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.create_dietitian_invite()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();
  IF v_role IS DISTINCT FROM 'dietitian' THEN RAISE EXCEPTION 'Sadece diyetisyenler davet kodu oluşturabilir'; END IF;
  SELECT code INTO v_code FROM public.dietitian_invites WHERE dietitian_id = auth.uid();
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.dietitian_invites WHERE code = v_code);
  END LOOP;
  INSERT INTO public.dietitian_invites (dietitian_id, code) VALUES (auth.uid(), v_code);
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_dietitian(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_dietitian UUID;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;
  SELECT dietitian_id INTO v_dietitian FROM public.dietitian_invites WHERE code = upper(trim(p_code));
  IF v_dietitian IS NULL THEN RAISE EXCEPTION 'Davet kodu bulunamadı'; END IF;
  IF v_dietitian = auth.uid() THEN RAISE EXCEPTION 'Kendi davet kodunuzu kullanamazsınız'; END IF;
  INSERT INTO public.dietitian_clients (dietitian_id, client_id)
  VALUES (v_dietitian, auth.uid())
  ON CONFLICT (dietitian_id, client_id) DO UPDATE SET status = 'active';
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = v_dietitian;
  RETURN json_build_object('dietitian_id', v_dietitian, 'display_name', v_name);
END;
$$;

-- Gün gün planlar
CREATE TABLE public.plan_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  dietitian_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, plan_date)
);
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client or dietitian can view plan days" ON public.plan_days FOR SELECT
USING (auth.uid() = client_id OR public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can create plan days" ON public.plan_days FOR INSERT
WITH CHECK (auth.uid() = dietitian_id AND public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can update plan days" ON public.plan_days FOR UPDATE
USING (public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can delete plan days" ON public.plan_days FOR DELETE
USING (public.is_dietitian_of(client_id));
CREATE INDEX idx_plan_days_client_date ON public.plan_days (client_id, plan_date);

CREATE TABLE public.plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_day_id UUID NOT NULL REFERENCES public.plan_days (id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client or dietitian can view plan items" ON public.plan_items FOR SELECT
USING (auth.uid() = client_id OR public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can create plan items" ON public.plan_items FOR INSERT
WITH CHECK (public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can update plan items" ON public.plan_items FOR UPDATE
USING (public.is_dietitian_of(client_id));
CREATE POLICY "Dietitian can delete plan items" ON public.plan_items FOR DELETE
USING (public.is_dietitian_of(client_id));
CREATE INDEX idx_plan_items_day ON public.plan_items (plan_day_id);

-- Diyetisyenin danışan verisine erişimi
CREATE POLICY "Dietitians can view client profiles" ON public.profiles FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Clients can view their dietitian profile" ON public.profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dietitian_clients dc
  WHERE dc.client_id = auth.uid() AND dc.dietitian_id = profiles.user_id AND dc.status = 'active'
));
CREATE POLICY "Dietitians can view client meals" ON public.meals FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client food items" ON public.food_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND public.is_dietitian_of(m.user_id)));
CREATE POLICY "Dietitians can view client water" ON public.water_intake FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client exercise" ON public.exercise_log FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client beverages" ON public.beverage_intake FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client achievements" ON public.achievements FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client custom foods" ON public.custom_foods FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client summaries" ON public.daily_summaries FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can view client measurements" ON public.body_measurements FOR SELECT
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can add client measurements" ON public.body_measurements FOR INSERT
WITH CHECK (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can update client measurements" ON public.body_measurements FOR UPDATE
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can delete client measurements" ON public.body_measurements FOR DELETE
USING (public.is_dietitian_of(user_id));
CREATE POLICY "Dietitians can update client weight" ON public.profiles FOR UPDATE
USING (public.is_dietitian_of(user_id));
