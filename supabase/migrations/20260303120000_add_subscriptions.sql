-- Abonelik durumu (kullanıcı başına 1 kayıt, upsert ile güncellenir)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan & durum
  plan                  text        NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
  status                text        NOT NULL DEFAULT 'inactive', -- 'active' | 'cancelled' | 'expired' | 'inactive'

  -- Dönem
  current_period_end    timestamptz,
  cancelled_at          timestamptz,

  -- LemonSqueezy referansları
  ls_subscription_id    text,
  ls_customer_id        text,
  ls_variant_id         text,
  customer_portal_url   text,        -- abonelik yönetim linki (LemonSqueezy'den gelir)

  created_at            timestamptz  DEFAULT now(),
  updated_at            timestamptz  DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Ödeme geçmişi / audit trail
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  event_type          text        NOT NULL,   -- 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'subscription_expired'
  amount_cents        integer,
  currency            text        DEFAULT 'USD',

  ls_event_id         text,
  ls_subscription_id  text,
  metadata            jsonb,

  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own payment logs"
  ON public.payment_logs FOR SELECT
  USING (auth.uid() = user_id);
