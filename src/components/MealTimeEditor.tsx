import { useState } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MealTimeEditorProps {
  scheduledTime: string | null;
  onSave: (time: string) => void;
  onClear: () => void;
}

export const MealTimeEditor = ({ scheduledTime, onSave, onClear }: MealTimeEditorProps) => {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(scheduledTime || '');

  const handleSave = () => {
    if (time) {
      onSave(time);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onClear();
    setTime('');
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTime(scheduledTime || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
            scheduledTime
              ? 'text-primary bg-primary/10 hover:bg-primary/20'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Clock className="h-3 w-3" />
          {scheduledTime || 'Saat ekle'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Öğün Saati</p>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!time}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              Kaydet
            </Button>
            {scheduledTime && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
