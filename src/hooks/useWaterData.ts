import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWaterData = (userId: string | undefined, date?: string) => {
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [targetWater, setTargetWater] = useState<number>(2000);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const currentDate = date || new Date().toISOString().split('T')[0];

  const fetchWaterIntake = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('water_intake')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('intake_date', currentDate);

      if (error) throw error;

      const total = (data || []).reduce((sum, item) => sum + item.amount_ml, 0);
      setWaterIntake(total);
    } catch (error) {
      console.error('Error fetching water intake:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate]);

  const fetchTargetWater = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('target_water_ml')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data?.target_water_ml) {
        setTargetWater(data.target_water_ml);
      }
    } catch (error) {
      console.error('Error fetching target water:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchWaterIntake();
    fetchTargetWater();
  }, [fetchWaterIntake, fetchTargetWater]);

  const addWater = useCallback(
    async (amount: number = 250) => {
      if (!userId) return;

      try {
        const { error } = await supabase.from('water_intake').insert({
          user_id: userId,
          amount_ml: amount,
          intake_date: currentDate,
        });

        if (error) throw error;

        setWaterIntake((prev) => prev + amount);
        toast({
          title: 'Su eklendi',
          description: `${amount} ml su eklendi.`,
        });
      } catch (error) {
        console.error('Error adding water:', error);
        toast({
          title: 'Hata',
          description: 'Su eklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, currentDate, toast]
  );

  const removeWater = useCallback(
    async (amount: number = 250) => {
      if (!userId || waterIntake <= 0) return;

      try {
        // Get the most recent water intake entry
        const { data: entries, error: fetchError } = await supabase
          .from('water_intake')
          .select('id, amount_ml')
          .eq('user_id', userId)
          .eq('intake_date', currentDate)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;
        if (!entries || entries.length === 0) return;

        const entry = entries[0];
        const { error } = await supabase
          .from('water_intake')
          .delete()
          .eq('id', entry.id);

        if (error) throw error;

        setWaterIntake((prev) => Math.max(0, prev - entry.amount_ml));
        toast({
          title: 'Su çıkarıldı',
          description: `${entry.amount_ml} ml su çıkarıldı.`,
        });
      } catch (error) {
        console.error('Error removing water:', error);
        toast({
          title: 'Hata',
          description: 'Su çıkarılırken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    },
    [userId, waterIntake, currentDate, toast]
  );

  return {
    waterIntake,
    targetWater,
    loading,
    addWater,
    removeWater,
    percentage: Math.min(100, Math.round((waterIntake / targetWater) * 100)),
  };
};
