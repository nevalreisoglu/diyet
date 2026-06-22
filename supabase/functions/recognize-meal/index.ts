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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageMediaType = mimeType || 'image/jpeg';
    console.log(`Recognizing meal from photo for user: ${userId}`);

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Sen bir profesyonel beslenme uzmanısın. Bu fotoğraftaki yiyecekleri tanımla ve her birinin besin değerlerini hesapla.

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{
  "foods": [
    {
      "name": "yiyeceğin Türkçe adı",
      "portion": "porsiyon açıklaması (örn: 1 porsiyon, 2 dilim, 1 kase)",
      "calories": kalori_sayısı,
      "protein": protein_gram,
      "carbs": karbonhidrat_gram,
      "fat": yağ_gram,
      "confidence": "high|medium|low"
    }
  ],
  "totalCalories": toplam_kalori,
  "mealDescription": "öğünün kısa bir Türkçe açıklaması"
}

KURALLAR:
1. Fotoğrafta görünen TÜM yiyecekleri listele.
2. Her yiyecek için tahmini porsiyon büyüklüğünü fotoğraftan anlamaya çalış.
3. Kalori ve makro besin değerlerini USDA ve Türk Gıda Kompozisyon veritabanına göre hesapla.
4. Türk yemeklerini doğru tanı (lahmacun, pide, döner, çorba, börek vb.).
5. Porsiyon miktarını fotoğraftaki görsel büyüklüğe göre tahmin et.
6. Güven seviyesini belirle:
   - "high": Yiyecek net olarak görünüyor ve porsiyon tahmini güvenilir
   - "medium": Yiyecek tanınabiliyor ama porsiyon tahmini kesin değil
   - "low": Yiyecek tam olarak tanınamıyor veya görüntü bulanık
7. Eğer fotoğrafta yiyecek yoksa veya tanınamıyorsa boş foods dizisi döndür.
8. Tüm yiyecek adlarını Türkçe yaz.`
              },
              {
                inlineData: {
                  mimeType: imageMediaType,
                  data: imageBase64,
                }
              }
            ]
          }
        ]
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
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const candidate = aiData.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '{}';

    console.log('AI response:', content);

    // Parse the JSON response
    let result = { foods: [], totalCalories: 0, mealDescription: '' };
    try {
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      result = JSON.parse(cleanedContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Fotoğraftaki yiyecekler tanınamadı. Lütfen daha net bir fotoğraf çekin.', foods: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foods = (result.foods || []).map((food: any) => ({
      name: food.name || 'Bilinmeyen',
      portion: food.portion || '1 porsiyon',
      calories: Math.round(food.calories || 0),
      protein: Math.round(food.protein || 0),
      carbs: Math.round(food.carbs || 0),
      fat: Math.round(food.fat || 0),
      confidence: food.confidence || 'medium',
    }));

    const totalCalories = foods.reduce((sum: number, f: any) => sum + f.calories, 0);

    console.log(`Recognized ${foods.length} foods (${totalCalories} kcal total) for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        foods,
        totalCalories,
        mealDescription: result.mealDescription || '',
        count: foods.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in recognize-meal function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
