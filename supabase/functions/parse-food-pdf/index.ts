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
    // Verify authentication using getClaims
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
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !data?.user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user's ID
    const userId = data.user.id;
    console.log(`Authenticated user: ${userId}`);

    const { fileBase64, mimeType, text } = await req.json();

    const hasFile = typeof fileBase64 === 'string' && fileBase64.length > 0 && typeof mimeType === 'string';
    const hasText = typeof text === 'string' && text.trim().length > 0;
    if (!hasFile && !hasText) {
      return new Response(
        JSON.stringify({ error: 'Dosya içeriği gerekli' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (hasFile && !/^(application\/pdf|image\/(jpeg|png|webp|gif))$/.test(mimeType)) {
      return new Response(
        JSON.stringify({ error: 'Desteklenmeyen dosya türü' }),
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

    console.log(`Parsing food list with Gemini (${hasFile ? mimeType : 'text'})...`);

    const sourceDescription = hasFile
      ? (mimeType === 'application/pdf' ? 'Bu PDF dosyasındaki' : 'Bu görseldeki')
      : 'Aşağıdaki metindeki';
    const contentPart = hasFile
      ? { inlineData: { mimeType, data: fileBase64 } }
      : { text: `--- LİSTE ---\n${text.slice(0, 60000)}\n--- LİSTE SONU ---` };

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: { responseMimeType: 'application/json' },
        contents: [
          {
            parts: [
              {
                text: `Sen bir beslenme uzmanısın. ${sourceDescription} yiyecek listesini ve öğün saatlerini analiz et.

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{
  "days": [
    {
      "label": "gün etiketi (örn. Pazartesi, 1. Gün) veya liste günlere ayrılmamışsa null",
      "everyDay": false,
      "foods": [
        {"name": "Türkçe yiyecek adı (porsiyon)", "calories": kalori_sayısı, "protein": protein_gram, "carbs": karbonhidrat_gram, "fat": yağ_gram, "mealType": "breakfast|lunch|dinner|snack1|snack2|snack3"}
      ]
    }
  ],
  "mealSchedules": {
    "breakfast": "08:00",
    "lunch": "12:30",
    "dinner": "19:00",
    "snack1": "10:00",
    "snack2": "15:00",
    "snack3": "21:00"
  }
}

Kurallar:
- Yiyecek adlarını MUTLAKA Türkçe yaz. Dosya başka bir dildeyse adları Türkçeye çevir (örn. "Boiled egg" -> "Haşlanmış yumurta", "Almonds" -> "Badem")
- Porsiyon/miktar bilgisini adın sonunda parantez içinde Türkçe koru (örn. "Haşlanmış yumurta (1 adet)", "Badem (10 adet)", "Yulaf (2 yemek kaşığı)")
- Her yiyecek için tahmini kalori ve besin değerlerini hesapla
- Her yiyecek için hangi öğüne ait olduğunu mealType alanında belirt; öğünü belgedeki başlığa göre seç, yiyeceğin türüne göre tahmin etme:
  - "Kahvaltı", "Sabah" -> "breakfast"
  - "Kuşluk", "Sabah ara öğünü", "1. ara öğün", "Ara öğün 1" (kahvaltı ile öğle arası) -> "snack1"
  - "Öğle", "Öğle yemeği" -> "lunch"
  - "İkindi", "Öğleden sonra ara", "2. ara öğün", "Ara öğün 2" (öğle ile akşam arası) -> "snack2"
  - "Akşam", "Akşam yemeği" -> "dinner"
  - "Gece", "Yatmadan önce", "3. ara öğün", "Ara öğün 3" (akşamdan sonra) -> "snack3"
  - Ana öğünleri (kahvaltı/öğle/akşam) ASLA snack olarak işaretleme; başlıkta sadece "Ara öğün" yazıyorsa belgedeki sırasına göre snack1/snack2/snack3 ver
- Öğün saatleri metinde varsa onları kullan, yoksa varsayılan değerleri kullan
- Tüm yiyecekleri listele, kalori belirtilmemişse tahmin et
- Liste günlere ayrılmışsa (Pazartesi/Salı..., 1. Gün/2. Gün..., Gün 1...) her günü ayrı bir "days" öğesi yap ve etiketi dosyadaki gibi yaz; günler belgedeki sırayla olsun
- Liste günlere ayrılmamışsa tek bir "days" öğesi döndür ve "label" null olsun
- Günlere ayrılmış listede bazı bölümler tüm günler için ortak verilmişse (örn. "Ara öğünler", "Her gün", "Tüm günlerde") bunları ayrı bir "days" öğesine koy, "everyDay": true ve "label": "Her gün" yap; bu öğeleri günlerin içine tekrar yazma
- "Seçenek" / "veya" ile verilen alternatifleri aynı güne ayrı yiyecek olarak ekle
- Dosyada yiyecek listesi yoksa "days" boş dizi olsun`
              },
              contentPart,
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
    // Gemini 2.5 thinking model may emit thought parts before the answer
    const content = candidate?.content?.parts?.find((p: any) => p.text && !p.thought)?.text || '{}';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let foods = [];
    let mealSchedules: Record<string, string> = {};
    try {
      // Clean the response - remove markdown code blocks if present
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
      const parsed = JSON.parse(cleanedContent.trim());
      
      if (Array.isArray(parsed)) {
        foods = parsed;
      } else if (Array.isArray(parsed.days)) {
        const allDays = parsed.days.filter((d: any) => Array.isArray(d?.foods) && d.foods.length > 0);
        const isEveryDay = (d: any) => d.everyDay === true || (typeof d.label === 'string' && /(her ?gün|tüm günler|bütün günler|ortak|genel)/i.test(d.label));
        const everyDay = allDays.filter(isEveryDay);
        const days = allDays.filter((d: any) => !isEveryDay(d));
        const hasDayLabels = days.length > 1 || (days.length === 1 && typeof days[0].label === 'string' && days[0].label.trim());
        foods = [
          ...days.flatMap((d: any, index: number) =>
            d.foods.map((f: any) => ({
              ...f,
              dayLabel: hasDayLabels ? (typeof d.label === 'string' && d.label.trim() ? d.label.trim() : `${index + 1}. Gün`) : null,
              dayIndex: hasDayLabels ? index : null,
            }))
          ),
          ...everyDay.flatMap((d: any) =>
            d.foods.map((f: any) => ({
              ...f,
              dayLabel: hasDayLabels ? 'Her gün' : null,
              dayIndex: hasDayLabels ? -1 : null,
            }))
          ),
        ];
        mealSchedules = parsed.mealSchedules || {};
      } else {
        foods = parsed.foods || [];
        mealSchedules = parsed.mealSchedules || {};
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse food list from PDF', foods: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated client with user context for database operations
    // This respects RLS policies
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First, delete existing custom foods for this user
    await supabaseAdmin
      .from('custom_foods')
      .delete()
      .eq('user_id', userId);

    // Delete existing meal schedules for this user
    await supabaseAdmin
      .from('meal_schedules')
      .delete()
      .eq('user_id', userId);

    // Insert new foods
    if (foods.length > 0) {
      const foodsToInsert = foods.map((food: any) => ({
        user_id: userId,
        name: food.name,
        calories: food.calories || 0,
        protein: food.protein || null,
        carbs: food.carbs || null,
        fat: food.fat || null,
        meal_type: food.mealType || null,
        day_label: food.dayLabel ?? null,
        day_index: typeof food.dayIndex === 'number' ? food.dayIndex : null,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('custom_foods')
        .insert(foodsToInsert);

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to save foods to database');
      }
    }

    // Insert meal schedules
    if (Object.keys(mealSchedules).length > 0) {
      const schedulesToInsert = Object.entries(mealSchedules).map(([mealType, scheduledTime]) => ({
        user_id: userId,
        meal_type: mealType,
        scheduled_time: scheduledTime,
      }));

      const { error: scheduleError } = await supabaseAdmin
        .from('meal_schedules')
        .insert(schedulesToInsert);

      if (scheduleError) {
        console.error('Meal schedule insert error:', scheduleError);
        // Don't throw, just log - schedules are optional
      }
    }

    console.log(`Successfully parsed and saved ${foods.length} foods and ${Object.keys(mealSchedules).length} meal schedules for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        foods,
        mealSchedules,
        count: foods.length,
        dayCount: new Set(foods.map((f: any) => f.dayIndex).filter((d: any) => typeof d === 'number' && d >= 0)).size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-food-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
