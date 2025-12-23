export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealEntry {
  id: string;
  mealType: MealType;
  foods: FoodItem[];
  timestamp: Date;
}

export interface DailyLog {
  date: string;
  meals: MealEntry[];
  totalCalories: number;
  targetCalories: number;
}

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Atıştırmalık',
};

export const mealTypeIcons: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};
