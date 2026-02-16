import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MetabolicProfile, RecentMetrics } from '@/hooks/useMetabolicProfile';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  profile: MetabolicProfile | null;
  recentMetrics: RecentMetrics | null;
  userId: string;
}

interface SimResult {
  weeklyImpact: { calorieChange: number; weightChange: number };
  monthlyImpact: { weightChange: number };
  metabolicEffect: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const presetScenarios = [
  { label: 'Günde 500 kcal azaltsam?', scenario: 'Günlük kalori alımımı 500 kcal azaltsam metabolizmam ve kilom nasıl etkilenir?' },
  { label: 'Haftada 5 gün spor yapsam?', scenario: 'Haftada 5 gün 45 dakika orta yoğunlukta egzersiz yapsam ne olur?' },
  { label: 'Kahveyi bıraksam?', scenario: 'Kahve içmeyi tamamen bıraksam metabolizmam nasıl etkilenir?' },
  { label: 'Günde 3L su içsem?', scenario: 'Günlük su tüketimimi 3 litreye çıkarsam ne olur?' },
];

export const WhatIfSimulator = ({ profile, recentMetrics, userId }: Props) => {
  const [customScenario, setCustomScenario] = useState('');
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async (scenario: string) => {
    if (!profile) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('metabolic-twin', {
        body: {
          scenario,
          profile: {
            age: profile.age,
            gender: profile.gender,
            heightCm: profile.heightCm,
            currentWeight: profile.currentWeight,
            targetWeight: profile.targetWeight,
            targetCalories: profile.targetCalories,
            targetWaterMl: profile.targetWaterMl,
          },
          recentData: recentMetrics ? {
            avgCalories: recentMetrics.avgCalories,
            avgWater: recentMetrics.avgWater,
            avgExercise: recentMetrics.avgExercise,
            avgCoffee: recentMetrics.avgCoffee,
            avgTea: recentMetrics.avgTea,
            length: recentMetrics.daysTracked,
          } : null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      console.error('Simulation error:', err);
      toast.error('Simülasyon yapılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const riskConfig = {
    low: { icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-200', label: 'Düşük Risk' },
    medium: { icon: Info, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', label: 'Orta Risk' },
    high: { icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-200', label: 'Yüksek Risk' },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            What-If Simülatörü
          </CardTitle>
          <CardDescription>Bir senaryo seçin veya kendi senaryonuzu yazın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presetScenarios.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2"
                onClick={() => runSimulation(p.scenario)}
                disabled={loading}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Özel Senaryo</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Örn: Her gün 10.000 adım atsam..."
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customScenario.trim() && runSimulation(customScenario)}
              />
              <Button
                onClick={() => customScenario.trim() && runSimulation(customScenario)}
                disabled={loading || !customScenario.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simüle Et'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">AI simülasyon çalıştırılıyor...</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simülasyon Sonuçları</CardTitle>
            <div>
              {(() => {
                const risk = riskConfig[result.riskLevel];
                const RiskIcon = risk.icon;
                return (
                  <Badge variant="outline" className={risk.color}>
                    <RiskIcon className="h-3 w-3 mr-1" />
                    {risk.label}
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Haftalık Kilo</p>
                <div className="flex items-center gap-1">
                  {result.weeklyImpact.weightChange < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : result.weeklyImpact.weightChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg font-bold">
                    {result.weeklyImpact.weightChange > 0 ? '+' : ''}{result.weeklyImpact.weightChange} kg
                  </span>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Aylık Kilo</p>
                <div className="flex items-center gap-1">
                  {result.monthlyImpact.weightChange < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : result.monthlyImpact.weightChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg font-bold">
                    {result.monthlyImpact.weightChange > 0 ? '+' : ''}{result.monthlyImpact.weightChange} kg
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Metabolik Etki</p>
              <p className="text-sm text-muted-foreground">{result.metabolicEffect}</p>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 space-y-2 border border-primary/20">
              <p className="text-sm font-medium text-foreground">💡 Öneri</p>
              <p className="text-sm text-muted-foreground">{result.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
