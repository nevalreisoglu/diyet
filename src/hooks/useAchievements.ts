import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AchievementType = 
  | 'exercise_goal' 
  | 'calorie_goal' 
  | 'water_goal' 
  | 'low_caffeine';

interface Achievement {
  id: string;
  achievement_type: AchievementType;
  earned_at: string;
  achievement_date: string;
}

interface AchievementConfig {
  type: AchievementType;
  label: string;
  icon: string;
  description: string;
}

export const achievementConfigs: AchievementConfig[] = [
  {
    type: 'exercise_goal',
    label: 'Spor Yıldızı',
    icon: '🏆',
    description: '30 dakika spor yaptınız!',
  },
  {
    type: 'calorie_goal',
    label: 'Kalori Ustası',
    icon: '🎯',
    description: 'Günlük kalori hedefinize ulaştınız!',
  },
  {
    type: 'water_goal',
    label: 'Su Kahramanı',
    icon: '💧',
    description: 'Günlük su hedefinizi tamamladınız!',
  },
  {
    type: 'low_caffeine',
    label: 'Kafein Kontrolcüsü',
    icon: '☕',
    description: 'Günde 3 veya daha az kahve/çay içtiniz!',
  },
];

export const useAchievements = (userId: string | undefined) => {
  const [todayAchievements, setTodayAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayAchievements = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_date', today);

    if (error) {
      console.error('Error fetching achievements:', error);
      setLoading(false);
      return;
    }

    setTodayAchievements(data as Achievement[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTodayAchievements();
  }, [fetchTodayAchievements]);

  const awardAchievement = async (type: AchievementType) => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    // Check if already awarded today
    const alreadyAwarded = todayAchievements.some(
      (a) => a.achievement_type === type
    );

    if (alreadyAwarded) return;

    const { data, error } = await supabase
      .from('achievements')
      .insert({
        user_id: userId,
        achievement_type: type,
        achievement_date: today,
      })
      .select()
      .single();

    if (error) {
      // Likely duplicate, ignore
      if (error.code !== '23505') {
        console.error('Error awarding achievement:', error);
      }
      return;
    }

    setTodayAchievements((prev) => [...prev, data as Achievement]);
    return data;
  };

  const hasAchievement = (type: AchievementType): boolean => {
    return todayAchievements.some((a) => a.achievement_type === type);
  };

  const checkAndAwardAchievements = async (stats: {
    exerciseMinutes: number;
    currentCalories: number;
    targetCalories: number;
    waterIntake: number;
    targetWater: number;
    coffeeCount: number;
    teaCount: number;
  }) => {
    const newAchievements: AchievementType[] = [];

    // Exercise goal: 30+ minutes
    if (stats.exerciseMinutes >= 30 && !hasAchievement('exercise_goal')) {
      await awardAchievement('exercise_goal');
      newAchievements.push('exercise_goal');
    }

    // Calorie goal: within 10% of target (not over)
    const caloriePercentage = (stats.currentCalories / stats.targetCalories) * 100;
    if (caloriePercentage >= 90 && caloriePercentage <= 100 && !hasAchievement('calorie_goal')) {
      await awardAchievement('calorie_goal');
      newAchievements.push('calorie_goal');
    }

    // Water goal: 100% of target
    if (stats.waterIntake >= stats.targetWater && !hasAchievement('water_goal')) {
      await awardAchievement('water_goal');
      newAchievements.push('water_goal');
    }

    // Low caffeine: 3 or less total coffee + tea
    const totalCaffeine = stats.coffeeCount + stats.teaCount;
    if (totalCaffeine <= 3 && totalCaffeine > 0 && !hasAchievement('low_caffeine')) {
      await awardAchievement('low_caffeine');
      newAchievements.push('low_caffeine');
    }

    return newAchievements;
  };

  return {
    todayAchievements,
    loading,
    awardAchievement,
    hasAchievement,
    checkAndAwardAchievements,
    refetch: fetchTodayAchievements,
  };
};
