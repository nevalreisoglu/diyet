import * as XLSX from 'xlsx';
import { mealTypeLabels, MealType } from '@/types/nutrition';

interface DayData {
  date: string;
  totalCalories: number;
  targetCalories: number;
  totalWater: number;
  targetWater: number;
  totalExercise: number;
  meals: {
    type: MealType;
    calories: number;
    foods: { id: string; name: string; calories: number }[];
  }[];
}

export const exportHistoryToExcel = (history: DayData[]) => {
  // Summary sheet
  const summaryRows = history.map((day) => ({
    'Tarih': day.date,
    'Toplam Kalori (kcal)': day.totalCalories,
    'Hedef Kalori (kcal)': day.targetCalories,
    'Su Tüketimi (ml)': day.totalWater,
    'Hedef Su (ml)': day.targetWater,
    'Egzersiz (dk)': day.totalExercise,
  }));

  // Detail sheet — one row per food item
  const detailRows: Record<string, string | number>[] = [];
  history.forEach((day) => {
    day.meals.forEach((meal) => {
      meal.foods.forEach((food) => {
        detailRows.push({
          'Tarih': day.date,
          'Öğün': mealTypeLabels[meal.type],
          'Yiyecek': food.name,
          'Kalori (kcal)': food.calories,
        });
      });
    });
  });

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Günlük Özet');

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Yiyecek Detay');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `beslenme-gecmisi-${today}.xlsx`);
};
