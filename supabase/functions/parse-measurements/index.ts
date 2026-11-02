import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const NUMERIC_FIELDS = [
  'weightKg', 'bodyFatPct', 'muscleMassKg', 'bmi', 'visceralFatLevel', 'bodyWaterPct',
  'boneMassKg', 'bmrKcal', 'waistCm', 'hipCm', 'chestCm', 'armCm', 'thighCm',
] as const;

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

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
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error('Authentication failed:', authError?.message);
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = authData.user.id;

    const { fileBase64, mimeType, text } = await req.json();
    const hasFile = typeof fileBase64 === 'string' && fileBase64.length > 0 && typeof mimeType === 'string';
    const hasText = typeof text === 'string' && text.trim().length > 0;
    if (!hasFile && !hasText) {
      return json({ error: 'Dosya içeriği gerekli' }, 400);
    }
    if (hasFile && !/^(application\/pdf|image\/(jpeg|png|webp|gif))$/.test(mimeType)) {
      return json({ error: 'Desteklenmeyen dosya türü' }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const today = new Date().toISOString().split('T')[0];
    const sourceDescription = hasFile
      ? (mimeType === 'application/pdf' ? 'Bu PDF dosyasındaki' : 'Bu görseldeki')
      : 'Aşağıdaki metindeki';
    const contentPart = hasFile
      ? { inlineData: { mimeType, data: fileBase64 } }
      : { text: `--- RAPOR ---\n${text.slice(0, 60000)}\n--- RAPOR SONU ---` };

    const prompt = `Sen bir beslenme ve vücut kompozisyonu uzmanısın. ${sourceDescription} vücut ölçüm sonuçlarını (InBody / Tanita gibi vücut analiz cihazı çıktısı, akıllı tartı raporu, diyetisyen ölçüm formu veya mezura ölçümleri) çıkar.

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{
  "measuredAt": "YYYY-MM-DD veya null",
  "weightKg": sayı veya null,
  "bodyFatPct": sayı veya null,
  "muscleMassKg": sayı veya null,
  "bmi": sayı veya null,
  "visceralFatLevel": sayı veya null,
  "bodyWaterPct": sayı veya null,
  "boneMassKg": sayı veya null,
  "bmrKcal": sayı veya null,
  "waistCm": sayı veya null,
  "hipCm": sayı veya null,
  "chestCm": sayı veya null,
  "armCm": sayı veya null,
  "thighCm": sayı veya null,
  "extra": [{"label": "Türkçe ölçüm adı", "value": sayı, "unit": "birim"}],
  "notes": "Sonuçların 1-2 cümlelik Türkçe özeti"
}

Kurallar:
- Ölçüm tarihi raporda varsa measuredAt alanına yaz; yoksa null bırak (bugün: ${today})
- muscleMassKg için iskelet kas kütlesi (SMM) varsa onu, yoksa toplam kas kütlesini kullan
- Yüzde değerlerini yüzde olarak (ör. 24.5), ağırlıkları kg, çevreleri cm, BMR'yi kcal olarak ver
- Standart alanlara uymayan diğer ölçümleri (segmental analiz, faz açısı, protein, mineral vb.) extra listesine koy
- Virgüllü sayıları noktaya çevir (72,4 -> 72.4)
- Raporda hiç ölçüm yoksa tüm sayısal alanları null, extra'yı boş bırak`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: prompt }, contentPart] }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      const userMessage = aiResponse.status === 429
        ? 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.'
        : aiResponse.status === 401 || aiResponse.status === 403
        ? 'API anahtarı geçersiz. Lütfen GEMINI_API_KEY kontrol edin.'
        : 'AI servisi geçici hata döndürdü. Lütfen tekrar deneyin.';
      return json({ error: userMessage });
    }

    const aiData = await aiResponse.json();
    const candidate = aiData.candidates?.[0];
    const content = candidate?.content?.parts?.find((p: any) => p.text && !p.thought)?.text || '{}';
    console.log('AI response:', content);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?/, '').replace(/```$/, '').trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return json({ error: 'Ölçüm sonuçları okunamadı. Daha net bir dosya deneyin.' });
    }

    const values: Record<string, number | null> = {};
    for (const key of NUMERIC_FIELDS) values[key] = toNumber(parsed[key]);
    const extra = Array.isArray(parsed.extra) ? parsed.extra : [];
    const hasAnyValue = Object.values(values).some((v) => v !== null) || extra.length > 0;
    if (!hasAnyValue) {
      return json({ error: 'Dosyada vücut ölçümü bulunamadı.' });
    }

    const measuredAt = typeof parsed.measuredAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.measuredAt)
      ? parsed.measuredAt
      : today;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const row = {
      user_id: userId,
      measured_at: measuredAt,
      source: 'upload',
      weight_kg: values.weightKg,
      body_fat_pct: values.bodyFatPct,
      muscle_mass_kg: values.muscleMassKg,
      bmi: values.bmi,
      visceral_fat_level: values.visceralFatLevel,
      body_water_pct: values.bodyWaterPct,
      bone_mass_kg: values.boneMassKg,
      bmr_kcal: values.bmrKcal === null ? null : Math.round(values.bmrKcal),
      waist_cm: values.waistCm,
      hip_cm: values.hipCm,
      chest_cm: values.chestCm,
      arm_cm: values.armCm,
      thigh_cm: values.thighCm,
      notes: typeof parsed.notes === 'string' ? parsed.notes : null,
      raw: { ...values, extra },
    };

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('body_measurements')
      .upsert(row, { onConflict: 'user_id,measured_at' })
      .select()
      .single();
    if (saveError) {
      console.error('Database save error:', saveError);
      throw new Error('Ölçüm kaydedilemedi');
    }

    // Profildeki kiloyu yalnızca bu ölçüm en günceliyse güncelle
    if (values.weightKg !== null) {
      const { data: newest } = await supabaseAdmin
        .from('body_measurements')
        .select('measured_at')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!newest || newest.measured_at <= measuredAt) {
        await supabaseAdmin
          .from('profiles')
          .update({ current_weight_kg: values.weightKg })
          .eq('user_id', userId);
      }
    }

    console.log(`Saved body measurement for user ${userId} dated ${measuredAt}`);
    return json({ success: true, measurement: saved });
  } catch (error) {
    console.error('Error in parse-measurements function:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
