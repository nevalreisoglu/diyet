import { useState } from 'react';
import { Header } from '@/components/Header';
import { CalorieProgress } from '@/components/CalorieProgress';
import { QuickStats } from '@/components/QuickStats';
import { MealCard } from '@/components/MealCard';
import { AddFoodDialog } from '@/components/AddFoodDialog';
import { useNutritionStore } from '@/hooks/useNutritionStore';
import { MealType } from '@/types/nutrition';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  const {
    meals,
    targetCalories,
    addFood,
    removeFood,
    getTotalCalories,
    getMealCalories,
    getMealFoods,
  } = useNutritionStore();

  const handleOpenAddFood = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setDialogOpen(true);
  };

  const handleAddFood = (mealType: MealType, food: { name: string; calories: number }) => {
    addFood(mealType, food);
  };

  const totalCalories = getTotalCalories();

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Calorie Progress */}
        <CalorieProgress current={totalCalories} target={targetCalories} />

        {/* Quick Stats */}
        <QuickStats
          totalCalories={totalCalories}
          mealsLogged={meals.length}
          targetCalories={targetCalories}
        />

        {/* Meals Section */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Öğünler</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {mealTypes.map((mealType, index) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                calories={getMealCalories(mealType)}
                foods={getMealFoods(mealType)}
                onAddFood={() => handleOpenAddFood(mealType)}
                onRemoveFood={(foodId) => removeFood(mealType, foodId)}
                delay={index * 100}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Add Food Dialog */}
      <AddFoodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mealType={selectedMealType}
        onAddFood={handleAddFood}
      />
    </div>
  );
};

export default Index;
