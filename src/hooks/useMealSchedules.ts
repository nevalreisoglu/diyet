import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType } from '@/types/nutrition';

interface MealSchedule {
  id: string;
  meal_type: string;
  scheduled_time: string;
}

export const useMealSchedules = (userId: string | undefined) => {
  const [schedules, setSchedules] = useState<Record<MealType, string | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meal_schedules')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching meal schedules:', error);
        return;
      }

      const scheduleMap: Record<MealType, string | null> = {
        breakfast: null,
        lunch: null,
        dinner: null,
        snack: null,
      };

      (data as MealSchedule[])?.forEach((schedule) => {
        if (schedule.meal_type in scheduleMap) {
          scheduleMap[schedule.meal_type as MealType] = schedule.scheduled_time;
        }
      });

      setSchedules(scheduleMap);
    } catch (error) {
      console.error('Error fetching meal schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getScheduleForMeal = useCallback((mealType: MealType): string | null => {
    return schedules[mealType];
  }, [schedules]);

  return {
    schedules,
    loading,
    getScheduleForMeal,
    refetch: fetchSchedules,
  };
};
