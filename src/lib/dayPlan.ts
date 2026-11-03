import type { CustomFood } from '@/hooks/useCustomFoods';

const WEEKDAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];

// Günden bağımsız, her gün geçerli yiyecekler bu indeksle saklanır
export const EVERY_DAY_INDEX = -1;

const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
const foodKey = (f: CustomFood) => `${f.meal_type ?? ''}|${normalize(f.name)}`;

// "Her gün", "Tüm günler", "Ortak" gibi etiketler günden bağımsız bölümdür
const EVERY_DAY_LABEL = /(her ?gün|hergün|tüm günler|bütün günler|ortak|genel|her gün için)/i;
export const isEveryDayLabel = (label: string | null | undefined) => !!label && EVERY_DAY_LABEL.test(normalize(label));
const isEveryDay = (f: CustomFood) => f.day_index === EVERY_DAY_INDEX || isEveryDayLabel(f.day_label);

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
    if (f.day_index === null || f.day_index === undefined || isEveryDay(f)) continue;
    const g = map.get(f.day_index) ?? { index: f.day_index, label: f.day_label ?? `${f.day_index + 1}. Gün`, foods: [] };
    g.foods.push(f);
    map.set(f.day_index, g);
  }
  return [...map.values()].sort((a, b) => a.index - b.index);
};

// Bir günün tam listesi: kendi yiyecekleri + her gün geçerli olanlar + diğer günlerde hep aynı olan boş öğünler
export const resolveDayFoods = (allFoods: CustomFood[], groups: DayGroup[], group: DayGroup): CustomFood[] => {
  const result = [...group.foods];
  const keys = new Set(result.map(foodKey));
  const add = (f: CustomFood) => {
    const k = foodKey(f);
    if (keys.has(k)) return;
    keys.add(k);
    result.push(f);
  };

  for (const f of allFoods) {
    if (isEveryDay(f)) add(f);
  }

  const mealsPresent = new Set(result.map((f) => f.meal_type));
  const others = groups.filter((g) => g.index !== group.index);
  const mealTypes = new Set(others.flatMap((g) => g.foods.map((f) => f.meal_type)));
  for (const mealType of mealTypes) {
    if (!mealType || mealsPresent.has(mealType)) continue;
    const variants = others
      .map((g) => g.foods.filter((f) => f.meal_type === mealType))
      .filter((list) => list.length > 0);
    // Yalnızca diğer günlerin hepsinde ve hep aynı içerikle geçiyorsa ortak kabul et
    if (variants.length === 0 || variants.length < others.length) continue;
    const signature = (list: CustomFood[]) => list.map((f) => normalize(f.name)).sort().join('|');
    const first = signature(variants[0]);
    if (variants.every((v) => signature(v) === first)) {
      variants[0].forEach(add);
    }
  }

  return result;
};

// Bugün için geçerli grup: hafta günü adlarıysa bugünün günü, sıralı günlerse yükleme tarihinden itibaren dönüşümlü
export const selectTodayGroup = (foods: CustomFood[], today = new Date()): { foods: CustomFood[]; label: string | null; groups: DayGroup[] } => {
  const groups = groupByDay(foods);
  if (groups.length === 0) return { foods, label: null, groups };

  const pick = (g: DayGroup) => ({ foods: resolveDayFoods(foods, groups, g), label: g.label, groups });

  const byWeekday = groups.filter((g) => weekdaysOf(g.label).size > 0);
  if (byWeekday.length >= groups.length / 2) {
    const todayIdx = today.getDay();
    const match = byWeekday.find((g) => weekdaysOf(g.label).has(todayIdx));
    if (match) return pick(match);
  }

  const start = foods.reduce<string | null>((min, f) => (f.created_at && (!min || f.created_at < min) ? f.created_at : min), null);
  const startDate = start ? new Date(start) : today;
  startDate.setHours(0, 0, 0, 0);
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);
  const elapsed = Math.max(0, Math.round((todayMid.getTime() - startDate.getTime()) / 86400000));
  return pick(groups[elapsed % groups.length]);
};
