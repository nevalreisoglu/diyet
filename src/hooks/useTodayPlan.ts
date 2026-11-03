import { useCallback, useEffect, useState } from 'react';
import { useCustomFoods, CustomFood } from '@/hooks/useCustomFoods';
import { fetchPlanForDate, PlanDay } from '@/hooks/usePlanDay';
import { todayStr } from '@/lib/dates';
import { selectTodayGroup } from '@/lib/dayPlan';

export type PlanSource = 'dietitian' | 'own' | 'none';

// Danışan tarafı: bugün için diyetisyen planı varsa onu, yoksa kendi yüklediği listeyi verir
export const useTodayPlan = (userId: string | undefined) => {
  const { customFoods, loading: ownLoading } = useCustomFoods(userId);
  const [planItems, setPlanItems] = useState<CustomFood[]>([]);
  const [planDay, setPlanDay] = useState<PlanDay | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const { day, items } = await fetchPlanForDate(userId, todayStr());
      setPlanDay(day);
      setPlanItems(items.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        meal_type: i.meal_type,
      })));
    } catch (error) {
      console.error('Error fetching today plan:', error);
    } finally {
      setPlanLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const hasDietitianPlan = planDay !== null && planItems.length > 0;
  const source: PlanSource = hasDietitianPlan ? 'dietitian' : customFoods.length > 0 ? 'own' : 'none';
  const ownToday = selectTodayGroup(customFoods);

  return {
    plannedFoods: hasDietitianPlan ? planItems : ownToday.foods,
    dayLabel: hasDietitianPlan ? null : ownToday.label,
    note: planDay?.note ?? null,
    source,
    loading: ownLoading || planLoading,
    refetch,
  };
};
