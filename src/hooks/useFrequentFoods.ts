import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType } from '@/types/nutrition';

export interface FrequentFood {
  name: string;
  calories: number;
  count: number;
}

export function useFrequentFoods(userId: string | undefined, mealType: MealType | null) {
  const [foods, setFoods] = useState<FrequentFood[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !mealType) return;

    const fetch = async () => {
      setLoading(true);
      try {
        // Get all meal IDs for this user + meal type
        const { data: meals, error: mealsError } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', userId)
          .eq('meal_type', mealType);

        if (mealsError || !meals?.length) return;

        const mealIds = meals.map((m) => m.id);

        // Get all food items for those meals
        const { data: items, error: itemsError } = await supabase
          .from('food_items')
          .select('name, calories')
          .in('meal_id', mealIds);

        if (itemsError || !items?.length) return;

        // Aggregate: count by normalized name, take most common calorie value
        const map = new Map<string, { name: string; calories: number; count: number }>();
        for (const item of items) {
          const key = item.name.trim().toLowerCase();
          if (map.has(key)) {
            map.get(key)!.count += 1;
          } else {
            map.set(key, { name: item.name.trim(), calories: item.calories, count: 1 });
          }
        }

        const sorted = Array.from(map.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setFoods(sorted);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId, mealType]);

  return { foods, loading };
}
