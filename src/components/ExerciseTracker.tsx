import { useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExerciseData } from '@/hooks/useExerciseData';
import { Progress } from '@/components/ui/progress';

interface ExerciseTrackerProps {
  userId: string | undefined;
}

export const ExerciseTracker = ({ userId }: ExerciseTrackerProps) => {
  const { duration, addExercise } = useExerciseData(userId);
  const [minutes, setMinutes] = useState('');

  const targetMinutes = 30; // Daily target
  const percentage = Math.min((duration / targetMinutes) * 100, 100);

  const handleAdd = () => {
    const mins = parseInt(minutes, 10);
    if (mins > 0) {
      addExercise(mins);
      setMinutes('');
    }
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} dk`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours} sa ${remaining} dk` : `${hours} sa`;
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-foreground">Spor</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {duration} / {targetMinutes} dk
        </span>
      </div>
      
      <Progress value={percentage} className="h-2 bg-secondary mb-3" />
      
      <div className="text-center mb-3">
        <span className="text-2xl font-bold text-foreground">{formatDuration(duration)}</span>
        <p className="text-xs text-muted-foreground">Bugünkü toplam</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Dakika"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="flex-1 h-9"
          min="1"
        />
        <Button 
          size="sm" 
          onClick={handleAdd} 
          disabled={!minutes || parseInt(minutes, 10) <= 0}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ekle
        </Button>
      </div>
    </div>
  );
};
