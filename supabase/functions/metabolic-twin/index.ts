import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scenario, profile, recentData, measurements } = await req.json();

    const measurementFields: [string, string, string][] = [
      ['weight_kg', 'Kilo', 'kg'],
      ['body_fat_pct', 'Yağ oranı', '%'],
      ['muscle_mass_kg', 'Kas kütlesi', 'kg'],
      ['visceral_fat_level', 'İç organ yağı seviyesi', ''],
      ['body_water_pct', 'Vücut suyu', '%'],
      ['bone_mass_kg', 'Kemik kütlesi', 'kg'],
      ['bmr_kcal', 'Cihaz ölçümlü BMR', 'kcal'],
      ['waist_cm', 'Bel çevresi', 'cm'],
      ['hip_cm', 'Kalça çevresi', 'cm'],
    ];
    const describeMeasurement = (m: any, prev: any) =>
      measurementFields
        .filter(([key]) => m[key] !== null && m[key] !== undefined)
        .map(([key, label, unit]) => {
          const delta = prev && prev[key] !== null && prev[key] !== undefined ? Number(m[key]) - Number(prev[key]) : null;
          const deltaText = delta !== null && Math.abs(delta) >= 0.05
            ? ` (önceki ölçüme göre ${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}${unit})`
            : '';
          return `- ${label}: ${m[key]}${unit}${deltaText}`;
        })
        .join('\n');
    const measurementSection = measurements?.latest
      ? `\n\nSon vücut ölçümü (${measurements.latest.measured_at}${measurements.previous ? `, önceki: ${measurements.previous.measured_at}` : ''}):\n${describeMeasurement(measurements.latest, measurements.previous)}${measurements.latest.notes ? `\nÖlçüm notu: ${measurements.latest.notes}` : ''}\nBu ölçümleri (özellikle yağ oranı, kas kütlesi ve değişim yönü) analizinde mutlaka dikkate al.`
      : '';
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Sen bir metabolizma uzmanı ve beslenme danışmanısın. Türkçe yanıt ver.
Kullanıcının metabolik profilini analiz et ve what-if senaryolarını değerlendir.

Kullanıcı profili:
- Yaş: ${profile.age || 'Bilinmiyor'}
- Cinsiyet: ${profile.gender === 'male' ? 'Erkek' : profile.gender === 'female' ? 'Kadın' : 'Bilinmiyor'}
- Boy: ${profile.heightCm ? profile.heightCm + ' cm' : 'Bilinmiyor'}
- Mevcut Kilo: ${profile.currentWeight ? profile.currentWeight + ' kg' : 'Bilinmiyor'}
- Hedef Kilo: ${profile.targetWeight ? profile.targetWeight + ' kg' : 'Bilinmiyor'}
- Günlük Kalori Hedefi: ${profile.targetCalories} kcal
- Su Hedefi: ${profile.targetWaterMl} ml
- BMR: ${profile.bmr ? `${profile.bmr} kcal (${profile.bmrSource === 'measured' ? 'cihaz ölçümü' : profile.bmrSource === 'bodyFat' ? 'yağ oranından hesaplandı' : 'formülle hesaplandı'})` : 'Bilinmiyor'}

Son ${recentData?.length || 0} günlük ortalama veriler:
- Ortalama Kalori: ${recentData?.avgCalories || 0} kcal
- Ortalama Su: ${recentData?.avgWater || 0} ml
- Ortalama Egzersiz: ${recentData?.avgExercise || 0} dk
- Ortalama Kahve: ${recentData?.avgCoffee || 0} fincan
- Ortalama Çay: ${recentData?.avgTea || 0} fincan${measurementSection}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt + "\n\n" + scenario
              }
            ]
          }
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "what_if_result",
                description: "What-if senaryo analiz sonucu",
                parameters: {
                  type: "object",
                  properties: {
                    weeklyImpact: {
                      type: "object",
                      properties: {
                        calorieChange: { type: "number", description: "Haftalık kalori değişimi (kcal)" },
                        weightChange: { type: "number", description: "Tahmini haftalık kilo değişimi (kg, negatif=kayıp)" },
                      },
                      required: ["calorieChange", "weightChange"],
                    },
                    monthlyImpact: {
                      type: "object",
                      properties: {
                        weightChange: { type: "number", description: "Tahmini aylık kilo değişimi (kg)" },
                      },
                      required: ["weightChange"],
                    },
                    metabolicEffect: {
                      type: "string",
                      description: "Metabolizma üzerindeki etkinin kısa açıklaması (2-3 cümle)",
                    },
                    recommendation: {
                      type: "string",
                      description: "Kişiselleştirilmiş öneri (2-3 cümle)",
                    },
                    riskLevel: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                      description: "Risk seviyesi",
                    },
                  },
                  required: ["weeklyImpact", "monthlyImpact", "metabolicEffect", "recommendation", "riskLevel"],
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      const userMessage = response.status === 429
        ? "Gemini API rate limit aşıldı, lütfen birkaç saniye bekleyip tekrar deneyin."
        : response.status === 401 || response.status === 403
        ? "API anahtarı geçersiz. Lütfen GEMINI_API_KEY'i kontrol edin."
        : "Gemini API geçici hata döndürdü, lütfen tekrar deneyin.";
      return new Response(JSON.stringify({ error: userMessage }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find((part: any) => part.functionCall);

    if (functionCall?.functionCall?.args) {
      return new Response(JSON.stringify({ result: functionCall.functionCall.args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "AI yanıt üretemedi" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("metabolic-twin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
