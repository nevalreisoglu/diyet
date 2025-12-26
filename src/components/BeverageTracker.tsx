import { Coffee, Minus, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBeverageData } from '@/hooks/useBeverageData';

interface BeverageTrackerProps {
  userId: string | undefined;
}

export const BeverageTracker = ({ userId }: BeverageTrackerProps) => {
  const { beverages, addBeverage, removeBeverage } = useBeverageData(userId);

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="h-5 w-5 text-amber-600" />
          <h3 className="font-medium text-foreground">Kahve & Çay</h3>
        </div>

        {/* Coffee */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Kahve</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeBeverage('coffee')}
              disabled={beverages.coffee <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center font-medium">{beverages.coffee}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => addBeverage('coffee')}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Tea */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Çay</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeBeverage('tea')}
              disabled={beverages.tea <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center font-medium">{beverages.tea}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => addBeverage('tea')}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
