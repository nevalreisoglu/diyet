import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useWeightForecast, WeightForecast as ForecastType, GoalProgress } from '@/hooks/useWeightForecast';
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
  Zap
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
  const { forecast, loading, error, dataPointCount, fetchForecast } = useWeightForecast(userId);
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

        {/* Forecast Cards */}
        <div className="space-y-2">
          <ForecastCard title="1 Hafta" forecast={forecast.weeklyForecast} />
          <ForecastCard title="1 Ay" forecast={forecast.monthlyForecast} />
          <ForecastCard title="3 Ay" forecast={forecast.threeMonthForecast} />
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
