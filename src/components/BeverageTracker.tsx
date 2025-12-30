import { Coffee, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBeverageData } from '@/hooks/useBeverageData';

interface BeverageTrackerProps {
  userId: string | undefined;
}

export const BeverageTracker = ({ userId }: BeverageTrackerProps) => {
  const { beverages, addBeverage, removeBeverage } = useBeverageData(userId);

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
          <Coffee className="h-4 w-4 text-amber-600" />
        </div>
        <span className="font-medium text-foreground">Kahve & Çay</span>
      </div>

      {/* Coffee */}
      <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">☕</span>
          <span className="text-sm font-medium text-foreground">Kahve</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => removeBeverage('coffee')}
            disabled={beverages.coffee <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-bold text-lg">{beverages.coffee}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => addBeverage('coffee')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tea */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍵</span>
          <span className="text-sm font-medium text-foreground">Çay</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => removeBeverage('tea')}
            disabled={beverages.tea <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-bold text-lg">{beverages.tea}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => addBeverage('tea')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
