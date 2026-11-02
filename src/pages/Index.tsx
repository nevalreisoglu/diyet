import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CalorieProgress } from '@/components/CalorieProgress';
import { QuickStats } from '@/components/QuickStats';
import { MealCard } from '@/components/MealCard';
import { AddFoodDialog } from '@/components/AddFoodDialog';
import { WaterTracker } from '@/components/WaterTracker';
import { BeverageTracker } from '@/components/BeverageTracker';
import { ExerciseTracker } from '@/components/ExerciseTracker';
import { AchievementBadges } from '@/components/AchievementBadges';
import { WeightForecast } from '@/components/WeightForecast';
import { useAuth } from '@/hooks/useAuth';
import { useNutritionData } from '@/hooks/useNutritionData';
import { useMealSchedules } from '@/hooks/useMealSchedules';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import { useWaterData } from '@/hooks/useWaterData';
import { useBeverageData } from '@/hooks/useBeverageData';
import { useExerciseData } from '@/hooks/useExerciseData';
import { useAchievements, AchievementType } from '@/hooks/useAchievements';
import { MealType } from '@/types/nutrition';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PremiumGate } from '@/components/PremiumGate';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack1', 'snack2', 'snack3'];

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
    addFoods,
    removeFood,
    getTotalCalories,
    getMealCalories,
    getMealFoods,
  } = useNutritionData(user?.id);

  const { getScheduleForMeal, updateSchedule, clearSchedule } = useMealSchedules(user?.id);
  const { customFoods } = useCustomFoods(user?.id);

  // Achievement tracking hooks
  const { waterIntake, targetWater } = useWaterData(user?.id);
  const { beverages } = useBeverageData(user?.id);
  const { duration: exerciseMinutes } = useExerciseData(user?.id);
  const { todayAchievements, checkAndAwardAchievements } = useAchievements(user?.id);
  const { isPremium, createCheckout } = useSubscriptionContext();

  // Calculate totalCalories early for use in achievements
  const totalCalories = getTotalCalories();
  const earnedAchievementTypes = todayAchievements.map(a => a.achievement_type as AchievementType);

  // Check achievements when relevant data changes
  const checkAchievements = useCallback(async () => {
    if (!user?.id || dataLoading) return;

    const currentEarned = todayAchievements.map(a => a.achievement_type);

    const newAchievements = await checkAndAwardAchievements({
      exerciseMinutes,
      currentCalories: totalCalories,
      targetCalories,
      waterIntake,
      targetWater,
      coffeeCount: beverages.coffee,
      teaCount: beverages.tea,
    });

    // Show toast for new achievements
    if (newAchievements && newAchievements.length > 0) {
      const achievementLabels: Record<AchievementType, string> = {
        exercise_goal: '🏆 Spor Yıldızı',
        calorie_goal: '🎯 Kalori Ustası',
        water_goal: '💧 Su Kahramanı',
        low_caffeine: '☕ Kafein Kontrolcüsü',
      };
      
      newAchievements.forEach((type) => {
        toast.success(`Tebrikler! ${achievementLabels[type]} rozetini kazandınız!`);
      });
    }
  }, [user?.id, dataLoading, exerciseMinutes, totalCalories, targetCalories, waterIntake, targetWater, beverages.coffee, beverages.tea, checkAndAwardAchievements, todayAchievements]);

  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

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

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-safe space-y-8">
        {/* Calorie Progress */}
        <CalorieProgress current={totalCalories} target={targetCalories} />

        {/* Quick Stats */}
        <QuickStats
          totalCalories={totalCalories}
          mealsLogged={meals.length}
          targetCalories={targetCalories}
        />

        {/* Achievements Section */}
        <PremiumGate
          isPremium={isPremium}
          createCheckout={createCheckout}
          featureLabel="Başarı Rozetleri"
          bullets={[
            'Günlük spor, kalori ve su hedeflerini takip et',
            'Her gün 4 farklı rozet kazanma şansı',
            'İlerlemenizi görsel olarak takip edin',
          ]}
        >
          <AchievementBadges earnedTypes={earnedAchievementTypes} />
        </PremiumGate>

        {/* AI Weight Forecast Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">AI Kilo Tahmini</h2>
          <PremiumGate
            isPremium={isPremium}
            createCheckout={createCheckout}
            featureLabel="AI Kilo Tahmini"
            bullets={[
              '90 günlük veriye dayalı tahminler',
              '1 hafta, 1 ay ve 3 aylık projeksiyonlar',
              'AI destekli model istatistikleri (R², EWMA)',
              'Hedefinize ulaşma süresi tahmini',
            ]}
          >
            <WeightForecast userId={user?.id} />
          </PremiumGate>
        </section>

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
                plannedFoods={customFoods.filter((f) => f.meal_type === mealType)}
                scheduledTime={getScheduleForMeal(mealType)}
                onAddFood={() => handleOpenAddFood(mealType)}
                onAddPlannedFoods={(list) => addFoods(mealType, list.map((f) => ({ name: f.name, calories: f.calories })))}
                onRemoveFood={(foodId) => removeFood(mealType, foodId)}
                onUpdateTime={(time) => updateSchedule(mealType, time)}
                onClearTime={() => clearSchedule(mealType)}
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
        userId={user?.id}
      />
    </div>
  );
};

export default Index;
