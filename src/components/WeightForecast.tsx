import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useWeightForecast, WeightForecast as ForecastType, GoalProgress, RuleBasedForecast, ModelInfo } from '@/hooks/useWeightForecast';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Brain, 
  RefreshCw, 
  Lightbulb, 
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Activity,
  Info
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WeightForecastProps {
  userId: string | undefined;
}

const DirectionIcon = ({ direction }: { direction: 'loss' | 'gain' | 'stable' }) => {
  switch (direction) {
    case 'loss':
      return <TrendingDown className="h-5 w-5 text-green-500" />;
    case 'gain':
      return <TrendingUp className="h-5 w-5 text-orange-500" />;
    default:
      return <Minus className="h-5 w-5 text-muted-foreground" />;
  }
};

const DirectionBadge = ({ direction, kg }: { direction: 'loss' | 'gain' | 'stable'; kg: number }) => {
  if (direction === 'stable') {
    return <Badge variant="secondary">Stabil</Badge>;
  }
  
  const colorClass = direction === 'loss' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  const text = direction === 'loss' ? `${kg} kg kayıp` : `${kg} kg artış`;
  
  return <Badge className={colorClass}>{text}</Badge>;
};

const ConfidenceBadge = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const config = {
    low: { label: 'Düşük Güven', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    medium: { label: 'Orta Güven', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    high: { label: 'Yüksek Güven', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  };
  
  return <Badge className={config[level].className}>{config[level].label}</Badge>;
};

const ForecastCard = ({ 
  title, 
  forecast 
}: { 
  title: string; 
  forecast: { kg: number; direction: 'loss' | 'gain' | 'stable' };
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2">
      <DirectionIcon direction={forecast.direction} />
      <span className="font-medium text-sm">{title}</span>
    </div>
    <DirectionBadge direction={forecast.direction} kg={forecast.kg} />
  </div>
);

const GoalProgressCard = ({ goalProgress }: { goalProgress: GoalProgress }) => {
  const weightDiff = goalProgress.currentWeight - goalProgress.targetWeight;
  const isLosing = weightDiff > 0;
  const progressPercent = Math.min(100, Math.max(0, 
    isLosing 
      ? ((goalProgress.currentWeight - goalProgress.targetWeight) / goalProgress.currentWeight) * 100
      : ((goalProgress.targetWeight - goalProgress.currentWeight) / goalProgress.targetWeight) * 100
  ));
  
  const formatWeeks = (weeks: number | null) => {
    if (weeks === null) return 'Hesaplanamadı';
    if (weeks <= 4) return `${weeks} hafta`;
    const months = Math.round(weeks / 4.33);
    return months === 1 ? '~1 ay' : `~${months} ay`;
  };

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <span className="font-medium">Hedef Takibi</span>
        </div>
        {goalProgress.isOnTrack ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Yolda
          </Badge>
        ) : (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <XCircle className="h-3 w-3 mr-1" />
            Hedefe Uymayan
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Mevcut</p>
          <p className="text-lg font-semibold">{goalProgress.currentWeight} kg</p>
        </div>
        <div>
          <p className="text-muted-foreground">Hedef</p>
          <p className="text-lg font-semibold">{goalProgress.targetWeight} kg</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isLosing ? 'Verilecek' : 'Alınacak'}: {Math.abs(weightDiff).toFixed(1)} kg</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
        <Progress value={100 - progressPercent} className="h-2" />
      </div>

      {goalProgress.estimatedWeeksToGoal !== null && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Tahmini süre: <strong>{formatWeeks(goalProgress.estimatedWeeksToGoal)}</strong></span>
        </div>
      )}

      {goalProgress.weeklyRequired !== undefined && goalProgress.dailyCalorieChange !== undefined && (
        <div className="pt-2 border-t border-primary/20 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3" />
            <span>Haftalık gerekli: <strong className="text-foreground">{Math.abs(goalProgress.weeklyRequired).toFixed(2)} kg/{isLosing ? 'kayıp' : 'artış'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Günlük kalori {isLosing ? 'açığı' : 'fazlası'}: <strong className="text-foreground">{Math.abs(goalProgress.dailyCalorieChange).toFixed(0)} kcal</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export const WeightForecast = ({ userId }: WeightForecastProps) => {
  const { forecast, ruleBasedForecast, modelInfo, loading, error, dataPointCount, fetchForecast } = useWeightForecast(userId);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (userId && !hasLoaded) {
      fetchForecast();
      setHasLoaded(true);
    }
  }, [userId, fetchForecast, hasLoaded]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Kilo Tahmini</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchForecast}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Kilo Tahmini</CardTitle>
            </div>
          </div>
          <CardDescription>Geçmiş verilerinizi analiz ederek kilo değişim tahmini yapın</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchForecast} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Tahmin Oluştur
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Kilo Tahmini</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge level={forecast.confidenceLevel} />
            <Button variant="ghost" size="icon" onClick={fetchForecast} title="Yenile">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>{dataPointCount} günlük veriye dayalı tahmin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Progress */}
        {forecast.goalProgress && (
          <GoalProgressCard goalProgress={forecast.goalProgress} />
        )}

        {/* Comparison Table */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Model Karşılaştırması</div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium">Dönem</th>
                  <th className="text-center p-2 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Brain className="h-3 w-3" />
                      <span>Prediktif</span>
                    </div>
                  </th>
                  <th className="text-center p-2 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Scale className="h-3 w-3" />
                      <span>Kural Tabanlı</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '1 Hafta', pred: forecast.weeklyForecast, rule: ruleBasedForecast?.weeklyForecast },
                  { label: '1 Ay', pred: forecast.monthlyForecast, rule: ruleBasedForecast?.monthlyForecast },
                  { label: '3 Ay', pred: forecast.threeMonthForecast, rule: ruleBasedForecast?.threeMonthForecast },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-muted/30">
                    <td className="p-2 font-medium">{row.label}</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <DirectionIcon direction={row.pred.direction} />
                        <DirectionBadge direction={row.pred.direction} kg={row.pred.kg} />
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {row.rule ? (
                        <div className="flex items-center justify-center gap-1">
                          <DirectionIcon direction={row.rule.direction} />
                          <DirectionBadge direction={row.rule.direction} kg={row.rule.kg} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ruleBasedForecast && (
            <p className="text-xs text-muted-foreground">
              Kural tabanlı: Ort. günlük denge ({ruleBasedForecast.avgDailyBalance} kcal) × 7700 kcal/kg sabit formülü. 
              Prediktif: Ağırlıklı regresyon + EWMA momentum blend modeli.
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground">{forecast.summary}</p>
        </div>

        {/* Collapsible Insights & Recommendations */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm">Detaylı Analiz</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Model Statistics */}
            {modelInfo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>Model İstatistikleri</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">R² (Açıklayıcılık)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{(modelInfo.r2 * 100).toFixed(1)}%</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {modelInfo.r2 > 0.5 ? 'Güçlü' : modelInfo.r2 > 0.3 ? 'Orta' : 'Zayıf'}
                      </Badge>
                    </div>
                    <Progress value={modelInfo.r2 * 100} className="h-1" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">Trend Eğimi</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{modelInfo.trendSlope > 0 ? '+' : ''}{modelInfo.trendSlope.toFixed(1)} kcal/gün</p>
                      {modelInfo.trendSlope > 5 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                      ) : modelInfo.trendSlope < -5 ? (
                        <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">EWMA Momentum</p>
                    <p className="text-sm font-semibold">{modelInfo.ewmaLatest > 0 ? '+' : ''}{modelInfo.ewmaLatest} kcal</p>
                    <p className="text-[10px] text-muted-foreground">
                      {modelInfo.ewmaLatest > 100 ? 'Belirgin fazla' : modelInfo.ewmaLatest < -100 ? 'Belirgin açık' : 'Dengede'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">Model Tipi</p>
                    <p className="text-sm font-semibold">
                      {modelInfo.type === 'predictive_blend' ? 'Hibrit Blend' : 'Fallback'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Regresyon + EWMA</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/30 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    R², modelin verilerinizi ne kadar iyi açıkladığını gösterir. Trend eğimi günlük enerji dengesinin artış/azalış yönünü, EWMA ise son günlerdeki kısa vadeli momentumu yansıtır.
                  </p>
                </div>
              </div>
            )}

            {/* Difference Analysis */}
            {ruleBasedForecast && forecast && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Model Fark Analizi</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: '1 Hafta', pred: forecast.weeklyForecast, rule: ruleBasedForecast.weeklyForecast },
                    { label: '1 Ay', pred: forecast.monthlyForecast, rule: ruleBasedForecast.monthlyForecast },
                    { label: '3 Ay', pred: forecast.threeMonthForecast, rule: ruleBasedForecast.threeMonthForecast },
                  ].map((row) => {
                    const predKg = row.pred.direction === 'loss' ? -row.pred.kg : row.pred.direction === 'gain' ? row.pred.kg : 0;
                    const ruleKg = row.rule.direction === 'loss' ? -row.rule.kg : row.rule.direction === 'gain' ? row.rule.kg : 0;
                    const diff = predKg - ruleKg;
                    return (
                      <div key={row.label} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className={`font-semibold ${Math.abs(diff) < 0.05 ? 'text-muted-foreground' : diff > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)} kg fark
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pozitif fark: Prediktif model, kural tabanlıya göre daha fazla kilo artışı öngörüyor. Negatif fark: Daha fazla kayıp öngörüyor.
                </p>
              </div>
            )}

            {/* Insights */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                <span>İçgörüler</span>
              </div>
              <ul className="space-y-1">
                {forecast.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Öneriler</span>
              </div>
              <ul className="space-y-1">
                {forecast.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
