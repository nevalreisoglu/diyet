import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MetabolicProfile {
  age: number | null;
  gender: 'male' | 'female' | null;
  heightCm: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  targetCalories: number;
  targetWaterMl: number;
  bmr: number | null;
  tdee: number | null;
  bmi: number | null;
  bmiCategory: string | null;
}

export interface RecentMetrics {
  avgCalories: number;
  avgWater: number;
  avgExercise: number;
  avgCoffee: number;
  avgTea: number;
  daysTracked: number;
}

const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  // Mifflin-St Jeor
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
};

const calculateBMI = (weight: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
};

const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla Kilolu';
  return 'Obez';
};

export const useMetabolicProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<MetabolicProfile | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<RecentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('age, gender, height_cm, current_weight_kg, target_weight_kg, target_calories, target_water_ml')
        .eq('user_id', userId)
        .maybeSingle();

      const age = profileData?.age ?? null;
      const gender = (profileData?.gender as 'male' | 'female') ?? null;
      const heightCm = profileData?.height_cm ? Number(profileData.height_cm) : null;
      const currentWeight = profileData?.current_weight_kg ? Number(profileData.current_weight_kg) : null;
      const targetCalories = profileData?.target_calories ?? 2000;
      const targetWaterMl = profileData?.target_water_ml ?? 2000;

      let bmr: number | null = null;
      let tdee: number | null = null;
      let bmi: number | null = null;
      let bmiCategory: string | null = null;

      if (currentWeight && heightCm && age && gender) {
        bmr = Math.round(calculateBMR(currentWeight, heightCm, age, gender));
        tdee = Math.round(bmr * 1.55); // moderate activity default
      }
      if (currentWeight && heightCm) {
        bmi = Math.round(calculateBMI(currentWeight, heightCm) * 10) / 10;
        bmiCategory = getBMICategory(bmi);
      }

      setProfile({
        age, gender, heightCm, currentWeight,
        targetWeight: profileData?.target_weight_kg ? Number(profileData.target_weight_kg) : null,
        targetCalories, targetWaterMl, bmr, tdee, bmi, bmiCategory,
      });

      // Fetch last 14 days of data for averages
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const [meals, water, exercise, beverages] = await Promise.all([
        supabase.from('meals').select('meal_date, food_items(calories)').eq('user_id', userId).gte('meal_date', startStr).lte('meal_date', endStr),
        supabase.from('water_intake').select('intake_date, amount_ml').eq('user_id', userId).gte('intake_date', startStr).lte('intake_date', endStr),
        supabase.from('exercise_log').select('exercise_date, duration_minutes').eq('user_id', userId).gte('exercise_date', startStr).lte('exercise_date', endStr),
        supabase.from('beverage_intake').select('intake_date, beverage_type, cups').eq('user_id', userId).gte('intake_date', startStr).lte('intake_date', endStr),
      ]);

      // Aggregate by date
      const dates = new Set<string>();
      let totalCal = 0, totalWater = 0, totalExercise = 0, totalCoffee = 0, totalTea = 0;

      (meals.data || []).forEach((m: any) => {
        dates.add(m.meal_date);
        totalCal += (m.food_items || []).reduce((s: number, f: any) => s + (f.calories || 0), 0);
      });
      (water.data || []).forEach((w: any) => { dates.add(w.intake_date); totalWater += w.amount_ml; });
      (exercise.data || []).forEach((e: any) => { dates.add(e.exercise_date); totalExercise += e.duration_minutes; });
      (beverages.data || []).forEach((b: any) => {
        dates.add(b.intake_date);
        if (b.beverage_type === 'coffee') totalCoffee += b.cups;
        else if (b.beverage_type === 'tea') totalTea += b.cups;
      });

      const daysTracked = Math.max(dates.size, 1);
      setRecentMetrics({
        avgCalories: Math.round(totalCal / daysTracked),
        avgWater: Math.round(totalWater / daysTracked),
        avgExercise: Math.round(totalExercise / daysTracked),
        avgCoffee: Math.round((totalCoffee / daysTracked) * 10) / 10,
        avgTea: Math.round((totalTea / daysTracked) * 10) / 10,
        daysTracked,
      });
    } catch (err) {
      console.error('Metabolic profile error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { profile, recentMetrics, loading, refetch: fetchData };
};
