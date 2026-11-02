import { Flame, Target, TrendingUp, ListChecks } from 'lucide-react';

interface QuickStatsProps {
  totalCalories: number;
  mealsLogged: number;
  targetCalories: number;
  adherence?: { done: number; planned: number; pct: number } | null;
}

export const QuickStats = ({ totalCalories, mealsLogged, targetCalories, adherence }: QuickStatsProps) => {
  const percentage = Math.round((totalCalories / targetCalories) * 100);
  const showAdherence = !!adherence && adherence.planned > 0;

  const stats = [
    {
      icon: Flame,
      label: 'Kalori',
      value: totalCalories,
      suffix: 'kcal',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Target,
      label: 'Hedef',
      value: percentage,
      suffix: '%',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: TrendingUp,
      label: 'Öğün',
      value: mealsLogged,
      suffix: 'adet',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    ...(showAdherence
      ? [{
          icon: ListChecks,
          label: `Liste uyumu (${adherence!.done}/${adherence!.planned})`,
          value: adherence!.pct,
          suffix: '%',
          color: adherence!.pct >= 80 ? 'text-success' : 'text-primary',
          bgColor: adherence!.pct >= 80 ? 'bg-success/10' : 'bg-primary/10',
        }]
      : []),
  ];

  return (
    <div className={`grid gap-3 ${showAdherence ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl p-3 shadow-card animate-slide-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center mb-2`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="text-xl font-bold text-foreground">
            {stat.value}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {stat.suffix}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};
