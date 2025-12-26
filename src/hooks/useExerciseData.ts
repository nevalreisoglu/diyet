import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useExerciseData = (userId: string | undefined) => {
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchExercise = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('exercise_log')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('exercise_date', today);

    if (error) {
      console.error('Error fetching exercise:', error);
      setLoading(false);
      return;
    }

    const total = data?.reduce((sum, item) => sum + item.duration_minutes, 0) || 0;
    setDuration(total);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExercise();
  }, [fetchExercise]);

  const addExercise = async (minutes: number, notes?: string) => {
    if (!userId || minutes <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('exercise_log')
      .insert({
        user_id: userId,
        duration_minutes: minutes,
        exercise_date: today,
        notes,
      });

    if (error) {
      console.error('Error adding exercise:', error);
      return;
    }

    setDuration((prev) => prev + minutes);
  };

  return {
    duration,
    loading,
    addExercise,
    refetch: fetchExercise,
  };
};
