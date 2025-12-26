import { useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExerciseData } from '@/hooks/useExerciseData';

interface ExerciseTrackerProps {
  userId: string | undefined;
}

export const ExerciseTracker = ({ userId }: ExerciseTrackerProps) => {
  const { duration, addExercise } = useExerciseData(userId);
  const [minutes, setMinutes] = useState('');

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
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="h-5 w-5 text-green-600" />
          <h3 className="font-medium text-foreground">Günlük Spor</h3>
        </div>

        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-foreground">{formatDuration(duration)}</span>
          <p className="text-xs text-muted-foreground">Bugünkü toplam</p>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Dakika"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="flex-1"
            min="1"
          />
          <Button size="sm" onClick={handleAdd} disabled={!minutes || parseInt(minutes, 10) <= 0}>
            <Plus className="h-4 w-4 mr-1" />
            Ekle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
