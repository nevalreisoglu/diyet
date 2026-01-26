import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType } from '@/types/nutrition';
import { useToast } from '@/hooks/use-toast';

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
    snack1: null,
    snack2: null,
    snack3: null,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        snack1: null,
        snack2: null,
        snack3: null,
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

  const updateSchedule = useCallback(async (mealType: MealType, time: string) => {
    if (!userId) return;

    try {
      // Check if schedule exists
      const { data: existing } = await supabase
        .from('meal_schedules')
        .select('id')
        .eq('user_id', userId)
        .eq('meal_type', mealType)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('meal_schedules')
          .update({ scheduled_time: time })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('meal_schedules')
          .insert({
            user_id: userId,
            meal_type: mealType,
            scheduled_time: time,
          });

        if (error) throw error;
      }

      toast({
        title: 'Kaydedildi',
        description: 'Öğün saati güncellendi.',
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Hata',
        description: 'Saat güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }, [userId, toast, fetchSchedules]);

  const clearSchedule = useCallback(async (mealType: MealType) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('meal_schedules')
        .delete()
        .eq('user_id', userId)
        .eq('meal_type', mealType);

      if (error) throw error;

      toast({
        title: 'Silindi',
        description: 'Öğün saati silindi.',
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error clearing schedule:', error);
      toast({
        title: 'Hata',
        description: 'Saat silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }, [userId, toast, fetchSchedules]);

  return {
    schedules,
    loading,
    getScheduleForMeal,
    updateSchedule,
    clearSchedule,
    refetch: fetchSchedules,
  };
};
