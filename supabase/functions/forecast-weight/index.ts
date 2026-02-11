import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DailyDataPoint {
  date: string;
  calories: number;
  targetCalories: number;
  waterMl: number;
  targetWaterMl: number;
  exerciseMinutes: number;
  coffeeCount: number;
  teaCount: number;
}

interface HistoryData {
  dailyData: DailyDataPoint[];
  userProfile: {
    targetCalories: number;
    targetWaterMl: number;
    currentWeightKg: number | null;
    targetWeightKg: number | null;
    weightGoalWeeks: number;
  };
}

// ─── Statistical Helpers ───

/** Weighted Linear Regression: returns { slope, intercept, r2 }
 *  Weights decay exponentially so recent data points matter more. */
function weightedLinearRegression(
  values: number[],
  decayFactor = 0.95
): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  // weights: most recent (index n-1) gets weight 1, older gets decay^(n-1-i)
  const weights = values.map((_, i) => Math.pow(decayFactor, n - 1 - i));
  const totalW = weights.reduce((a, b) => a + b, 0);

  const meanX = weights.reduce((s, w, i) => s + w * i, 0) / totalW;
  const meanY = weights.reduce((s, w, i) => s + w * values[i], 0) / totalW;

  let ssXY = 0, ssXX = 0, ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssXY += weights[i] * (i - meanX) * (values[i] - meanY);
    ssXX += weights[i] * (i - meanX) ** 2;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;

  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += weights[i] * (values[i] - predicted) ** 2;
    ssTot += weights[i] * (values[i] - meanY) ** 2;
  }

  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

/** Exponential Weighted Moving Average */
function ewma(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/** Simple standard deviation */
function stddev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
}

/** Compute net daily energy balance (calories in − exercise burn) */
function computeNetBalance(d: DailyDataPoint): number {
  // Adaptive burn: use MET-based estimate ~6-8 kcal/min depending on exercise volume
  const burnRate = d.exerciseMinutes > 45 ? 7.5 : d.exerciseMinutes > 20 ? 6.5 : 5.5;
  const exerciseBurn = d.exerciseMinutes * burnRate;
  // Hydration & caffeine metabolic boost (minor but measurable)
  const hydrationBoost = d.waterMl >= d.targetWaterMl ? 50 : (d.waterMl / d.targetWaterMl) * 50;
  const caffeineBoost = Math.min((d.coffeeCount + d.teaCount * 0.5) * 10, 40);
  return d.calories - d.targetCalories - exerciseBurn + hydrationBoost + caffeineBoost;
  // Negative = deficit (weight loss), Positive = surplus (weight gain)
  // Note: hydrationBoost reduces effective deficit (better metabolism = less net surplus)
  // We subtract it from the net because good hydration helps burn more
}

/** Project weight change using regression model */
function projectWeight(
  netBalances: number[],
  days: number
): { kg: number; direction: "loss" | "gain" | "stable" } {
  const reg = weightedLinearRegression(netBalances, 0.96);
  const smoothed = ewma(netBalances, 0.3);
  const recentMomentum = smoothed.length >= 3
    ? smoothed.slice(-3).reduce((a, b) => a + b, 0) / 3
    : smoothed[smoothed.length - 1] ?? 0;

  // Blend regression projection with recent momentum (60/40 weighting)
  const lastIndex = netBalances.length - 1;
  const regressionProjectedDaily = reg.intercept + reg.slope * (lastIndex + Math.floor(days / 2));
  const blendedDaily = regressionProjectedDaily * 0.6 + recentMomentum * 0.4;

  // Convert total kcal balance over the period to kg (7700 kcal ≈ 1 kg)
  const totalBalance = blendedDaily * days;
  const kgChange = totalBalance / 7700;

  const absKg = Math.abs(Number(kgChange.toFixed(2)));
  const direction = kgChange > 0.05 ? "gain" : kgChange < -0.05 ? "loss" : "stable";

  return { kg: absKg, direction };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { historyData } = await req.json() as { historyData: HistoryData };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Sort chronologically (oldest first)
    const sorted = [...historyData.dailyData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // ─── Compute statistical features ───
    const netBalances = sorted.map(computeNetBalance);
    const calorieValues = sorted.map(d => d.calories);
    const exerciseValues = sorted.map(d => d.exerciseMinutes);
    const waterRatios = sorted.map(d => d.waterMl / d.targetWaterMl);

    // Regressions
    const balanceReg = weightedLinearRegression(netBalances, 0.96);
    const calorieReg = weightedLinearRegression(calorieValues, 0.95);
    const exerciseReg = weightedLinearRegression(exerciseValues, 0.95);

    // EWMA smoothed series
    const smoothedBalances = ewma(netBalances, 0.3);
    const smoothedCalories = ewma(calorieValues, 0.25);
    const smoothedExercise = ewma(exerciseValues, 0.3);

    // Statistical summaries
    const recentWindow = Math.min(7, sorted.length);
    const recentBalances = netBalances.slice(-recentWindow);
    const recentCalories = calorieValues.slice(-recentWindow);
    const recentExercise = exerciseValues.slice(-recentWindow);
    const recentWater = waterRatios.slice(-recentWindow);

    const stats = {
      dataPoints: sorted.length,
      balanceTrend: { slope: balanceReg.slope, r2: balanceReg.r2 },
      calorieTrend: { slope: calorieReg.slope, r2: calorieReg.r2 },
      exerciseTrend: { slope: exerciseReg.slope, r2: exerciseReg.r2 },
      recentAvg: {
        netBalance: Math.round(recentBalances.reduce((a, b) => a + b, 0) / recentWindow),
        calories: Math.round(recentCalories.reduce((a, b) => a + b, 0) / recentWindow),
        exercise: Math.round(recentExercise.reduce((a, b) => a + b, 0) / recentWindow),
        waterRatio: Math.round((recentWater.reduce((a, b) => a + b, 0) / recentWindow) * 100),
      },
      overallAvg: {
        netBalance: Math.round(netBalances.reduce((a, b) => a + b, 0) / netBalances.length),
        calories: Math.round(calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length),
        exercise: Math.round(exerciseValues.reduce((a, b) => a + b, 0) / exerciseValues.length),
      },
      volatility: {
        calorieStdDev: Math.round(stddev(calorieValues)),
        balanceStdDev: Math.round(stddev(netBalances)),
      },
      ewmaLatest: {
        balance: Math.round(smoothedBalances[smoothedBalances.length - 1] ?? 0),
        calories: Math.round(smoothedCalories[smoothedCalories.length - 1] ?? 0),
        exercise: Math.round(smoothedExercise[smoothedExercise.length - 1] ?? 0),
      },
    };

    // ─── Model-based projections (Predictive) ───
    const weeklyProjection = projectWeight(netBalances, 7);
    const monthlyProjection = projectWeight(netBalances, 30);
    const threeMonthProjection = projectWeight(netBalances, 90);

    // ─── Rule-based projections (Simple 7700 kcal = 1 kg) ───
    const avgNetBalance = netBalances.reduce((a, b) => a + b, 0) / netBalances.length;
    function ruleBasedProject(days: number): { kg: number; direction: "loss" | "gain" | "stable" } {
      const totalBalance = avgNetBalance * days;
      const kgChange = totalBalance / 7700;
      const absKg = Math.abs(Number(kgChange.toFixed(2)));
      const direction = kgChange > 0.05 ? "gain" : kgChange < -0.05 ? "loss" : "stable";
      return { kg: absKg, direction };
    }
    const ruleWeekly = ruleBasedProject(7);
    const ruleMonthly = ruleBasedProject(30);
    const ruleThreeMonth = ruleBasedProject(90);

    // ─── Confidence level based on data quality ───
    const confidenceLevel: "low" | "medium" | "high" =
      sorted.length >= 21 && balanceReg.r2 > 0.3 ? "high"
      : sorted.length >= 10 ? "medium"
      : "low";

    // ─── Goal progress calculation ───
    const currentWeight = historyData.userProfile.currentWeightKg;
    const targetWeight = historyData.userProfile.targetWeightKg;
    const weightGoalWeeks = historyData.userProfile.weightGoalWeeks || 12;
    const hasWeightGoal = currentWeight && targetWeight;

    let goalProgress = null;
    let requiredDailyCalorieChange = 0;
    if (hasWeightGoal) {
      const weightDiff = currentWeight - targetWeight;
      const requiredWeeklyChange = weightDiff / weightGoalWeeks;
      requiredDailyCalorieChange = (requiredWeeklyChange * 7700) / 7;

      // Estimate weeks to goal using model projection
      const weeklyKg = monthlyProjection.kg / 4.33;
      const weeklyDirection = monthlyProjection.direction;
      const needsLoss = weightDiff > 0;

      let estimatedWeeksToGoal: number | null = null;
      let isOnTrack = false;

      if (weeklyKg > 0.01) {
        if ((needsLoss && weeklyDirection === "loss") || (!needsLoss && weeklyDirection === "gain")) {
          estimatedWeeksToGoal = Math.ceil(Math.abs(weightDiff) / weeklyKg);
          isOnTrack = estimatedWeeksToGoal <= weightGoalWeeks * 1.15; // 15% tolerance
        }
      }

      goalProgress = {
        currentWeight,
        targetWeight,
        estimatedWeeksToGoal,
        isOnTrack,
        weeklyRequired: requiredWeeklyChange,
        dailyCalorieChange: requiredDailyCalorieChange,
      };
    }

    // ─── AI Interpretation Layer ───
    const systemPrompt = `Sen bir beslenme bilimci ve veri analistisin. Sana istatistiksel bir prediktif modelin çıktılarını veriyorum. Bu modelin sonuçlarını YORUMLAYARAK kullanıcıya kişiselleştirilmiş öneriler üreteceksin.

MODEL BİLGİLERİ:
- Ağırlıklı Lineer Regresyon (decay=0.96) ile trend analizi yapıldı
- EWMA (α=0.3) ile kısa vadeli momentum hesaplandı
- Projeksiyonlar %60 regresyon + %40 momentum blend ile oluşturuldu
- Net enerji dengesi = kalori alımı - hedef kalori - egzersiz yakımı + hidrasyon/kafein metabolik etkisi

ÖNEMLİ KURALLAR:
- Model çıktılarını temel al, kendi formüllerin ile ÇAKIŞMA yaratma
- Trend eğimi (slope) pozitifse kilo artış eğilimi, negatifse kayıp eğilimi var demektir
- R² değeri modelin açıklayıcılığını gösterir (0.5+ = güçlü trend, 0.3-0.5 = orta, <0.3 = zayıf/dalgalı)
- Volatilite yüksekse (stddev > ortalama * 0.5), kullanıcının alışkanlıkları tutarsız demektir
- EWMA son değeri, kullanıcının SON eğilimini gösterir
${hasWeightGoal ? `
KULLANICI HEDEFİ:
- Mevcut: ${currentWeight} kg → Hedef: ${targetWeight} kg
- Süre: ${weightGoalWeeks} hafta
- Gerekli günlük kalori ${currentWeight! > targetWeight! ? 'açığı' : 'fazlası'}: ${Math.abs(requiredDailyCalorieChange).toFixed(0)} kcal
- Model projeksiyonuna göre hedefe tahmini süre: ${goalProgress?.estimatedWeeksToGoal ?? 'hesaplanamıyor'} hafta
- Hedelde mi: ${goalProgress?.isOnTrack ? 'EVET' : 'HAYIR'}` : ''}

Yanıtını SADECE JSON formatında ver:
{
  "insights": ["string", "string", "string"],
  "recommendations": ["string", "string", "string", "string", "string"],
  "summary": "string"
}

insights: Model çıktılarını insanca yorumla (3 madde).
recommendations: Hedefe ulaşmak için 5 SOMUT, RAKAMSAL öneri ver. Her öneri "Günde X kalori...", "Haftada Y gün Z dk..." gibi net olsun.
summary: 1-2 cümlelik genel durum özeti.`;

    const userMessage = `MODEL İSTATİSTİKLERİ:
${JSON.stringify(stats, null, 2)}

MODEL PROJEKSİYONLARI:
- 1 Hafta: ${weeklyProjection.direction === 'loss' ? '-' : '+'}${weeklyProjection.kg} kg
- 1 Ay: ${monthlyProjection.direction === 'loss' ? '-' : '+'}${monthlyProjection.kg} kg
- 3 Ay: ${threeMonthProjection.direction === 'loss' ? '-' : '+'}${threeMonthProjection.kg} kg

Hedef kalori: ${historyData.userProfile.targetCalories} kcal
Hedef su: ${historyData.userProfile.targetWaterMl} ml

Son 7 günün detaylı verileri:
${JSON.stringify(sorted.slice(-7).map(d => ({
  tarih: d.date,
  kalori: d.calories,
  egzersiz_dk: d.exerciseMinutes,
  su_ml: d.waterMl,
  net_denge: Math.round(computeNetBalance(d))
})), null, 2)}

Bu istatistiksel model çıktılarını yorumla ve kişiselleştirilmiş öneriler üret.`;

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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz, lütfen hesabınızı kontrol edin." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Fallback: return model projections without AI interpretation
      return new Response(JSON.stringify({
        forecast: {
          weeklyForecast: weeklyProjection,
          monthlyForecast: monthlyProjection,
          threeMonthForecast: threeMonthProjection,
          insights: [
            `Son ${recentWindow} gün ort. net enerji dengesi: ${stats.recentAvg.netBalance} kcal/gün`,
            `Kalori trendi eğimi: ${calorieReg.slope > 0 ? 'artış' : 'azalış'} (R²=${balanceReg.r2.toFixed(2)})`,
            `Su hedefinin %${stats.recentAvg.waterRatio}'ine ulaşıyorsunuz`,
          ],
          recommendations: [
            `Günlük net enerji dengenizi ${Math.abs(stats.recentAvg.netBalance)} kcal ${stats.recentAvg.netBalance > 0 ? 'azaltmaya' : 'artırmaya'} çalışın.`,
            stats.recentAvg.exercise < 30 ? "Günlük egzersizi en az 30 dakikaya çıkarın." : "Egzersiz rutininiz iyi, devam edin.",
            stats.recentAvg.waterRatio < 80 ? "Su tüketimini hedefin %80'ine çıkarın." : "Su tüketiminiz yeterli.",
          ],
          confidenceLevel,
          summary: `${sorted.length} günlük veriye dayalı prediktif model analizi (R²=${balanceReg.r2.toFixed(2)})`,
          goalProgress,
        },
        dataPointCount: sorted.length,
        modelInfo: { type: "statistical_fallback", r2: balanceReg.r2 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    let aiInterpretation = { insights: [] as string[], recommendations: [] as string[], summary: "" };
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiInterpretation = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("AI JSON parse error:", e);
      }
    }

    // Merge model projections with AI interpretation
    const forecast = {
      weeklyForecast: weeklyProjection,
      monthlyForecast: monthlyProjection,
      threeMonthForecast: threeMonthProjection,
      insights: aiInterpretation.insights.length > 0 ? aiInterpretation.insights : [
        `Net enerji dengesi trendi: ${balanceReg.slope > 0 ? 'artış' : 'azalış'}`,
        `Model güvenilirliği: R²=${balanceReg.r2.toFixed(2)}`,
        `Son hafta ort. egzersiz: ${stats.recentAvg.exercise} dk/gün`,
      ],
      recommendations: aiInterpretation.recommendations.length > 0 ? aiInterpretation.recommendations : [
        "Yeterli veri toplandıkça öneriler daha kişisel hale gelecektir.",
      ],
      confidenceLevel,
      summary: aiInterpretation.summary || `${sorted.length} günlük prediktif model analizi`,
      goalProgress,
    };

    return new Response(JSON.stringify({
      forecast,
      ruleBasedForecast: {
        weeklyForecast: ruleWeekly,
        monthlyForecast: ruleMonthly,
        threeMonthForecast: ruleThreeMonth,
        avgDailyBalance: Math.round(avgNetBalance),
      },
      dataPointCount: sorted.length,
      modelInfo: {
        type: "predictive_blend",
        r2: balanceReg.r2,
        trendSlope: balanceReg.slope,
        ewmaLatest: stats.ewmaLatest.balance,
        confidenceBasis: confidenceLevel,
      },
    }), {
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
