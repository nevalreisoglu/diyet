import { MealType, FoodItem } from '@/types/nutrition';
import type { CustomFood } from '@/hooks/useCustomFoods';

export interface MealAdherence {
  planned: number;
  done: number;
}

export interface PlanAdherence {
  planned: number;
  done: number;
  pct: number;
  byMeal: Partial<Record<MealType, MealAdherence>>;
  missedMeals: MealType[];
}

const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

// Her plan satırı günlükteki en fazla bir girdiyle eşleşir (MealCard ile aynı kural)
export const computePlanAdherence = (
  plannedFoods: CustomFood[],
  getMealFoods: (mealType: MealType) => FoodItem[],
): PlanAdherence => {
  const byMeal: Partial<Record<MealType, MealAdherence>> = {};
  let planned = 0;
  let done = 0;

  for (const food of plannedFoods) {
    const mealType = food.meal_type as MealType | null;
    if (!mealType) continue;
    if (!byMeal[mealType]) byMeal[mealType] = { planned: 0, done: 0 };
    byMeal[mealType]!.planned += 1;
    planned += 1;
  }

  for (const mealType of Object.keys(byMeal) as MealType[]) {
    const remaining = getMealFoods(mealType).map((f) => normalize(f.name));
    for (const food of plannedFoods) {
      if (food.meal_type !== mealType) continue;
      const idx = remaining.indexOf(normalize(food.name));
      if (idx >= 0) {
        remaining.splice(idx, 1);
        byMeal[mealType]!.done += 1;
        done += 1;
      }
    }
  }

  const missedMeals = (Object.keys(byMeal) as MealType[]).filter((m) => byMeal[m]!.done === 0);

  return {
    planned,
    done,
    pct: planned > 0 ? Math.round((done / planned) * 100) : 0,
    byMeal,
    missedMeals,
  };
};
