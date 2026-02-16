import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetabolicProfile, RecentMetrics } from '@/hooks/useMetabolicProfile';
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  profile: MetabolicProfile | null;
  recentMetrics: RecentMetrics | null;
}

interface Insight {
  icon: typeof TrendingUp;
  title: string;
  text: string;
  type: 'positive' | 'warning' | 'info';
}

export const MetabolicInsights = ({ profile, recentMetrics }: Props) => {
  if (!profile || !recentMetrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Analiz için yeterli veri yok.
        </CardContent>
      </Card>
    );
  }

  const insights: Insight[] = [];

  // Calorie balance analysis
  const calorieBalance = recentMetrics.avgCalories - profile.targetCalories;
  if (calorieBalance > 200) {
    insights.push({
      icon: TrendingUp,
      title: 'Kalori Fazlası',
      text: `Günlük ortalama ${Math.round(calorieBalance)} kcal fazla alıyorsunuz. Bu hızla ayda yaklaşık ${Math.round((calorieBalance * 30) / 7700 * 10) / 10} kg alabilirsiniz.`,
      type: 'warning',
    });
  } else if (calorieBalance < -300) {
    insights.push({
      icon: TrendingDown,
      title: 'Kalori Açığı',
      text: `Günlük ortalama ${Math.round(Math.abs(calorieBalance))} kcal açık var. Bu hızla ayda yaklaşık ${Math.round((Math.abs(calorieBalance) * 30) / 7700 * 10) / 10} kg verebilirsiniz.`,
      type: 'positive',
    });
  } else {
    insights.push({
      icon: CheckCircle2,
      title: 'Kalori Dengesi',
      text: 'Kalori alımınız hedefinize çok yakın. Harika iş!',
      type: 'positive',
    });
  }

  // BMR vs intake
  if (profile.bmr && recentMetrics.avgCalories < profile.bmr * 0.8) {
    insights.push({
      icon: AlertCircle,
      title: 'Düşük Kalori Uyarısı',
      text: `Ortalama kalori alımınız BMR'nizin (${profile.bmr} kcal) altında. Bu metabolizmanızı yavaşlatabilir.`,
      type: 'warning',
    });
  }

  // Water
  const waterRatio = recentMetrics.avgWater / profile.targetWaterMl;
  if (waterRatio < 0.6) {
    insights.push({
      icon: AlertCircle,
      title: 'Yetersiz Hidrasyon',
      text: `Su hedefinizin sadece %${Math.round(waterRatio * 100)}'ini karşılıyorsunuz. Dehidrasyon metabolizmayı %3-5 yavaşlatabilir.`,
      type: 'warning',
    });
  } else if (waterRatio >= 0.9) {
    insights.push({
      icon: CheckCircle2,
      title: 'Harika Hidrasyon',
      text: 'Su tüketiminiz hedefin üzerinde. Metabolizmanız optimum çalışıyor.',
      type: 'positive',
    });
  }

  // Exercise
  if (recentMetrics.avgExercise < 15) {
    insights.push({
      icon: AlertCircle,
      title: 'Egzersiz Eksikliği',
      text: 'Günlük ortalama egzersiziniz 15 dakikanın altında. Haftada 150 dk orta yoğunluk önerilir.',
      type: 'warning',
    });
  } else if (recentMetrics.avgExercise >= 30) {
    insights.push({
      icon: CheckCircle2,
      title: 'Aktif Yaşam',
      text: `Günlük ortalama ${recentMetrics.avgExercise} dk egzersiz yapıyorsunuz. Bu TDEE'nizi yaklaşık ${Math.round(recentMetrics.avgExercise * 6)} kcal artırıyor.`,
      type: 'positive',
    });
  }

  // TDEE estimation
  if (profile.tdee) {
    const adjustedTdee = profile.tdee + Math.round(recentMetrics.avgExercise * 5);
    insights.push({
      icon: Brain,
      title: 'Tahmini TDEE',
      text: `Egzersiz düzeyinize göre günlük tahmini enerji harcamanız ~${adjustedTdee} kcal. ${recentMetrics.avgCalories > adjustedTdee ? 'Kalori fazlanız var.' : 'Kalori açığındasınız.'}`,
      type: 'info',
    });
  }

  const typeStyles = {
    positive: 'border-l-green-500 bg-green-500/5',
    warning: 'border-l-yellow-500 bg-yellow-500/5',
    info: 'border-l-blue-500 bg-blue-500/5',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Metabolik Analiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className={`border-l-4 rounded-r-xl p-4 ${typeStyles[insight.type]}`}>
            <div className="flex items-center gap-2 mb-1">
              <insight.icon className="h-4 w-4" />
              <span className="font-medium text-sm text-foreground">{insight.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{insight.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
