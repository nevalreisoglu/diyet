import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type BeverageType = 'coffee' | 'tea';

interface BeverageData {
  coffee: number;
  tea: number;
}

export const useBeverageData = (userId: string | undefined) => {
  const [beverages, setBeverages] = useState<BeverageData>({ coffee: 0, tea: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBeverages = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('beverage_intake')
      .select('beverage_type, cups')
      .eq('user_id', userId)
      .eq('intake_date', today);

    if (error) {
      console.error('Error fetching beverages:', error);
      setLoading(false);
      return;
    }

    const totals = { coffee: 0, tea: 0 };
    data?.forEach((item) => {
      if (item.beverage_type === 'coffee') {
        totals.coffee += item.cups;
      } else if (item.beverage_type === 'tea') {
        totals.tea += item.cups;
      }
    });

    setBeverages(totals);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBeverages();
  }, [fetchBeverages]);

  const addBeverage = async (type: BeverageType, cups: number = 1) => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('beverage_intake')
      .insert({
        user_id: userId,
        beverage_type: type,
        cups,
        intake_date: today,
      });

    if (error) {
      console.error('Error adding beverage:', error);
      return;
    }

    setBeverages((prev) => ({
      ...prev,
      [type]: prev[type] + cups,
    }));
  };

  const removeBeverage = async (type: BeverageType) => {
    if (!userId || beverages[type] <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('beverage_intake')
      .select('id')
      .eq('user_id', userId)
      .eq('beverage_type', type)
      .eq('intake_date', today)
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from('beverage_intake')
        .delete()
        .eq('id', data[0].id);

      setBeverages((prev) => ({
        ...prev,
        [type]: Math.max(0, prev[type] - 1),
      }));
    }
  };

  return {
    beverages,
    loading,
    addBeverage,
    removeBeverage,
    refetch: fetchBeverages,
  };
};
