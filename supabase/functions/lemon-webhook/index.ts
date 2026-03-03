import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// LemonSqueezy imzasını HMAC-SHA256 ile doğrula
async function verifySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('X-Signature');
    const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!;

    if (!await verifySignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventName = payload.meta?.event_name as string;
    const userId    = payload.meta?.custom_data?.user_id as string | undefined;
    const attrs     = payload.data?.attributes ?? {};

    if (!userId) {
      // Bazı olaylar (ör. order_created) custom_data içermeyebilir, sessizce geç
      console.warn('No user_id in webhook payload, event:', eventName);
      return new Response('OK', { status: 200 });
    }

    // Service role ile DB'ye yaz (RLS bypass)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const lsSubscriptionId  = payload.data?.id as string | undefined;
    const lsCustomerId      = attrs.customer_id?.toString();
    const lsVariantId       = attrs.variant_id?.toString();
    const customerPortalUrl = attrs.urls?.customer_portal ?? null;

    // Her event'i logla
    await supabase.from('payment_logs').insert({
      user_id:           userId,
      event_type:        eventName,
      amount_cents:      attrs.total != null ? Math.round(Number(attrs.total) * 100) : null,
      currency:          attrs.currency ?? 'USD',
      ls_event_id:       payload.meta?.webhook_id,
      ls_subscription_id: lsSubscriptionId,
      metadata:          payload,
    });

    // Abonelik tablosunu güncelle
    switch (eventName) {

      case 'subscription_created':
      case 'subscription_updated': {
        const isActive = attrs.status === 'active';
        await supabase.from('subscriptions').upsert({
          user_id:             userId,
          plan:                isActive ? 'premium' : 'free',
          status:              attrs.status ?? 'inactive',
          current_period_end:  attrs.renews_at ?? attrs.ends_at ?? null,
          ls_subscription_id:  lsSubscriptionId,
          ls_customer_id:      lsCustomerId,
          ls_variant_id:       lsVariantId,
          customer_portal_url: customerPortalUrl,
          updated_at:          new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      case 'subscription_cancelled': {
        await supabase.from('subscriptions').upsert({
          user_id:      userId,
          plan:         'free',
          status:       'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      case 'subscription_expired': {
        await supabase.from('subscriptions').upsert({
          user_id:    userId,
          plan:       'free',
          status:     'expired',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      default:
        console.log('Unhandled event:', eventName);
    }

    return new Response('OK', { status: 200 });

  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Internal error', { status: 500 });
  }
});
