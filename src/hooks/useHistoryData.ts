import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType } from '@/types/nutrition';

interface DayData {
  date: string;
  totalCalories: number;
  targetCalories: number;
  totalWater: number;
  targetWater: number;
  totalExercise: number;
  meals: {
    type: MealType;
    calories: number;
    foods: { id: string; name: string; calories: number }[];
  }[];
}

export const useHistoryData = (userId: string | undefined, days: number = 7) => {
  const [history, setHistory] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    try {
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days + 1);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch profile for targets
      const { data: profile } = await supabase
        .from('profiles')
        .select('target_calories, target_water_ml')
        .eq('user_id', userId)
        .maybeSingle();

      const targetCalories = profile?.target_calories || 2000;
      const targetWater = profile?.target_water_ml || 2000;

      // Fetch meals with foods
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('id, meal_type, meal_date, food_items(id, name, calories)')
        .eq('user_id', userId)
        .gte('meal_date', startDateStr)
        .lte('meal_date', endDateStr)
        .order('meal_date', { ascending: false });

      if (mealsError) throw mealsError;

      // Fetch water intake
      const { data: waterData, error: waterError } = await supabase
        .from('water_intake')
        .select('intake_date, amount_ml')
        .eq('user_id', userId)
        .gte('intake_date', startDateStr)
        .lte('intake_date', endDateStr);

      if (waterError) throw waterError;

      // Fetch exercise log
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercise_log')
        .select('exercise_date, duration_minutes')
        .eq('user_id', userId)
        .gte('exercise_date', startDateStr)
        .lte('exercise_date', endDateStr);

      if (exerciseError) throw exerciseError;

      // Group by date
      const dateMap = new Map<string, DayData>();

      // Initialize all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, {
          date: dateStr,
          totalCalories: 0,
          targetCalories,
          totalWater: 0,
          targetWater,
          totalExercise: 0,
          meals: [],
        });
      }

      // Process meals
      (mealsData || []).forEach((meal) => {
        const dayData = dateMap.get(meal.meal_date);
        if (dayData) {
          const foods = (meal.food_items || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            calories: f.calories,
          }));
          const mealCalories = foods.reduce((sum, f) => sum + f.calories, 0);

          dayData.meals.push({
            type: meal.meal_type as MealType,
            calories: mealCalories,
            foods,
          });
          dayData.totalCalories += mealCalories;
        }
      });

      // Process water
      (waterData || []).forEach((water) => {
        const dayData = dateMap.get(water.intake_date);
        if (dayData) {
          dayData.totalWater += water.amount_ml;
        }
      });

      // Process exercise
      (exerciseData || []).forEach((exercise) => {
        const dayData = dateMap.get(exercise.exercise_date);
        if (dayData) {
          dayData.totalExercise += exercise.duration_minutes;
        }
      });

      // Convert to array and sort
      const historyArray = Array.from(dateMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setHistory(historyArray);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
};
