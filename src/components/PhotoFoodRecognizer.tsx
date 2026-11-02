import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Check, AlertTriangle, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMealRecognition, RecognizedFood } from '@/hooks/useMealRecognition';

type AddedFood = { name: string; calories: number; protein?: number; carbs?: number; fat?: number };

interface PhotoFoodRecognizerProps {
  onAddFood: (food: AddedFood) => void;
  onAddAllFoods: (foods: AddedFood[]) => void;
}

const toAddedFood = (food: RecognizedFood): AddedFood => ({
  name: food.portion ? `${food.name} (${food.portion})` : food.name,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
});

const confidenceConfig = {
  high: { label: 'Yüksek', icon: Check, className: 'text-green-600' },
  medium: { label: 'Orta', icon: AlertTriangle, className: 'text-yellow-600' },
  low: { label: 'Düşük', icon: AlertTriangle, className: 'text-red-500' },
};

export const PhotoFoodRecognizer = ({ onAddFood, onAddAllFoods }: PhotoFoodRecognizerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addedFoods, setAddedFoods] = useState<Set<number>>(new Set());
  const { recognizing, result, recognizeFromImage, reset } = useMealRecognition();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAddedFoods(new Set());

    await recognizeFromImage(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAddSingle = (food: RecognizedFood, index: number) => {
    onAddFood(toAddedFood(food));
    setAddedFoods(prev => new Set(prev).add(index));
  };

  const handleAddAll = () => {
    if (!result) return;
    const foods = result.foods.map(toAddedFood);
    onAddAllFoods(foods);
    setAddedFoods(new Set(result.foods.map((_, i) => i)));
  };

  const handleReset = () => {
    reset();
    setPreviewUrl(null);
    setAddedFoods(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Camera / Gallery Buttons */}
      {!result && !recognizing && (
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Fotoğraf Çek
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Galeriden Seç
          </Button>
        </div>
      )}

      {/* Loading State */}
      {recognizing && (
        <div className="flex flex-col items-center gap-3 py-6">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Yüklenen fotoğraf"
              className="w-32 h-32 object-cover rounded-xl opacity-75"
            />
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Yemekler tanınıyor...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !recognizing && (
        <div className="space-y-3">
          {/* Preview + Description */}
          <div className="flex gap-3 items-start">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Tanınan yemek"
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              {result.mealDescription && (
                <p className="text-sm text-foreground font-medium">{result.mealDescription}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {result.foods.length} yiyecek bulundu — Toplam {result.totalCalories} kcal
              </p>
            </div>
          </div>

          {/* Food List */}
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {result.foods.map((food, index) => {
                const conf = confidenceConfig[food.confidence];
                const ConfIcon = conf.icon;
                const isAdded = addedFoods.has(index);

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2.5 rounded-xl transition-colors ${
                      isAdded ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{food.name}</p>
                        <ConfIcon className={`h-3 w-3 flex-shrink-0 ${conf.className}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {food.portion} — {food.calories} kcal
                        {food.protein > 0 && ` • P: ${food.protein}g`}
                        {food.carbs > 0 && ` • K: ${food.carbs}g`}
                        {food.fat > 0 && ` • Y: ${food.fat}g`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={isAdded ? 'ghost' : 'secondary'}
                      size="sm"
                      className="flex-shrink-0 h-8"
                      disabled={isAdded}
                      onClick={() => handleAddSingle(food, index)}
                    >
                      {isAdded ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Ekle
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 gradient-primary text-primary-foreground hover:opacity-90"
              onClick={handleAddAll}
              disabled={addedFoods.size === result.foods.length}
            >
              {addedFoods.size === result.foods.length ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Tümü Eklendi
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Tümünü Ekle ({result.totalCalories} kcal)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="Yeni fotoğraf"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
