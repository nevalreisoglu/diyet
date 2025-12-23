import { Flame, Target, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
  totalCalories: number;
  mealsLogged: number;
  targetCalories: number;
}

export const QuickStats = ({ totalCalories, mealsLogged, targetCalories }: QuickStatsProps) => {
  const percentage = Math.round((totalCalories / targetCalories) * 100);

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
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
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
