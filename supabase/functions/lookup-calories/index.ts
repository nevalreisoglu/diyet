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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log(`Authenticated user: ${userId}`);

    const { foodName } = await req.json();

    if (!foodName || typeof foodName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Food name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up calories for: ${foodName} (user: ${userId})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sen bir beslenme veritabanısın. Kullanıcı sana bir yiyecek adı verecek ve sen o yiyeceğin standart porsiyon kalori değerini döndüreceksin.

KURALLAR:
1. SADECE bir tam sayı döndür (kcal cinsinden). Başka hiçbir şey yazma.
2. Her zaman aynı yiyecek için aynı değeri döndür - tutarlı ol.
3. Standart porsiyon boyutları kullan:
   - Meyveler: 1 orta boy (150g)
   - Et/tavuk/balık: 100g pişmiş
   - Pilav/makarna: 150g pişmiş (1 porsiyon)
   - Ekmek: 1 dilim (30g)
   - Yumurta: 1 adet büyük boy
   - Süt/yoğurt: 200ml/200g
   - Peynir: 30g

STANDART DEĞERLİ ÖRNEKLER (bu değerleri kullan):
- elma -> 80
- muz -> 105
- yumurta -> 78
- ekmek 1 dilim -> 80
- tavuk göğsü 100g -> 165
- pilav 1 porsiyon -> 195
- yoğurt -> 120
- süt 1 bardak -> 120
- beyaz peynir -> 75
- kaşar peynir -> 110

Porsiyon belirtilmemişse standart porsiyonu kullan. HER ZAMAN AYNI YİYECEK İÇİN AYNI DEĞER.`
          },
          {
            role: "user",
            content: foodName
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to lookup calories" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content?.trim();
    
    console.log(`AI response for "${foodName}": ${content}`);

    // Extract number from response
    const calorieMatch = content?.match(/\d+/);
    const calories = calorieMatch ? parseInt(calorieMatch[0], 10) : null;

    if (!calories || isNaN(calories)) {
      console.error("Could not parse calories from response:", content);
      return new Response(
        JSON.stringify({ error: "Could not determine calories for this food" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ calories }),
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
