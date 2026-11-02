import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MEAL_TYPES = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];
const MAX_ITEMS = 60;

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const cleanItem = (raw: any) => {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    name,
    mealType: MEAL_TYPES.includes(raw?.mealType) ? raw.mealType : null,
    calories: Math.max(0, Math.round(toNumber(raw?.calories) ?? 0)),
    protein: toNumber(raw?.protein),
    carbs: toNumber(raw?.carbs),
    fat: toNumber(raw?.fat),
  };
};

const RULES = `Kurallar:
- Her yiyecek için porsiyonu adın sonunda parantez içinde Türkçe koru (örn. "Haşlanmış yumurta (2 adet)")
- Belirtilen porsiyona göre toplam kalori (kcal) ve protein/karbonhidrat/yağ gramlarını tahmin et; porsiyon yoksa standart bir porsiyon varsay
- Sayıları sayı olarak ver, birim yazma; virgül yerine nokta kullan`;

async function callGemini(apiKey: string, prompt: string): Promise<any> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { responseMimeType: 'application/json' },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('AI API error:', res.status, errorText);
    const message = res.status === 429
      ? 'Günlük AI kotası doldu ya da çok sık istek gönderildi. Biraz sonra tekrar deneyin.'
      : res.status === 401 || res.status === 403
      ? 'API anahtarı geçersiz. Lütfen GEMINI_API_KEY kontrol edin.'
      : 'AI servisi geçici hata döndürdü. Lütfen tekrar deneyin.';
    throw new Error(message);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought)?.text || '{}';
  return JSON.parse(content.replace(/^```(?:json)?/, '').replace(/```$/, '').trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authData?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = authData.user.id;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY is not configured' }, 500);

    const body = await req.json();
    const mode = body?.mode;

    let items: ReturnType<typeof cleanItem>[] = [];

    if (mode === 'parse') {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return json({ error: 'Metin gerekli' }, 400);
      const prompt = `Sen bir diyetisyen asistanısın. Aşağıdaki günlük beslenme planı metnini öğünlere ayır ve her yiyeceği listele.

Yanıtını SADECE şu JSON formatında ver:
{"items": [{"mealType": "breakfast|snack1|lunch|snack2|dinner|snack3", "name": "Türkçe yiyecek adı (porsiyon)", "calories": sayı, "protein": sayı, "carbs": sayı, "fat": sayı}]}

Öğün eşlemesi: kahvaltı -> breakfast, 1. ara öğün/kuşluk -> snack1, öğle -> lunch, 2. ara öğün/ikindi -> snack2, akşam -> dinner, 3. ara öğün/gece -> snack3. Öğün belirtilmemişse metindeki sıraya göre en mantıklı öğüne koy.
${RULES}

--- PLAN ---
${text.slice(0, 8000)}
--- PLAN SONU ---`;
      const parsed = await callGemini(GEMINI_API_KEY, prompt);
      items = (Array.isArray(parsed?.items) ? parsed.items : []).map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
    } else if (mode === 'estimate') {
      const names: string[] = Array.isArray(body.items)
        ? body.items.map((i: any) => (typeof i?.name === 'string' ? i.name.trim() : '')).filter(Boolean).slice(0, MAX_ITEMS)
        : [];
      if (names.length === 0) return json({ error: 'Yiyecek listesi gerekli' }, 400);
      const prompt = `Sen bir beslenme uzmanısın. Aşağıdaki yiyeceklerin her biri için kalori ve makro değerlerini tahmin et.

Yanıtını SADECE şu JSON formatında ver; "name" alanını girdideki adla BİREBİR aynı yaz, sırayı koru:
{"items": [{"name": "girdideki ad", "calories": sayı, "protein": sayı, "carbs": sayı, "fat": sayı}]}
${RULES}
- Ada porsiyon ekleme, adı değiştirme

Yiyecekler:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
      const parsed = await callGemini(GEMINI_API_KEY, prompt);
      const results = (Array.isArray(parsed?.items) ? parsed.items : []).map(cleanItem).filter(Boolean);
      // Adı eşleşmezse sıraya göre eşle
      const byName = new Map(results.map((r: any) => [r.name.toLocaleLowerCase('tr-TR'), r]));
      items = names.map((name, i) => {
        const r = byName.get(name.toLocaleLowerCase('tr-TR')) ?? results[i];
        return r ? { ...r, name } : { name, mealType: null, calories: 0, protein: null, carbs: null, fat: null };
      });
    } else {
      return json({ error: 'Geçersiz mod' }, 400);
    }

    // Kalorileri kullanıcının önbelleğine yaz (lookup-calories ile paylaşılır)
    const withCalories = items.filter((i) => i && i.calories > 0) as NonNullable<typeof items[number]>[];
    if (withCalories.length > 0) {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const seen = new Set<string>();
      const rows = withCalories.flatMap((i) => {
        const normalized = i.name.toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(normalized)) return [];
        seen.add(normalized);
        return [{ user_id: userId, food_name: i.name, food_name_normalized: normalized, calories: i.calories, verified: false, source: 'ai' }];
      });
      const { error: cacheError } = await supabaseAdmin
        .from('calorie_cache')
        .upsert(rows, { onConflict: 'user_id,food_name_normalized', ignoreDuplicates: true });
      if (cacheError) console.error('Cache upsert error:', cacheError);
    }

    return json({ success: true, items });
  } catch (error) {
    console.error('Error in plan-assist function:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
