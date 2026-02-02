import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ForecastResult {
  kg: number;
  direction: 'loss' | 'gain' | 'stable';
}

export interface WeightForecast {
  weeklyForecast: ForecastResult;
  monthlyForecast: ForecastResult;
  threeMonthForecast: ForecastResult;
  insights: string[];
  recommendations: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  summary: string;
}

interface HistoryData {
  dailyData: {
    date: string;
    calories: number;
    targetCalories: number;
    waterMl: number;
    targetWaterMl: number;
    exerciseMinutes: number;
    coffeeCount: number;
    teaCount: number;
  }[];
  userProfile: {
    targetCalories: number;
    targetWaterMl: number;
  };
}

export const useWeightForecast = (userId: string | undefined) => {
  const [forecast, setForecast] = useState<WeightForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataPointCount, setDataPointCount] = useState(0);

  const fetchForecast = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch last 90 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('target_calories, target_water_ml')
        .eq('user_id', userId)
        .maybeSingle();

      const targetCalories = profile?.target_calories || 2000;
      const targetWaterMl = profile?.target_water_ml || 2000;

      // Fetch all data in parallel
      const [mealsResult, waterResult, exerciseResult, beverageResult] = await Promise.all([
        supabase
          .from('meals')
          .select('meal_date, food_items(calories)')
          .eq('user_id', userId)
          .gte('meal_date', startDateStr)
          .lte('meal_date', endDateStr),
        supabase
          .from('water_intake')
          .select('intake_date, amount_ml')
          .eq('user_id', userId)
          .gte('intake_date', startDateStr)
          .lte('intake_date', endDateStr),
        supabase
          .from('exercise_log')
          .select('exercise_date, duration_minutes')
          .eq('user_id', userId)
          .gte('exercise_date', startDateStr)
          .lte('exercise_date', endDateStr),
        supabase
          .from('beverage_intake')
          .select('intake_date, beverage_type, cups')
          .eq('user_id', userId)
          .gte('intake_date', startDateStr)
          .lte('intake_date', endDateStr),
      ]);

      // Process data by date
      const dateMap = new Map<string, {
        calories: number;
        waterMl: number;
        exerciseMinutes: number;
        coffeeCount: number;
        teaCount: number;
      }>();

      // Initialize dates
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, {
          calories: 0,
          waterMl: 0,
          exerciseMinutes: 0,
          coffeeCount: 0,
          teaCount: 0,
        });
      }

      // Process meals
      (mealsResult.data || []).forEach((meal: any) => {
        const dayData = dateMap.get(meal.meal_date);
        if (dayData) {
          const mealCalories = (meal.food_items || []).reduce((sum: number, f: any) => sum + (f.calories || 0), 0);
          dayData.calories += mealCalories;
        }
      });

      // Process water
      (waterResult.data || []).forEach((water: any) => {
        const dayData = dateMap.get(water.intake_date);
        if (dayData) {
          dayData.waterMl += water.amount_ml;
        }
      });

      // Process exercise
      (exerciseResult.data || []).forEach((exercise: any) => {
        const dayData = dateMap.get(exercise.exercise_date);
        if (dayData) {
          dayData.exerciseMinutes += exercise.duration_minutes;
        }
      });

      // Process beverages
      (beverageResult.data || []).forEach((beverage: any) => {
        const dayData = dateMap.get(beverage.intake_date);
        if (dayData) {
          if (beverage.beverage_type === 'coffee') {
            dayData.coffeeCount += beverage.cups;
          } else if (beverage.beverage_type === 'tea') {
            dayData.teaCount += beverage.cups;
          }
        }
      });

      // Filter days with actual data (at least some calories logged)
      const dailyData = Array.from(dateMap.entries())
        .filter(([_, data]) => data.calories > 0 || data.exerciseMinutes > 0 || data.waterMl > 0)
        .map(([date, data]) => ({
          date,
          calories: data.calories,
          targetCalories,
          waterMl: data.waterMl,
          targetWaterMl,
          exerciseMinutes: data.exerciseMinutes,
          coffeeCount: data.coffeeCount,
          teaCount: data.teaCount,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (dailyData.length === 0) {
        setError('Tahmin için yeterli veri bulunamadı. Lütfen birkaç gün veri girin.');
        setLoading(false);
        return;
      }

      const historyData: HistoryData = {
        dailyData,
        userProfile: {
          targetCalories,
          targetWaterMl,
        },
      };

      // Call the edge function
      const { data, error: funcError } = await supabase.functions.invoke('forecast-weight', {
        body: { historyData },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setForecast(data.forecast);
      setDataPointCount(data.dataPointCount);
    } catch (err) {
      console.error('Forecast error:', err);
      setError(err instanceof Error ? err.message : 'Tahmin yapılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { forecast, loading, error, dataPointCount, fetchForecast };
};
