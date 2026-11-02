import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PAYMENTS_ENABLED } from '@/config/features';

const LS_KEY = 'diyet_premium';

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  customer_portal_url: string | null;
}

export function useSubscription(userId?: string) {
  // localStorage fast-path: premium kullanıcılar DB cevabını beklemeden içeriği görür
  const [isPremiumLocal]   = useState(() => localStorage.getItem(LS_KEY) === 'true');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(PAYMENTS_ENABLED && !!userId);

  useEffect(() => {
    if (!PAYMENTS_ENABLED || !userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSub = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, customer_portal_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled) {
        setSubscription(data as Subscription | null);
        setLoading(false);
      }
    };

    fetchSub();

    // Webhook sonrası DB değiştiğinde Realtime ile anında güncelle
    const channel = supabase
      .channel(`subscription:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
        (payload) => setSubscription(payload.new as Subscription)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // DB doğrulamasından gelen gerçek premium durumu
  const isPremiumDB =
    subscription?.plan === 'premium' &&
    subscription?.status === 'active' &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  // Yüklenirken localStorage'a güven, sonra DB'yi kullan
  const isPremium = !PAYMENTS_ENABLED || (loading ? isPremiumLocal : isPremiumDB);

  // DB cevabı gelince localStorage'ı senkronize et (yanlış değer kalmasın)
  useEffect(() => {
    if (PAYMENTS_ENABLED && !loading) {
      if (isPremiumDB) {
        localStorage.setItem(LS_KEY, 'true');
      } else {
        localStorage.removeItem(LS_KEY);
      }
    }
  }, [isPremiumDB, loading]);

  // LemonSqueezy checkout URL'i al → yönlendir
  const createCheckout = useCallback(async (): Promise<string> => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın');
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    if (error || !data?.url) throw new Error(error?.message || 'Checkout URL alınamadı');
    return data.url as string;
  }, []);

  // Ödeme sonrası LemonSqueezy'den aboneliği çekip DB'yi güncelle
  const syncSubscription = useCallback(async (): Promise<void> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    await supabase.functions.invoke('sync-subscription', {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
  }, []);

  return { isPremium, loading, subscription, createCheckout, syncSubscription };
}
