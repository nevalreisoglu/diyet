import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Droplets, Dumbbell, Flame, ListChecks, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { MealType, mealTypeLabels, mealTypeIcons, FoodItem } from '@/types/nutrition';
import { fetchPlanForDate, PlanItem } from '@/hooks/usePlanDay';
import { useHistoryData } from '@/hooks/useHistoryData';
import { computePlanAdherence } from '@/lib/planAdherence';
import { addDays, formatDateLong, todayStr } from '@/lib/dates';

const mealTypes: MealType[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];
const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

interface DayDetail {
  foodsByMeal: Record<MealType, FoodItem[]>;
  waterMl: number;
  exerciseMin: number;
  coffee: number;
  tea: number;
  plan: PlanItem[];
  summary: { headline: string; message: string; focus: string | null } | null;
}

const fetchDayDetail = async (clientId: string, date: string): Promise<DayDetail> => {
  const [meals, water, exercise, beverages, plan, summary] = await Promise.all([
    supabase.from('meals').select('meal_type, food_items(id, name, calories, protein, carbs, fat)').eq('user_id', clientId).eq('meal_date', date),
    supabase.from('water_intake').select('amount_ml').eq('user_id', clientId).eq('intake_date', date),
    supabase.from('exercise_log').select('duration_minutes').eq('user_id', clientId).eq('exercise_date', date),
    supabase.from('beverage_intake').select('beverage_type, cups').eq('user_id', clientId).eq('intake_date', date),
    fetchPlanForDate(clientId, date),
    supabase.from('daily_summaries').select('headline, message, focus').eq('user_id', clientId).eq('summary_date', date).maybeSingle(),
  ]);
  const foodsByMeal = Object.fromEntries(mealTypes.map((m) => [m, [] as FoodItem[]])) as Record<MealType, FoodItem[]>;
  (meals.data ?? []).forEach((m: any) => {
    const type = m.meal_type as MealType;
    if (foodsByMeal[type]) foodsByMeal[type] = (m.food_items ?? []).map((f: any) => ({ id: f.id, name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }));
  });
  let coffee = 0, tea = 0;
  (beverages.data ?? []).forEach((b: any) => { if (b.beverage_type === 'coffee') coffee += b.cups; else if (b.beverage_type === 'tea') tea += b.cups; });
  return {
    foodsByMeal,
    waterMl: (water.data ?? []).reduce((s: number, w: any) => s + w.amount_ml, 0),
    exerciseMin: (exercise.data ?? []).reduce((s: number, e: any) => s + e.duration_minutes, 0),
    coffee,
    tea,
    plan: plan.items,
    summary: (summary.data as any) ?? null,
  };
};

interface Props {
  clientId: string;
  targetCalories: number;
  targetWaterMl: number;
}

export const ClientTracking = ({ clientId, targetCalories, targetWaterMl }: Props) => {
  const [date, setDate] = useState(todayStr());
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { history, loading: weekLoading } = useHistoryData(clientId, 7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDayDetail(clientId, date)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => console.error('Day detail error:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, date]);

  const adherence = useMemo(() => {
    if (!detail) return null;
    const planned = detail.plan.map((p) => ({ id: p.id, name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat, meal_type: p.meal_type }));
    return computePlanAdherence(planned, (m) => detail.foodsByMeal[m]);
  }, [detail]);

  const totalCalories = detail ? mealTypes.reduce((s, m) => s + detail.foodsByMeal[m].reduce((a, f) => a + f.calories, 0), 0) : 0;
  const weekAvg = useMemo(() => {
    const days = history.filter((d) => d.totalCalories > 0 || d.totalWater > 0 || d.totalExercise > 0);
    const n = Math.max(days.length, 1);
    return {
      tracked: days.length,
      calories: Math.round(days.reduce((s, d) => s + d.totalCalories, 0) / n),
      water: Math.round(days.reduce((s, d) => s + d.totalWater, 0) / n),
      exercise: Math.round(days.reduce((s, d) => s + d.totalExercise, 0) / n),
    };
  }, [history]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Önceki gün"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <Input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-8 text-center w-40 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1 capitalize">{formatDateLong(date)}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayStr()} aria-label="Sonraki gün"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {loading || !detail ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={ListChecks} label="Liste uyumu" value={adherence && adherence.planned > 0 ? `%${adherence.pct}` : '—'} sub={adherence && adherence.planned > 0 ? `${adherence.done}/${adherence.planned}` : 'plan yok'} />
            <Stat icon={Flame} label="Kalori" value={`${totalCalories}`} sub={`hedef ${targetCalories}`} />
            <Stat icon={Droplets} label="Su" value={`${detail.waterMl} ml`} sub={`hedef ${targetWaterMl}`} />
            <Stat icon={Dumbbell} label="Egzersiz" value={`${detail.exerciseMin} dk`} sub={`${detail.coffee} kahve · ${detail.tea} çay`} />
          </div>

          {detail.summary && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Danışanın koç özeti</p>
                <p className="text-sm font-medium text-foreground">{detail.summary.headline}</p>
                <p className="text-sm text-muted-foreground">{detail.summary.message}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {mealTypes.map((mealType) => {
              const eaten = detail.foodsByMeal[mealType];
              const planned = detail.plan.filter((p) => p.meal_type === mealType);
              const plannedNames = planned.map((p) => normalize(p.name));
              const eatenNames = eaten.map((f) => normalize(f.name));
              if (eaten.length === 0 && planned.length === 0) return null;
              return (
                <Card key={mealType}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{mealTypeIcons[mealType]} {mealTypeLabels[mealType]}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {planned.map((p) => {
                      const done = eatenNames.includes(normalize(p.name));
                      return (
                        <div key={p.id} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${done ? 'bg-green-500/10' : 'bg-secondary/40'}`}>
                          <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{done ? '✓' : '○'} {p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.calories} kcal</span>
                        </div>
                      );
                    })}
                    {eaten.filter((f) => !plannedNames.includes(normalize(f.name))).map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-amber-500/10">
                        <span className="text-foreground">+ {f.name} <span className="text-[10px] text-amber-700 dark:text-amber-400">liste dışı</span></span>
                        <span className="text-xs text-muted-foreground">{f.calories} kcal</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Son 7 gün</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {weekLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-lg font-semibold text-foreground">{weekAvg.calories}</p><p className="text-xs text-muted-foreground">kcal/gün</p></div>
              <div><p className="text-lg font-semibold text-foreground">{weekAvg.water}</p><p className="text-xs text-muted-foreground">ml su/gün</p></div>
              <div><p className="text-lg font-semibold text-foreground">{weekAvg.exercise}</p><p className="text-xs text-muted-foreground">dk spor/gün</p></div>
              <p className="col-span-3 text-[11px] text-muted-foreground">{weekAvg.tracked} günde kayıt var</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, sub }: { icon: typeof Flame; label: string; value: string; sub: string }) => (
  <div className="bg-card rounded-xl p-3 shadow-card">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Icon className="h-3.5 w-3.5" /><span className="text-xs">{label}</span></div>
    <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[11px] text-muted-foreground">{sub}</p>
  </div>
);
