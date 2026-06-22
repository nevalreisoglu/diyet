import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType, FoodItem } from '@/types/nutrition';
import { useToast } from '@/hooks/use-toast';

interface MealWithFoods {
  id: string;
  meal_type: MealType;
  foods: FoodItem[];
}

export const useNutritionData = (userId: string | undefined) => {
  const [meals, setMeals] = useState<MealWithFoods[]>([]);
  const [targetCalories, setTargetCalories] = useState(1500);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const fetchMeals = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('id, meal_type, food_items(id, name, calories, protein, carbs, fat)')
        .eq('user_id', userId)
        .eq('meal_date', today);

      if (mealsError) throw mealsError;

      const formattedMeals: MealWithFoods[] = (mealsData || []).map((meal) => ({
        id: meal.id,
        meal_type: meal.meal_type as MealType,
        foods: (meal.food_items || []).map((food: any) => ({
          id: food.id,
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        })),
      }));

      setMeals(formattedMeals);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('target_calories')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data?.target_calories) {
        setTargetCalories(data.target_calories);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchMeals();
    fetchProfile();
  }, [fetchMeals, fetchProfile]);

  const addFood = useCallback(
    async (mealType: MealType, food: { name: string; calories: number }) => {
      if (!userId) return;

      try {
        // Check if meal exists for today
        let mealId: string;
        const existingMeal = meals.find((m) => m.meal_type === mealType);

        if (existingMeal) {
          mealId = existingMeal.id;
        } else {
          // Create new meal
          const { data: newMeal, error: mealError } = await supabase
            .from('meals')
            .insert({
              user_id: userId,
              meal_type: mealType,
              meal_date: today,
            })
            .select('id')
            .single();

          if (mealError) throw mealError;
          mealId = newMeal.id;
        }

        // Add food item
        const { error: foodError } = await supabase.from('food_items').insert({
          meal_id: mealId,
          name: food.name,
          calories: food.calories,
        });

        if (foodError) throw foodError;

        await fetchMeals();

        toast({
          title: 'Eklendi',
          description: `${food.name} eklendi.`,
        });
      } catch (error) {
        console.error('Error adding food:', error);
        toast({
          title: 'Hata',
          description: 'Yiyecek eklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, meals, today, toast, fetchMeals]
  );

  const removeFood = useCallback(
    async (mealType: MealType, foodId: string) => {
      try {
        const { error } = await supabase
          .from('food_items')
          .delete()
          .eq('id', foodId);

        if (error) throw error;

        await fetchMeals();

        toast({
          title: 'Silindi',
          description: 'Yiyecek silindi.',
        });
      } catch (error) {
        console.error('Error removing food:', error);
        toast({
          title: 'Hata',
          description: 'Yiyecek silinirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [toast, fetchMeals]
  );

  const getTotalCalories = useCallback(() => {
    return meals.reduce(
      (total, meal) =>
        total + meal.foods.reduce((mealTotal, food) => mealTotal + food.calories, 0),
      0
    );
  }, [meals]);

  const getMealCalories = useCallback(
    (mealType: MealType) => {
      const meal = meals.find((m) => m.meal_type === mealType);
      if (!meal) return 0;
      return meal.foods.reduce((total, food) => total + food.calories, 0);
    },
    [meals]
  );

  const getMealFoods = useCallback(
    (mealType: MealType) => {
      const meal = meals.find((m) => m.meal_type === mealType);
      return meal?.foods || [];
    },
    [meals]
  );

  return {
    meals,
    targetCalories,
    loading,
    addFood,
    removeFood,
    getTotalCalories,
    getMealCalories,
    getMealFoods,
  };
};
