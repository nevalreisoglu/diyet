import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetabolicProfile, RecentMetrics } from '@/hooks/useMetabolicProfile';
import { Trophy, Droplets, Flame, Dumbbell, Coffee } from 'lucide-react';

interface Props {
  profile: MetabolicProfile | null;
  recentMetrics: RecentMetrics | null;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Mükemmel';
  if (score >= 75) return 'Çok İyi';
  if (score >= 60) return 'İyi';
  if (score >= 40) return 'Orta';
  return 'Geliştirilmeli';
};

export const MetabolicScoreCard = ({ profile, recentMetrics }: Props) => {
  if (!profile || !recentMetrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Skor hesaplamak için yeterli veri yok.
        </CardContent>
      </Card>
    );
  }

  // Calculate sub-scores
  const calorieDeviation = profile.targetCalories > 0
    ? Math.abs(recentMetrics.avgCalories - profile.targetCalories) / profile.targetCalories
    : 0;
  const calorieScore = Math.max(0, Math.round(100 - calorieDeviation * 200));

  const waterRatio = profile.targetWaterMl > 0 ? recentMetrics.avgWater / profile.targetWaterMl : 0;
  const waterScore = Math.min(100, Math.round(waterRatio * 100));

  const exerciseScore = Math.min(100, Math.round((recentMetrics.avgExercise / 30) * 100));

  const caffeineScore = (recentMetrics.avgCoffee + recentMetrics.avgTea) <= 4 ? 100 :
    Math.max(0, 100 - ((recentMetrics.avgCoffee + recentMetrics.avgTea - 4) * 20));

  const totalScore = Math.round(calorieScore * 0.35 + waterScore * 0.25 + exerciseScore * 0.25 + caffeineScore * 0.15);

  const breakdown = [
    { icon: Flame, label: 'Kalori Dengesi', score: calorieScore, weight: '35%' },
    { icon: Droplets, label: 'Hidrasyon', score: waterScore, weight: '25%' },
    { icon: Dumbbell, label: 'Egzersiz', score: exerciseScore, weight: '25%' },
    { icon: Coffee, label: 'Kafein Kontrolü', score: caffeineScore, weight: '15%' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Günlük Metabolik Skor
          </CardTitle>
          <CardDescription>Son {recentMetrics.daysTracked} günlük ortalama</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${totalScore * 3.14} 314`}
              />
            </svg>
            <div className="absolute text-center">
              <span className={`text-3xl font-bold ${getScoreColor(totalScore)}`}>{totalScore}</span>
              <p className="text-xs text-muted-foreground">{getScoreLabel(totalScore)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skor Dağılımı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdown.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">({item.weight})</span>
                </div>
                <span className={`font-semibold ${getScoreColor(item.score)}`}>{item.score}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
