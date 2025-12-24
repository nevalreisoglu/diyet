import { Droplets, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWaterData } from '@/hooks/useWaterData';
import { Progress } from '@/components/ui/progress';

interface WaterTrackerProps {
  userId: string | undefined;
  compact?: boolean;
}

export const WaterTracker = ({ userId, compact = false }: WaterTrackerProps) => {
  const { waterIntake, targetWater, addWater, removeWater, percentage } = useWaterData(userId);

  if (compact) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Droplets className="h-4 w-4 text-blue-500" />
            </div>
            <span className="font-medium text-foreground">Su</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {waterIntake} / {targetWater} ml
          </span>
        </div>
        <Progress value={percentage} className="h-2 bg-secondary" />
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeWater()}
            disabled={waterIntake <= 0}
            className="flex-1"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => addWater(250)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            250ml
          </Button>
        </div>
      </div>
    );
  }

  const glasses = Math.floor(waterIntake / 250);
  const maxGlasses = Math.ceil(targetWater / 250);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Droplets className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Su Takibi</h3>
            <p className="text-sm text-muted-foreground">Günlük hedef: {targetWater} ml</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{waterIntake}</p>
          <p className="text-sm text-muted-foreground">ml</p>
        </div>
      </div>

      <Progress value={percentage} className="h-3 bg-secondary mb-4" />

      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: maxGlasses }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-10 rounded-lg flex items-center justify-center transition-colors ${
              i < glasses
                ? 'bg-blue-500 text-white'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            <Droplets className="h-4 w-4" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => removeWater()}
          disabled={waterIntake <= 0}
          className="flex-1"
        >
          <Minus className="h-4 w-4 mr-2" />
          Çıkar
        </Button>
        <Button
          onClick={() => addWater(250)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          1 Bardak (250ml)
        </Button>
      </div>
    </div>
  );
};
