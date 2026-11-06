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

// Hareketsiz bakım: egzersiz ayrıca kaydedildiği için TDEE yerine bu kullanılır
export const SEDENTARY_FACTOR = 1.2;
// Orta aktivite varsayımıyla TDEE (profil kartı için)
export const MODERATE_FACTOR = 1.55;
