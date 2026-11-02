import { useRef } from 'react';
import { FileUp, Loader2, Trash2, X, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { UPLOAD_ACCEPT } from '@/lib/filePayload';

const mealOrder: MealType[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];

interface FoodListUploaderProps {
  userId?: string;
}

export const FoodListUploader = ({ userId }: FoodListUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { customFoods, loading, uploading, uploadFile, deleteCustomFood, deleteAllCustomFoods } = useCustomFoods(userId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  const grouped = mealOrder
    .map((mealType) => ({ mealType, foods: customFoods.filter((f) => f.meal_type === mealType) }))
    .filter((g) => g.foods.length > 0);
  const unassigned = customFoods.filter((f) => !f.meal_type || !(f.meal_type in mealTypeLabels));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Diyet Listem
        </CardTitle>
        <CardDescription>
          Diyetisyeninizin verdiği listeyi yükleyin; yiyecekler ana sayfada ilgili öğünün üstünde tek dokunuşla eklenebilir hale gelir.
          PDF, fotoğraf, Excel, Word veya metin dosyası yükleyebilirsiniz. Yeni bir dosya mevcut listenin yerine geçer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={uploading || !userId} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? 'İşleniyor...' : customFoods.length > 0 ? 'Yeni Liste Yükle' : 'Liste Yükle'}
          </Button>
          {customFoods.length > 0 && (
            <Button variant="outline" onClick={deleteAllCustomFoods} disabled={uploading} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Listeyi Temizle
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : customFoods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz liste yüklenmedi.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ mealType, foods }) => (
              <div key={mealType}>
                <p className="text-sm font-medium text-foreground mb-2">
                  {mealTypeIcons[mealType]} {mealTypeLabels[mealType]}
                </p>
                <FoodChips foods={foods} onDelete={deleteCustomFood} />
              </div>
            ))}
            {unassigned.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Öğünü belirsiz</p>
                <FoodChips foods={unassigned} onDelete={deleteCustomFood} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FoodChips = ({
  foods,
  onDelete,
}: {
  foods: { id: string; name: string; calories: number }[];
  onDelete: (id: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {foods.map((food) => (
      <span
        key={food.id}
        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm bg-secondary text-secondary-foreground rounded-full"
      >
        {food.name}
        <span className="text-xs text-muted-foreground">{food.calories} kcal</span>
        <button
          type="button"
          onClick={() => onDelete(food.id)}
          className="p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label={`${food.name} sil`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    ))}
  </div>
);
