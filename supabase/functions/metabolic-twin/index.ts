import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scenario, profile, recentData } = await req.json();
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

Son ${recentData?.length || 0} günlük ortalama veriler:
- Ortalama Kalori: ${recentData?.avgCalories || 0} kcal
- Ortalama Su: ${recentData?.avgWater || 0} ml
- Ortalama Egzersiz: ${recentData?.avgExercise || 0} dk
- Ortalama Kahve: ${recentData?.avgCoffee || 0} fincan
- Ortalama Çay: ${recentData?.avgTea || 0} fincan`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "API anahtarı geçersiz. Lütfen GEMINI_API_KEY kontrol edin." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      throw new Error("Gemini API error");
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
