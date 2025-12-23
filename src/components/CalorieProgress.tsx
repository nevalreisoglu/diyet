import { useMemo } from 'react';

interface CalorieProgressProps {
  current: number;
  target: number;
}

export const CalorieProgress = ({ current, target }: CalorieProgressProps) => {
  const percentage = useMemo(() => {
    return Math.min((current / target) * 100, 100);
  }, [current, target]);

  const remaining = target - current;
  const isOverLimit = remaining < 0;

  return (
    <div className="relative bg-card rounded-2xl p-6 shadow-card animate-fade-in overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Günlük Kalori</h2>
            <p className="text-sm text-muted-foreground">Bugünkü hedefiniz</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-foreground">{current}</span>
            <span className="text-muted-foreground"> / {target}</span>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-secondary rounded-full overflow-hidden mb-3">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Remaining calories */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {percentage.toFixed(0)}% tamamlandı
          </span>
          <span
            className={`text-sm font-medium ${
              isOverLimit ? 'text-destructive' : 'text-primary'
            }`}
          >
            {isOverLimit
              ? `${Math.abs(remaining)} kcal fazla`
              : `${remaining} kcal kaldı`}
          </span>
        </div>
      </div>
    </div>
  );
};
