export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTargets extends MacroTotals {}

// Varsayılan dağılım: %30 protein, %40 karbonhidrat, %30 yağ (4/4/9 kcal/g)
export const MACRO_SPLIT = { protein: 0.3, carbs: 0.4, fat: 0.3 } as const;

export const macroTargetsFromCalories = (targetCalories: number): MacroTargets => ({
  protein: Math.round((targetCalories * MACRO_SPLIT.protein) / 4),
  carbs: Math.round((targetCalories * MACRO_SPLIT.carbs) / 4),
  fat: Math.round((targetCalories * MACRO_SPLIT.fat) / 9),
});

export const sumMacros = (items: { protein?: number | null; carbs?: number | null; fat?: number | null }[]): MacroTotals =>
  items.reduce(
    (acc, f) => ({
      protein: acc.protein + (f.protein ?? 0),
      carbs: acc.carbs + (f.carbs ?? 0),
      fat: acc.fat + (f.fat ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

export const round1 = (n: number) => Math.round(n * 10) / 10;
