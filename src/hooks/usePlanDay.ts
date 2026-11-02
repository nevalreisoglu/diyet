import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MealType } from '@/types/nutrition';
import { addDays } from '@/lib/dates';

export interface PlanItem {
  id: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sort_order: number;
}

export interface PlanDay {
  id: string;
  plan_date: string;
  note: string | null;
}

export interface NewPlanItem {
  meal_type: MealType;
  name: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const fetchPlanForDate = async (clientId: string, date: string) => {
  const { data: day, error } = await supabase
    .from('plan_days')
    .select('id, plan_date, note')
    .eq('client_id', clientId)
    .eq('plan_date', date)
    .maybeSingle();
  if (error) throw error;
  if (!day) return { day: null as PlanDay | null, items: [] as PlanItem[] };
  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('id, meal_type, name, calories, protein, carbs, fat, sort_order')
    .eq('plan_day_id', day.id)
    .order('sort_order')
    .order('created_at');
  if (itemsError) throw itemsError;
  return {
    day: day as PlanDay,
    items: (items ?? []).map((i: any) => ({ ...i, protein: num(i.protein), carbs: num(i.carbs), fat: num(i.fat) })) as PlanItem[],
  };
};

// Diyetisyen tarafı: bir danışanın belirli gün planını düzenleme
export const usePlanDay = (dietitianId: string | undefined, clientId: string | undefined, date: string) => {
  const [day, setDay] = useState<PlanDay | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    if (!clientId) return;
    try {
      const result = await fetchPlanForDate(clientId, date);
      setDay(result.day);
      setItems(result.items);
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, date]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  const ensureDay = useCallback(async (targetDate = date): Promise<PlanDay> => {
    if (!dietitianId || !clientId) throw new Error('Oturum gerekli');
    if (targetDate === date && day) return day;
    const { data, error } = await supabase
      .from('plan_days')
      .upsert({ client_id: clientId, dietitian_id: dietitianId, plan_date: targetDate }, { onConflict: 'client_id,plan_date' })
      .select('id, plan_date, note')
      .single();
    if (error) throw error;
    if (targetDate === date) setDay(data as PlanDay);
    return data as PlanDay;
  }, [dietitianId, clientId, date, day]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
      await refetch();
    } catch (error) {
      console.error(`${label} failed:`, error);
      toast({ title: 'Hata', description: `${label} başarısız oldu.`, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addItems = (newItems: NewPlanItem[]) => run('Ekleme', async () => {
    if (newItems.length === 0) return;
    const d = await ensureDay();
    const base = items.length;
    const { error } = await supabase.from('plan_items').insert(
      newItems.map((it, i) => ({
        plan_day_id: d.id,
        client_id: clientId!,
        meal_type: it.meal_type,
        name: it.name,
        calories: it.calories,
        protein: it.protein ?? null,
        carbs: it.carbs ?? null,
        fat: it.fat ?? null,
        sort_order: base + i,
      }))
    );
    if (error) throw error;
  });

  const removeItem = (id: string) => run('Silme', async () => {
    const { error } = await supabase.from('plan_items').delete().eq('id', id);
    if (error) throw error;
  });

  const saveNote = (note: string) => run('Not kaydetme', async () => {
    const d = await ensureDay();
    const { error } = await supabase.from('plan_days').update({ note: note.trim() || null, updated_at: new Date().toISOString() }).eq('id', d.id);
    if (error) throw error;
  });

  const clearDay = () => run('Günü temizleme', async () => {
    if (!day) return;
    const { error } = await supabase.from('plan_days').delete().eq('id', day.id);
    if (error) throw error;
  });

  // Bu günün öğelerini hedef günlere kopyalar (hedef günün mevcut öğeleri silinir)
  const copyTo = (targetDates: string[]) => run('Kopyalama', async () => {
    for (const target of targetDates) {
      if (target === date) continue;
      const d = await ensureDay(target);
      await supabase.from('plan_items').delete().eq('plan_day_id', d.id);
      if (items.length > 0) {
        const { error } = await supabase.from('plan_items').insert(
          items.map((it, i) => ({
            plan_day_id: d.id,
            client_id: clientId!,
            meal_type: it.meal_type,
            name: it.name,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            sort_order: i,
          }))
        );
        if (error) throw error;
      }
      if (day?.note) {
        await supabase.from('plan_days').update({ note: day.note }).eq('id', d.id);
      }
    }
    toast({ title: 'Kopyalandı', description: `${targetDates.length} güne kopyalandı.` });
  });

  const copyToNextDays = (count: number) => copyTo(Array.from({ length: count }, (_, i) => addDays(date, i + 1)));

  // Danışanın kendi yüklediği listeyi bu güne aktarır
  const importClientList = () => run('Liste aktarma', async () => {
    const { data, error } = await supabase
      .from('custom_foods')
      .select('name, calories, protein, carbs, fat, meal_type')
      .eq('user_id', clientId!)
      .not('meal_type', 'is', null)
      .order('name');
    if (error) throw error;
    if (!data || data.length === 0) {
      toast({ title: 'Liste boş', description: 'Danışanın yüklediği bir liste yok.' });
      return;
    }
    const d = await ensureDay();
    const { error: insertError } = await supabase.from('plan_items').insert(
      data.map((f: any, i: number) => ({
        plan_day_id: d.id,
        client_id: clientId!,
        meal_type: f.meal_type,
        name: f.name,
        calories: f.calories ?? 0,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        sort_order: items.length + i,
      }))
    );
    if (insertError) throw insertError;
  });

  return { day, items, loading, saving, addItems, removeItem, saveNote, clearDay, copyTo, copyToNextDays, importClientList, refetch };
};
