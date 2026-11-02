import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailySummary {
  id: string;
  summary_date: string;
  headline: string;
  message: string;
  focus: string | null;
  tone: 'celebrate' | 'nudge' | 'warn';
  updated_at: string;
}

export interface CoachStats {
  localHour: number;
  calories: number;
  targetCalories: number;
  waterMl: number;
  targetWaterMl: number;
  exerciseMinutes: number;
  coffee: number;
  tea: number;
  mealsLogged: number;
  adherence: { planned: number; done: number; pct: number; missedMeals: string[] } | null;
  measurement: {
    measuredAt: string;
    weightKg: number | null;
    weightDelta: number | null;
    bodyFatPct: number | null;
    bodyFatDelta: number | null;
  } | null;
  achievements: string[];
}

// Gemini'nin günlük kotasını korumak için yenileme aralığı
export const COACH_REFRESH_MINUTES = 60;

export const useDailyCoach = (userId: string | undefined) => {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('id, summary_date, headline, message, focus, tone, updated_at')
        .eq('user_id', userId)
        .eq('summary_date', today)
        .maybeSingle();
      if (error) throw error;
      setSummary((data as DailySummary | null) ?? null);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const minutesSinceUpdate = summary
    ? Math.floor((Date.now() - new Date(summary.updated_at).getTime()) / 60000)
    : null;
  const canRefresh = minutesSinceUpdate === null || minutesSinceUpdate >= COACH_REFRESH_MINUTES;

  const generate = useCallback(async (stats: CoachStats) => {
    if (!userId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-coach', { body: { stats } });
      if (error) throw new Error(data?.error || error.message);
      if (!data?.success) throw new Error(data?.error || 'Özet oluşturulamadı');
      setSummary(data.summary as DailySummary);
    } catch (error) {
      console.error('Error generating daily summary:', error);
      toast({
        title: 'Özet oluşturulamadı',
        description: error instanceof Error ? error.message : 'Bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }, [userId, toast]);

  return { summary, loading, generating, generate, canRefresh, minutesSinceUpdate, refetch };
};
