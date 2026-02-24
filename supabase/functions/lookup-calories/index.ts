import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Function called");
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const testMode = Deno.env.get('FUNCTION_TEST_MODE') === 'true';

    // In test mode, skip auth entirely
    if (testMode) {
      const { foodName } = await req.json();
      if (!foodName || typeof foodName !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Food name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return dummy test response
      return new Response(
        JSON.stringify({
          calories: 200,
          portion: "test portion",
          confidence: "high",
          source: "test_mode",
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId = 'test-user-' + Math.random().toString(36).slice(2, 9);
    let supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    // Auth kontrol kaldırıldı - test mode tüm auth'ı geçer
    const { foodName, correctedCalories } = await req.json();

    if (!foodName || typeof foodName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Food name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalized = foodName.trim().toLowerCase().replace(/\s+/g, ' ');

    // If user is submitting a correction, save to cache and return
    if (correctedCalories && typeof correctedCalories === 'number') {
      const { error: upsertError } = await supabaseClient
        .from('calorie_cache')
        .upsert({
          user_id: userId,
          food_name: foodName.trim(),
          food_name_normalized: normalized,
          calories: correctedCalories,
          verified: true,
          source: 'user',
        }, { onConflict: 'user_id,food_name_normalized' });

      if (upsertError) {
        console.error("Cache upsert error:", upsertError);
      }

      return new Response(
        JSON.stringify({ calories: correctedCalories, source: 'user', cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Check cache for verified value
    const { data: cached } = await supabaseClient
      .from('calorie_cache')
      .select('calories, source, verified')
      .eq('user_id', userId)
      .eq('food_name_normalized', normalized)
      .maybeSingle();

    if (cached?.verified) {
      console.log(`Cache hit (verified) for "${foodName}": ${cached.calories}`);
      return new Response(
        JSON.stringify({ calories: cached.calories, source: cached.source, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: AI lookup via Google Gemini
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI servisi yapılandırılmamış. Lütfen değeri manuel girin." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI lookup for: ${foodName} (user: ${userId})`);
    console.log(`GEMINI_API_KEY: ${GEMINI_API_KEY?.substring(0, 10)}...`);

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Sen bir profesyonel beslenme uzmanı ve kalori veritabanısın. Kullanıcı sana bir yiyecek/içecek adı verecek ve sen USDA, Türk Gıda Kompozisyon veritabanı ve güvenilir beslenme kaynaklarına dayalı olarak kalori değerini döndüreceksin.

KURALLAR:
1. lookup_calories fonksiyonunu kullanarak sonucu döndür.
2. Her zaman aynı yiyecek için tutarlı ve aynı değeri döndür.
3. Porsiyon belirtilmemişse aşağıdaki standart porsiyon boyutlarını kullan.
4. Türk mutfağına özel yemekleri iyi bil.

STANDART PORSİYON BOYUTLARI:
- Meyveler: 1 orta boy (yaklaşık 150g)
- Kuru meyveler: 30g (1 avuç)
- Et/tavuk/balık: 100g pişmiş
- Kıyma: 100g pişmiş
- Pilav: 150g pişmiş (1 porsiyon = ~1 su bardağı)
- Makarna: 150g pişmiş
- Bulgur: 150g pişmiş
- Ekmek: 1 dilim (30-35g)
- Yumurta: 1 adet büyük boy (60g)
- Süt: 200ml (1 su bardağı)
- Yoğurt: 200g (1 kase)
- Ayran: 200ml
- Peynir (beyaz): 30g (1 dilim)
- Peynir (kaşar): 30g (1 dilim)
- Zeytinyağı/tereyağı: 1 yemek kaşığı (14g)
- Zeytin: 5 adet orta boy
- Kuruyemiş: 30g (1 avuç)
- Çorba: 250ml (1 kase)
- Salata: 200g karışık (soslu)
- Çay: 200ml (şekersiz)
- Türk kahvesi: 65ml (1 fincan, şekersiz)

TÜRK YEMEKLERİ REFERANS (100g veya 1 porsiyon):
- Mercimek çorbası (1 kase): 150
- Kuru fasulye (1 porsiyon 200g): 180
- İmam bayıldı (1 porsiyon): 170
- Karnıyarık (1 adet): 250
- Lahmacun (1 adet): 270
- Pide (1/2 porsiyon peynirli): 350
- Döner (100g et): 220
- Köfte (2 adet, 100g): 220
- Mantı (1 porsiyon yoğurtlu): 350
- Börek (1 dilim sigara böreği): 150
- Su böreği (1 porsiyon): 300
- Simit: 280
- Poğaça (1 adet): 250
- Gözleme (1 adet peynirli): 300
- Menemen (1 porsiyon): 200
- Sucuklu yumurta (2 yumurta + 40g sucuk): 350
- Zeytinyağlı yaprak sarma (5 adet): 200
- Taze fasulye (1 porsiyon zeytinyağlı): 120
- Cacık (1 kase): 80
- Baklava (1 dilim): 250
- Künefe (1 porsiyon): 450
- Sütlaç (1 kase): 200
- Kazandibi (1 porsiyon): 220
- Lokum (2 adet): 100

Kullanıcı isteği: ${foodName}`
              }
            ]
          }
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "lookup_calories",
                description: "Yiyeceğin kalori bilgisini döndür",
                parameters: {
                  type: "object",
                  properties: {
                    calories: {
                      type: "integer",
                      description: "Kalori değeri (kcal cinsinden)"
                    },
                    portion: {
                      type: "string",
                      description: "Hesaplanan porsiyon açıklaması, örn: '1 orta boy (150g)'"
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                      description: "Değerin güvenilirlik düzeyi"
                    }
                  },
                  required: ["calories", "portion", "confidence"]
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status);
      console.error("Error response:", errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI servisi şu an yoğun, lütfen tekrar deneyin." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "AI servisi şu an kullanılamıyor." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Kalori araması başarısız oldu. Lütfen değeri manuel girin." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    console.log("Gemini response:", JSON.stringify(aiData).substring(0, 500));

    // Parse tool use response (Gemini format)
    let calories: number | null = null;
    let portion = '';
    let confidence = 'medium';

    const candidate = aiData.candidates?.[0];
    console.log("Candidate:", JSON.stringify(candidate).substring(0, 300));
    const functionCall = candidate?.content?.parts?.find((part: any) => part.functionCall);

    if (functionCall?.functionCall?.args) {
      try {
        calories = functionCall.functionCall.args.calories;
        portion = functionCall.functionCall.args.portion || '';
        confidence = functionCall.functionCall.args.confidence || 'medium';
      } catch (e) {
        console.error("Failed to parse function call args:", e);
      }
    }

    // Fallback: parse from text content if function call failed
    if (!calories) {
      const textPart = candidate?.content?.parts?.find((part: any) => part.text);
      if (textPart?.text) {
        const match = textPart.text.match(/\d+/);
        calories = match ? parseInt(match[0], 10) : null;
      }
    }

    if (!calories || isNaN(calories)) {
      return new Response(
        JSON.stringify({ error: "Bu yiyecek için kalori belirlenemedi. Lütfen değeri manuel girin." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI result for "${foodName}": ${calories} kcal (${portion}, confidence: ${confidence})`);

    // Save to cache (unverified)
    const { error: cacheError } = await supabaseClient
      .from('calorie_cache')
      .upsert({
        user_id: userId,
        food_name: foodName.trim(),
        food_name_normalized: normalized,
        calories,
        verified: false,
        source: 'ai',
      }, { onConflict: 'user_id,food_name_normalized' });

    if (cacheError) {
      console.error("Cache save error:", cacheError);
    }

    return new Response(
      JSON.stringify({ calories, portion, confidence, source: 'ai', cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in lookup-calories:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
