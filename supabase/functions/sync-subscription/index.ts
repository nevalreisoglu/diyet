import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')!;

    // LemonSqueezy'den kullanıcının email'ine göre aboneliklerini çek
    const lsRes = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(user.email!)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/vnd.api+json',
        },
      }
    );

    if (!lsRes.ok) {
      const err = await lsRes.text();
      console.error('LemonSqueezy subscriptions error:', err);
      return new Response(JSON.stringify({ error: 'LemonSqueezy API hatası' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lsData = await lsRes.json();
    const subscriptions = lsData.data ?? [];

    // En son aktif aboneliği bul
    const active = subscriptions.find((s: any) => s.attributes.status === 'active')
      ?? subscriptions[0];

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (!active) {
      // Aktif abonelik yok, free'ye düşür
      await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        plan: 'free',
        status: 'inactive',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ isPremium: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const attrs = active.attributes;
    const isActive = attrs.status === 'active';

    await supabaseAdmin.from('subscriptions').upsert({
      user_id: user.id,
      plan: isActive ? 'premium' : 'free',
      status: attrs.status,
      current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
      ls_subscription_id: active.id,
      ls_customer_id: attrs.customer_id?.toString(),
      ls_variant_id: attrs.variant_id?.toString(),
      customer_portal_url: attrs.urls?.customer_portal ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ isPremium: isActive, status: attrs.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('sync-subscription error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
