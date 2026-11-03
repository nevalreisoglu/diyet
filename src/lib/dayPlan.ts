import type { CustomFood } from '@/hooks/useCustomFoods';

const WEEKDAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];

const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

// Etiketteki tüm gün adlarını tam kelime olarak eşler ("Pazartesi Salı Perşembe" -> {1, 2, 4})
const weekdaysOf = (label: string): Set<number> => {
  const tokens = normalize(label).split(/[^a-zçğıöşü]+/i).filter(Boolean);
  const found = new Set<number>();
  for (const t of tokens) {
    const idx = WEEKDAYS.indexOf(t);
    if (idx >= 0) found.add(idx);
  }
  return found;
};

export interface DayGroup {
  index: number;
  label: string;
  foods: CustomFood[];
}

export const groupByDay = (foods: CustomFood[]): DayGroup[] => {
  const map = new Map<number, DayGroup>();
  for (const f of foods) {
    if (f.day_index === null || f.day_index === undefined) continue;
    const g = map.get(f.day_index) ?? { index: f.day_index, label: f.day_label ?? `${f.day_index + 1}. Gün`, foods: [] };
    g.foods.push(f);
    map.set(f.day_index, g);
  }
  return [...map.values()].sort((a, b) => a.index - b.index);
};

// Bugün için geçerli grup: hafta günü adlarıysa bugünün günü, sıralı günlerse yükleme tarihinden itibaren dönüşümlü
export const selectTodayGroup = (foods: CustomFood[], today = new Date()): { foods: CustomFood[]; label: string | null; groups: DayGroup[] } => {
  const groups = groupByDay(foods);
  if (groups.length === 0) return { foods, label: null, groups };

  const byWeekday = groups.filter((g) => weekdaysOf(g.label).size > 0);
  if (byWeekday.length >= groups.length / 2) {
    const todayIdx = today.getDay();
    const match = byWeekday.find((g) => weekdaysOf(g.label).has(todayIdx));
    if (match) return { foods: match.foods, label: match.label, groups };
  }

  const start = foods.reduce<string | null>((min, f) => (f.created_at && (!min || f.created_at < min) ? f.created_at : min), null);
  const startDate = start ? new Date(start) : today;
  startDate.setHours(0, 0, 0, 0);
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);
  const elapsed = Math.max(0, Math.round((todayMid.getTime() - startDate.getTime()) / 86400000));
  const g = groups[elapsed % groups.length];
  return { foods: g.foods, label: g.label, groups };
};
