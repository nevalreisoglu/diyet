import { useState, useCallback } from 'react';
import { MealEntry, FoodItem, MealType } from '@/types/nutrition';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useNutritionStore = () => {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [targetCalories] = useState(1500);

  const addFood = useCallback((mealType: MealType, food: Omit<FoodItem, 'id'>) => {
    const newFood: FoodItem = { ...food, id: generateId() };
    
    setMeals((prev) => {
      const existingMeal = prev.find((m) => m.mealType === mealType);
      
      if (existingMeal) {
        return prev.map((m) =>
          m.mealType === mealType
            ? { ...m, foods: [...m.foods, newFood] }
            : m
        );
      }
      
      return [
        ...prev,
        {
          id: generateId(),
          mealType,
          foods: [newFood],
          timestamp: new Date(),
        },
      ];
    });
  }, []);

  const removeFood = useCallback((mealType: MealType, foodId: string) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.mealType === mealType
          ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) }
          : m
      ).filter((m) => m.foods.length > 0)
    );
  }, []);

  const getTotalCalories = useCallback(() => {
    return meals.reduce(
      (total, meal) =>
        total + meal.foods.reduce((mealTotal, food) => mealTotal + food.calories, 0),
      0
    );
  }, [meals]);

  const getMealCalories = useCallback((mealType: MealType) => {
    const meal = meals.find((m) => m.mealType === mealType);
    if (!meal) return 0;
    return meal.foods.reduce((total, food) => total + food.calories, 0);
  }, [meals]);

  const getMealFoods = useCallback((mealType: MealType) => {
    const meal = meals.find((m) => m.mealType === mealType);
    return meal?.foods || [];
  }, [meals]);

  return {
    meals,
    targetCalories,
    addFood,
    removeFood,
    getTotalCalories,
    getMealCalories,
    getMealFoods,
  };
};
