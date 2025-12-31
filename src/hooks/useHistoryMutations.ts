import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType } from '@/types/nutrition';
import { useToast } from '@/hooks/use-toast';

export const useHistoryMutations = (userId: string | undefined, onSuccess: () => void) => {
  const { toast } = useToast();

  const addFoodToDate = useCallback(
    async (date: string, mealType: MealType, food: { name: string; calories: number }) => {
      if (!userId) return;

      try {
        // Check if meal exists for this date
        const { data: existingMeal } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', userId)
          .eq('meal_date', date)
          .eq('meal_type', mealType)
          .maybeSingle();

        let mealId: string;

        if (existingMeal) {
          mealId = existingMeal.id;
        } else {
          // Create new meal
          const { data: newMeal, error: mealError } = await supabase
            .from('meals')
            .insert({
              user_id: userId,
              meal_type: mealType,
              meal_date: date,
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

        toast({
          title: 'Eklendi',
          description: `${food.name} eklendi.`,
        });

        onSuccess();
      } catch (error) {
        console.error('Error adding food:', error);
        toast({
          title: 'Hata',
          description: 'Yiyecek eklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, toast, onSuccess]
  );

  const removeFoodFromDate = useCallback(
    async (foodId: string) => {
      try {
        const { error } = await supabase
          .from('food_items')
          .delete()
          .eq('id', foodId);

        if (error) throw error;

        toast({
          title: 'Silindi',
          description: 'Yiyecek silindi.',
        });

        onSuccess();
      } catch (error) {
        console.error('Error removing food:', error);
        toast({
          title: 'Hata',
          description: 'Yiyecek silinirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [toast, onSuccess]
  );

  const addWaterToDate = useCallback(
    async (date: string, amountMl: number = 250) => {
      if (!userId) return;

      try {
        const { error } = await supabase.from('water_intake').insert({
          user_id: userId,
          intake_date: date,
          amount_ml: amountMl,
        });

        if (error) throw error;

        toast({
          title: 'Eklendi',
          description: `${amountMl} ml su eklendi.`,
        });

        onSuccess();
      } catch (error) {
        console.error('Error adding water:', error);
        toast({
          title: 'Hata',
          description: 'Su eklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, toast, onSuccess]
  );

  const removeWaterFromDate = useCallback(
    async (date: string) => {
      if (!userId) return;

      try {
        // Get the last water entry for this date
        const { data } = await supabase
          .from('water_intake')
          .select('id')
          .eq('user_id', userId)
          .eq('intake_date', date)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const { error } = await supabase
            .from('water_intake')
            .delete()
            .eq('id', data[0].id);

          if (error) throw error;

          toast({
            title: 'Silindi',
            description: 'Su kaydı silindi.',
          });

          onSuccess();
        }
      } catch (error) {
        console.error('Error removing water:', error);
        toast({
          title: 'Hata',
          description: 'Su silinirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, toast, onSuccess]
  );

  const addExerciseToDate = useCallback(
    async (date: string, durationMinutes: number, notes?: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase.from('exercise_log').insert({
          user_id: userId,
          exercise_date: date,
          duration_minutes: durationMinutes,
          notes: notes || null,
        });

        if (error) throw error;

        toast({
          title: 'Eklendi',
          description: `${durationMinutes} dakika egzersiz eklendi.`,
        });

        onSuccess();
      } catch (error) {
        console.error('Error adding exercise:', error);
        toast({
          title: 'Hata',
          description: 'Egzersiz eklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, toast, onSuccess]
  );

  return {
    addFoodToDate,
    removeFoodFromDate,
    addWaterToDate,
    removeWaterFromDate,
    addExerciseToDate,
  };
};
