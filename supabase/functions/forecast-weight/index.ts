import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HistoryData {
  dailyData: {
    date: string;
    calories: number;
    targetCalories: number;
    waterMl: number;
    targetWaterMl: number;
    exerciseMinutes: number;
    coffeeCount: number;
    teaCount: number;
  }[];
  userProfile: {
    targetCalories: number;
    targetWaterMl: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { historyData } = await req.json() as { historyData: HistoryData };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare the data summary for AI
    const dataSummary = historyData.dailyData.map(d => ({
      date: d.date,
      calorieDiff: d.calories - d.targetCalories,
      waterPercentage: Math.round((d.waterMl / d.targetWaterMl) * 100),
      exerciseMinutes: d.exerciseMinutes,
      caffeine: d.coffeeCount + d.teaCount
    }));

    const avgCalorieDiff = dataSummary.length > 0 
      ? Math.round(dataSummary.reduce((sum, d) => sum + d.calorieDiff, 0) / dataSummary.length)
      : 0;
    
    const avgExercise = dataSummary.length > 0
      ? Math.round(dataSummary.reduce((sum, d) => sum + d.exerciseMinutes, 0) / dataSummary.length)
      : 0;

    const avgWaterPercentage = dataSummary.length > 0
      ? Math.round(dataSummary.reduce((sum, d) => sum + d.waterPercentage, 0) / dataSummary.length)
      : 0;

    const systemPrompt = `Sen bir beslenme ve fitness uzmanısın. Kullanıcının geçmiş verilerini analiz ederek kilo değişim tahmini yapacaksın.

Temel kurallar:
- 7700 kcal fazla = yaklaşık 1 kg artış
- 7700 kcal açık = yaklaşık 1 kg kayıp
- Egzersiz dakikası başına ortalama 5-8 kcal yakım
- Su tüketimi metabolizmayı etkiler
- Kafein metabolizmayı hafifçe artırır

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "weeklyForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "monthlyForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "threeMonthForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "insights": ["string", "string", "string"],
  "recommendations": ["string", "string", "string"],
  "confidenceLevel": "low" | "medium" | "high",
  "summary": "string"
}`;

    const userMessage = `Geçmiş ${dataSummary.length} günlük veri:
- Ortalama günlük kalori farkı (hedef - alınan): ${avgCalorieDiff} kcal
- Ortalama günlük egzersiz: ${avgExercise} dakika
- Ortalama su tüketimi hedef yüzdesi: ${avgWaterPercentage}%
- Hedef kalori: ${historyData.userProfile.targetCalories} kcal
- Hedef su: ${historyData.userProfile.targetWaterMl} ml

Detaylı günlük veriler:
${JSON.stringify(dataSummary.slice(0, 30), null, 2)}

Bu verilere dayanarak 1 hafta, 1 ay ve 3 aylık kilo değişim tahmini yap. Tahminler kilogram cinsinden olsun. Ayrıca içgörüler ve öneriler ver.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz, lütfen hesabınızı kontrol edin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI servisi hatası" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI yanıtı boş");
    }

    // Parse JSON from AI response
    let forecast;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        forecast = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON bulunamadı");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      // Return a fallback response based on simple calculations
      const weeklyCalorieChange = avgCalorieDiff * 7;
      const monthlyCalorieChange = avgCalorieDiff * 30;
      const threeMonthCalorieChange = avgCalorieDiff * 90;
      
      const exerciseCaloriesBurned = avgExercise * 6; // ~6 kcal per minute average
      
      const netWeekly = (weeklyCalorieChange - (exerciseCaloriesBurned * 7)) / 7700;
      const netMonthly = (monthlyCalorieChange - (exerciseCaloriesBurned * 30)) / 7700;
      const netThreeMonth = (threeMonthCalorieChange - (exerciseCaloriesBurned * 90)) / 7700;

      forecast = {
        weeklyForecast: { 
          kg: Math.abs(Number(netWeekly.toFixed(2))), 
          direction: netWeekly > 0.05 ? "gain" : netWeekly < -0.05 ? "loss" : "stable" 
        },
        monthlyForecast: { 
          kg: Math.abs(Number(netMonthly.toFixed(2))), 
          direction: netMonthly > 0.1 ? "gain" : netMonthly < -0.1 ? "loss" : "stable" 
        },
        threeMonthForecast: { 
          kg: Math.abs(Number(netThreeMonth.toFixed(2))), 
          direction: netThreeMonth > 0.2 ? "gain" : netThreeMonth < -0.2 ? "loss" : "stable" 
        },
        insights: [
          `Günlük ortalama ${Math.abs(avgCalorieDiff)} kcal ${avgCalorieDiff > 0 ? 'fazla' : 'açık'}`,
          `Günlük ortalama ${avgExercise} dakika egzersiz`,
          `Su hedefinin %${avgWaterPercentage}'ine ulaşıyorsunuz`
        ],
        recommendations: [
          avgCalorieDiff > 200 ? "Kalori alımını azaltmayı deneyin" : "Kalori dengeniz iyi görünüyor",
          avgExercise < 30 ? "Günlük en az 30 dakika egzersiz hedefleyin" : "Egzersiz rutininiz harika",
          avgWaterPercentage < 80 ? "Su tüketiminizi artırın" : "Su tüketiminiz yeterli"
        ],
        confidenceLevel: dataSummary.length >= 14 ? "high" : dataSummary.length >= 7 ? "medium" : "low",
        summary: `${dataSummary.length} günlük veriye dayalı hesaplama`
      };
    }

    return new Response(JSON.stringify({ forecast, dataPointCount: dataSummary.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Forecast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
