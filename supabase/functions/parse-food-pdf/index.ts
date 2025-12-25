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
    const { pdfText, userId } = await req.json();

    if (!pdfText || !userId) {
      return new Response(
        JSON.stringify({ error: 'PDF text and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing PDF text with AI...');

    // Use AI to extract food items from PDF text
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sen bir beslenme uzmanısın. Verilen metinden yiyecek isimlerini ve kalori değerlerini çıkar.
            
Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
[
  {"name": "yiyecek adı", "calories": kalori_sayısı, "protein": protein_gram, "carbs": karbonhidrat_gram, "fat": yağ_gram},
  ...
]

Eğer kalori veya besin değeri belirtilmemişse, ortalama değerleri tahmin et.
Sadece yiyecek isimlerini ve değerlerini çıkar, açıklama ekleme.`
          },
          {
            role: 'user',
            content: `Bu PDF'deki yiyecek listesini analiz et ve JSON formatında döndür:\n\n${pdfText}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI API request failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let foods = [];
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
      foods = JSON.parse(cleanedContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse food list from PDF', foods: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, delete existing custom foods for this user
    await supabase
      .from('custom_foods')
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
      }));

      const { error: insertError } = await supabase
        .from('custom_foods')
        .insert(foodsToInsert);

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to save foods to database');
      }
    }

    console.log(`Successfully parsed and saved ${foods.length} foods`);

    return new Response(
      JSON.stringify({ success: true, foods, count: foods.length }),
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
