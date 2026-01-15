import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CalorieProgress } from '@/components/CalorieProgress';
import { QuickStats } from '@/components/QuickStats';
import { MealCard } from '@/components/MealCard';
import { AddFoodDialog } from '@/components/AddFoodDialog';
import { WaterTracker } from '@/components/WaterTracker';
import { PdfUploader } from '@/components/PdfUploader';
import { BeverageTracker } from '@/components/BeverageTracker';
import { ExerciseTracker } from '@/components/ExerciseTracker';
import { useAuth } from '@/hooks/useAuth';
import { useNutritionData } from '@/hooks/useNutritionData';
import { useMealSchedules } from '@/hooks/useMealSchedules';
import { MealType } from '@/types/nutrition';
import { Loader2 } from 'lucide-react';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const navigate = useNavigate();
  
  const { user, loading: authLoading } = useAuth();
  
  const {
    meals,
    targetCalories,
    loading: dataLoading,
    addFood,
    removeFood,
    getTotalCalories,
    getMealCalories,
    getMealFoods,
  } = useNutritionData(user?.id);

  const { schedules, getScheduleForMeal, refetch: refetchSchedules } = useMealSchedules(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleOpenAddFood = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setDialogOpen(true);
  };

  const handleAddFood = (mealType: MealType, food: { name: string; calories: number }) => {
    addFood(mealType, food);
  };

  const totalCalories = getTotalCalories();

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Calorie Progress */}
        <CalorieProgress current={totalCalories} target={targetCalories} />

        {/* Quick Stats */}
        <QuickStats
          totalCalories={totalCalories}
          mealsLogged={meals.length}
          targetCalories={targetCalories}
        />

        {/* Trackers Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Günlük Takip</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <WaterTracker userId={user?.id} compact />
            <BeverageTracker userId={user?.id} />
            <ExerciseTracker userId={user?.id} />
          </div>
        </section>

        {/* Meals Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Öğünler</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {mealTypes.map((mealType, index) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                calories={getMealCalories(mealType)}
                foods={getMealFoods(mealType)}
                scheduledTime={getScheduleForMeal(mealType)}
                onAddFood={() => handleOpenAddFood(mealType)}
                onRemoveFood={(foodId) => removeFood(mealType, foodId)}
                delay={index * 100}
              />
            ))}
          </div>
        </section>

        {/* PDF Uploader - Full Width */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Yiyecek Listem</h2>
          <PdfUploader userId={user?.id} onSchedulesUpdated={refetchSchedules} />
        </section>
      </main>

      {/* Add Food Dialog */}
      <AddFoodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mealType={selectedMealType}
        onAddFood={handleAddFood}
        userId={user?.id}
      />
    </div>
  );
};

export default Index;
