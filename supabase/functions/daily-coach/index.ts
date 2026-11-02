import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TONES = ['celebrate', 'nudge', 'warn'] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authData?.user) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = authData.user.id;

    const { stats } = await req.json();
    if (!stats || typeof stats !== 'object') {
      return json({ error: 'İstatistik verisi gerekli' }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const today = new Date().toISOString().split('T')[0];
    const hour = typeof stats.localHour === 'number' ? stats.localHour : new Date().getHours();
    const dayPhase = hour < 11 ? 'sabah' : hour < 15 ? 'öğlen' : hour < 19 ? 'ikindi' : 'akşam';

    const adherenceText = stats.adherence && stats.adherence.planned > 0
      ? `- Diyet listesine uyum: ${stats.adherence.done}/${stats.adherence.planned} (%${stats.adherence.pct})${stats.adherence.missedMeals?.length ? `; henüz hiç dokunulmayan öğünler: ${stats.adherence.missedMeals.join(', ')}` : ''}`
      : '- Diyet listesi yüklenmemiş (uyum hesaplanamıyor)';

    const measurementText = stats.measurement
      ? `- Son ölçüm (${stats.measurement.measuredAt}): ${[
          stats.measurement.weightKg != null && `${stats.measurement.weightKg} kg${stats.measurement.weightDelta != null ? ` (${stats.measurement.weightDelta > 0 ? '+' : ''}${stats.measurement.weightDelta} kg)` : ''}`,
          stats.measurement.bodyFatPct != null && `%${stats.measurement.bodyFatPct} yağ${stats.measurement.bodyFatDelta != null ? ` (${stats.measurement.bodyFatDelta > 0 ? '+' : ''}${stats.measurement.bodyFatDelta})` : ''}`,
        ].filter(Boolean).join(', ')}`
      : '';

    const prompt = `Sen samimi, kısa konuşan bir beslenme koçusun. Türkçe yaz, kullanıcıya "sen" diye hitap et. Günün şu anki durumunu değerlendir; saat ${hour}:00 (${dayPhase}), bu yüzden günün henüz bitmediğini hesaba kat.

Bugünün verileri:
- Kalori: ${stats.calories} / ${stats.targetCalories} kcal
- Su: ${stats.waterMl} / ${stats.targetWaterMl} ml
- Egzersiz: ${stats.exerciseMinutes} dk
- Kahve: ${stats.coffee} fincan, çay: ${stats.tea} fincan
- Kayıtlı öğün sayısı: ${stats.mealsLogged}
${adherenceText}
${measurementText}
${stats.achievements?.length ? `- Bugün kazanılan rozetler: ${stats.achievements.join(', ')}` : ''}

Yanıtını SADECE şu JSON formatında ver:
{
  "headline": "en fazla 6 kelimelik başlık",
  "message": "2-3 kısa cümle: bugün iyi giden bir şey + dikkat edilmesi gereken bir şey, somut sayılarla",
  "focus": "günün kalanı için TEK somut, yapılabilir öneri (1 cümle)",
  "tone": "celebrate | nudge | warn"
}

Kurallar:
- Genel laflar yerine verideki sayılara dayan
- Suçlayıcı olma; eksikleri fırsat gibi sun
- Sabahsa güne başlangıç önerisi, akşamsa günün değerlendirmesi yap
- Kalori hedefin çok üstündeyse veya hiç kayıt yoksa tone "warn", hedefler büyük ölçüde tutmuşsa "celebrate", aksi halde "nudge"`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      const userMessage = aiResponse.status === 429
        ? 'Günlük AI kotası doldu ya da çok sık istek gönderildi. Biraz sonra tekrar deneyin.'
        : aiResponse.status === 401 || aiResponse.status === 403
        ? 'API anahtarı geçersiz. Lütfen GEMINI_API_KEY kontrol edin.'
        : 'AI servisi geçici hata döndürdü. Lütfen tekrar deneyin.';
      return json({ error: userMessage });
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought)?.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?/, '').replace(/```$/, '').trim());
    } catch (e) {
      console.error('Failed to parse AI response:', e, content);
      return json({ error: 'Koç yanıtı okunamadı, tekrar deneyin.' });
    }

    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim() : '';
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    if (!headline || !message) {
      return json({ error: 'Koç yanıtı eksik geldi, tekrar deneyin.' });
    }
    const focus = typeof parsed.focus === 'string' ? parsed.focus.trim() : null;
    const tone = TONES.includes(parsed.tone) ? parsed.tone : 'nudge';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: saved, error: saveError } = await supabaseAdmin
      .from('daily_summaries')
      .upsert(
        { user_id: userId, summary_date: today, headline, message, focus, tone, inputs: stats, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,summary_date' }
      )
      .select()
      .single();
    if (saveError) {
      console.error('Database save error:', saveError);
      throw new Error('Özet kaydedilemedi');
    }

    return json({ success: true, summary: saved });
  } catch (error) {
    console.error('Error in daily-coach function:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
