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
    currentWeightKg: number | null;
    targetWeightKg: number | null;
    weightGoalWeeks: number;
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

    const currentWeight = historyData.userProfile.currentWeightKg;
    const targetWeight = historyData.userProfile.targetWeightKg;
    const weightGoalWeeks = historyData.userProfile.weightGoalWeeks || 12;
    const hasWeightGoal = currentWeight && targetWeight;

    // Calculate required weekly deficit/surplus
    let requiredWeeklyChange = 0;
    let requiredDailyCalorieChange = 0;
    if (hasWeightGoal) {
      const weightDiff = currentWeight - targetWeight;
      requiredWeeklyChange = weightDiff / weightGoalWeeks;
      // 7700 kcal = 1 kg
      requiredDailyCalorieChange = (requiredWeeklyChange * 7700) / 7;
    }

    const systemPrompt = `Sen bir beslenme ve fitness koçusun. Kullanıcının geçmiş verilerini analiz ederek kilo değişim tahmini ve KİŞİSELLEŞTİRİLMİŞ öneriler vereceksin.

Temel kurallar:
- 7700 kcal fazla = yaklaşık 1 kg artış
- 7700 kcal açık = yaklaşık 1 kg kayıp
- Egzersiz dakikası başına ortalama 5-8 kcal yakım
- Su tüketimi metabolizmayı etkiler
- Kafein metabolizmayı hafifçe artırır
${hasWeightGoal ? `
KULLANICI HEDEFİ:
- Mevcut kilo: ${currentWeight} kg
- Hedef kilo: ${targetWeight} kg
- Hedef süre: ${weightGoalWeeks} hafta (${Math.round(weightGoalWeeks / 4.33)} ay)
- Kilo farkı: ${Math.abs(currentWeight - targetWeight).toFixed(1)} kg ${currentWeight > targetWeight ? 'vermesi' : 'alması'} gerekiyor
- Haftalık gerekli değişim: ${Math.abs(requiredWeeklyChange).toFixed(2)} kg/${currentWeight > targetWeight ? 'kayıp' : 'artış'}
- Günlük gerekli kalori ${currentWeight > targetWeight ? 'açığı' : 'fazlası'}: ${Math.abs(requiredDailyCalorieChange).toFixed(0)} kcal

ÖNEMLİ: Kullanıcının hedefe ${weightGoalWeeks} haftada ulaşması için SOMUT, UYGULANABILIR öneriler ver.
- "Günde X kalori daha az alın" gibi net rakamlar kullan
- "Haftada X gün Y dakika egzersiz ekleyin" gibi spesifik planlar ver
- Mevcut alışkanlıklarını analiz et ve neleri değiştirmesi gerektiğini söyle
- Sağlıklı kilo kaybı haftada 0.5-1 kg'dır, bu sınırları aşan hedefler için uyar` : ''}

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "weeklyForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "monthlyForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "threeMonthForecast": { "kg": number, "direction": "loss" | "gain" | "stable" },
  "insights": ["string", "string", "string"],
  "recommendations": ["string", "string", "string", "string", "string"],
  "confidenceLevel": "low" | "medium" | "high",
  "summary": "string",
  "goalProgress": ${hasWeightGoal ? '{ "currentWeight": number, "targetWeight": number, "estimatedWeeksToGoal": number | null, "isOnTrack": boolean, "weeklyRequired": number, "dailyCalorieChange": number }' : 'null'}
}`;

    const userMessage = `Geçmiş ${dataSummary.length} günlük veri:
- Ortalama günlük kalori farkı (hedef - alınan): ${avgCalorieDiff} kcal
- Ortalama günlük egzersiz: ${avgExercise} dakika
- Ortalama su tüketimi hedef yüzdesi: ${avgWaterPercentage}%
- Hedef kalori: ${historyData.userProfile.targetCalories} kcal
- Hedef su: ${historyData.userProfile.targetWaterMl} ml
${hasWeightGoal ? `- Mevcut kilo: ${currentWeight} kg
- Hedef kilo: ${targetWeight} kg
- Hedef süre: ${weightGoalWeeks} hafta
- Hedefe ulaşmak için gerekli günlük kalori ${currentWeight > targetWeight ? 'açığı' : 'fazlası'}: ${Math.abs(requiredDailyCalorieChange).toFixed(0)} kcal` : ''}

Detaylı günlük veriler:
${JSON.stringify(dataSummary.slice(0, 30), null, 2)}

Bu verilere dayanarak:
1. 1 hafta, 1 ay ve 3 aylık kilo değişim tahmini yap
2. Kullanıcının mevcut alışkanlıklarını analiz et
3. Hedefe ${weightGoalWeeks} haftada ulaşmak için 5 SOMUT, UYGULANABILIR öneri ver
4. Her öneri spesifik rakamlar içersin (kaç kalori, kaç dakika egzersiz, vb.)
5. Önerileri kullanıcının mevcut durumuna göre kişiselleştir`;

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

      // Calculate goal progress if weight data is available
      let goalProgress = null;
      const recommendations: string[] = [];
      
      if (hasWeightGoal) {
        const weeklyChange = netWeekly;
        const weightDiff = currentWeight - targetWeight;
        const needsLoss = weightDiff > 0;
        
        let estimatedWeeksToGoal: number | null = null;
        let isOnTrack = false;
        
        if (Math.abs(weeklyChange) > 0.01) {
          if ((needsLoss && weeklyChange < 0) || (!needsLoss && weeklyChange > 0)) {
            estimatedWeeksToGoal = Math.ceil(Math.abs(weightDiff) / Math.abs(weeklyChange));
            isOnTrack = estimatedWeeksToGoal <= weightGoalWeeks;
          } else {
            isOnTrack = false;
          }
        }
        
        goalProgress = {
          currentWeight,
          targetWeight,
          estimatedWeeksToGoal,
          isOnTrack,
          weeklyRequired: requiredWeeklyChange,
          dailyCalorieChange: requiredDailyCalorieChange
        };
        
        // Generate personalized recommendations based on goal
        const calorieDiffNeeded = Math.abs(requiredDailyCalorieChange) - Math.abs(avgCalorieDiff);
        
        if (needsLoss) {
          if (avgCalorieDiff > 0) {
            recommendations.push(`Günde ${Math.abs(avgCalorieDiff).toFixed(0)} kcal fazla alıyorsunuz. Hedefe ulaşmak için günde ${Math.abs(requiredDailyCalorieChange).toFixed(0)} kcal açık oluşturmalısınız.`);
          }
          if (avgExercise < 30) {
            recommendations.push(`Günlük egzersize ${Math.max(30 - avgExercise, 15)} dakika daha ekleyin. Bu yaklaşık ${Math.round((30 - avgExercise) * 6)} kcal daha yakmanızı sağlar.`);
          }
          if (calorieDiffNeeded > 100) {
            recommendations.push(`Günlük ${Math.round(calorieDiffNeeded)} kcal daha az almanız gerekiyor. Porsiyon boyutlarını %15-20 azaltmayı deneyin.`);
          }
        } else {
          recommendations.push(`Kilo almak için günde ${Math.abs(requiredDailyCalorieChange).toFixed(0)} kcal fazla almanız gerekiyor.`);
        }
        
        if (avgWaterPercentage < 80) {
          recommendations.push(`Su tüketimini günde ${Math.round((100 - avgWaterPercentage) * historyData.userProfile.targetWaterMl / 100)} ml artırın. Bu metabolizmanızı hızlandırır.`);
        }
        
        recommendations.push(`${weightGoalWeeks} haftalık hedefinize ulaşmak için haftada ${Math.abs(requiredWeeklyChange).toFixed(2)} kg ${needsLoss ? 'vermeniz' : 'almanız'} gerekiyor.`);
      } else {
        // Default recommendations without weight goal
        recommendations.push(avgCalorieDiff > 200 ? "Kalori alımını azaltmayı deneyin" : "Kalori dengeniz iyi görünüyor");
        recommendations.push(avgExercise < 30 ? "Günlük en az 30 dakika egzersiz hedefleyin" : "Egzersiz rutininiz harika");
        recommendations.push(avgWaterPercentage < 80 ? "Su tüketiminizi artırın" : "Su tüketiminiz yeterli");
      }

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
        recommendations,
        confidenceLevel: dataSummary.length >= 14 ? "high" : dataSummary.length >= 7 ? "medium" : "low",
        summary: `${dataSummary.length} günlük veriye dayalı hesaplama`,
        goalProgress
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
