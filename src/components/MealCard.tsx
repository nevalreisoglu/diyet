import { Plus, X } from 'lucide-react';
import { MealType, mealTypeLabels, mealTypeIcons, FoodItem } from '@/types/nutrition';
import { Button } from '@/components/ui/button';
import { MealTimeEditor } from '@/components/MealTimeEditor';

interface MealCardProps {
  mealType: MealType;
  calories: number;
  foods: FoodItem[];
  scheduledTime?: string | null;
  onAddFood: () => void;
  onRemoveFood: (foodId: string) => void;
  onUpdateTime: (time: string) => void;
  onClearTime: () => void;
  delay?: number;
}

const mealColorClasses: Record<MealType, string> = {
  breakfast: 'bg-meal-breakfast/10 border-meal-breakfast/20',
  lunch: 'bg-meal-lunch/10 border-meal-lunch/20',
  dinner: 'bg-meal-dinner/10 border-meal-dinner/20',
  snack1: 'bg-meal-snack/10 border-meal-snack/20',
  snack2: 'bg-meal-snack/10 border-meal-snack/20',
  snack3: 'bg-meal-snack/10 border-meal-snack/20',
};

const mealIconBgClasses: Record<MealType, string> = {
  breakfast: 'bg-meal-breakfast/20',
  lunch: 'bg-meal-lunch/20',
  dinner: 'bg-meal-dinner/20',
  snack1: 'bg-meal-snack/20',
  snack2: 'bg-meal-snack/20',
  snack3: 'bg-meal-snack/20',
};

export const MealCard = ({
  mealType,
  calories,
  foods,
  scheduledTime,
  onAddFood,
  onRemoveFood,
  onUpdateTime,
  onClearTime,
  delay = 0,
}: MealCardProps) => {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-300 hover:shadow-card animate-slide-up ${mealColorClasses[mealType]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${mealIconBgClasses[mealType]}`}
          >
            {mealTypeIcons[mealType]}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {mealTypeLabels[mealType]}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{calories} kcal</p>
              <MealTimeEditor
                scheduledTime={scheduledTime || null}
                onSave={onUpdateTime}
                onClear={onClearTime}
              />
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
          onClick={onAddFood}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Food list */}
      {foods.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
          {foods.map((food) => (
            <div
              key={food.id}
              className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-xl group animate-scale-in"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {food.name}
                </p>
                <p className="text-xs text-muted-foreground">{food.calories} kcal</p>
              </div>
              <button
                onClick={() => onRemoveFood(food.id)}
                className="ml-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {foods.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Henüz yiyecek eklenmedi
        </p>
      )}
    </div>
  );
};
