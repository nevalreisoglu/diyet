export type BmrSource = 'measured' | 'bodyFat' | 'formula';

export interface BmrInput {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  bodyFatPct?: number | null;
  measuredBmrKcal?: number | null;
}

// Mifflin-St Jeor
export const mifflinStJeor = (weight: number, height: number, age: number, gender: 'male' | 'female') =>
  gender === 'male' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;

// Katch-McArdle: yağsız kütleye dayalı, yağ oranı biliniyorsa daha isabetli
export const katchMcArdle = (weight: number, bodyFatPct: number) => 370 + 21.6 * (weight * (1 - bodyFatPct / 100));

// Öncelik: cihaz ölçümü > yağ oranı > formül
export const estimateBmr = (input: BmrInput): { bmr: number; source: BmrSource } | null => {
  if (input.measuredBmrKcal) return { bmr: Math.round(input.measuredBmrKcal), source: 'measured' };
  if (input.weightKg && input.bodyFatPct) return { bmr: Math.round(katchMcArdle(input.weightKg, input.bodyFatPct)), source: 'bodyFat' };
  if (input.weightKg && input.heightCm && input.age && input.gender) {
    return { bmr: Math.round(mifflinStJeor(input.weightKg, input.heightCm, input.age, input.gender)), source: 'formula' };
  }
  return null;
};

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export const ACTIVITY_LEVELS: { value: ActivityLevel; factor: number; label: string; desc: string }[] = [
  { value: 'sedentary', factor: 1.2, label: 'Hareketsiz', desc: 'Masa başı, günlük hareket az' },
  { value: 'light', factor: 1.375, label: 'Hafif', desc: 'Günlük yürüyüş, ayakta iş; düzenli spor yok' },
  { value: 'moderate', factor: 1.55, label: 'Orta', desc: 'Haftada 3-5 gün spor' },
  { value: 'active', factor: 1.725, label: 'Yüksek', desc: 'Haftada 6-7 gün yoğun spor veya fiziksel iş' },
];

export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = 'light';

export const toActivityLevel = (value: unknown): ActivityLevel =>
  ACTIVITY_LEVELS.some((l) => l.value === value) ? (value as ActivityLevel) : DEFAULT_ACTIVITY_LEVEL;

export const activityFactor = (level: ActivityLevel) => ACTIVITY_LEVELS.find((l) => l.value === level)!.factor;
export const activityLabel = (level: ActivityLevel) => ACTIVITY_LEVELS.find((l) => l.value === level)!.label;

// Hareketsiz ve hafif düzey düzenli antrenman içermez; kaydedilen egzersiz yalnızca bu düzeylerde ayrıca sayılır
export const countsLoggedExercise = (level: ActivityLevel) => level === 'sedentary' || level === 'light';

export const maintenanceKcal = (bmr: number, level: ActivityLevel) => Math.round(bmr * activityFactor(level));
