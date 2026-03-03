import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { Search, Loader2, FileText, Check, AlertTriangle, Camera, Mic, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotoFoodRecognizer } from '@/components/PhotoFoodRecognizer';
import { VoiceFoodInput } from '@/components/VoiceFoodInput';
import { useFrequentFoods } from '@/hooks/useFrequentFoods';

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType | null;
  onAddFood: (mealType: MealType, food: { name: string; calories: number }) => void;
  userId?: string;
}

interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  meal_type: string | null;
}

const defaultQuickFoods = [
  { name: 'Elma', calories: 95 },
  { name: 'Muz', calories: 105 },
  { name: 'Yumurta', calories: 78 },
  { name: 'Ekmek (1 dilim)', calories: 80 },
  { name: 'Tavuk göğsü (100g)', calories: 165 },
  { name: 'Pilav (1 porsiyon)', calories: 200 },
  { name: 'Salata', calories: 50 },
  { name: 'Yoğurt (1 kase)', calories: 150 },
];

export const AddFoodDialog = ({
  open,
  onOpenChange,
  mealType,
  onAddFood,
  userId,
}: AddFoodDialogProps) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [loadingCustomFoods, setLoadingCustomFoods] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{ portion?: string; confidence?: string; source?: string; cached?: boolean } | null>(null);
  const [originalCalories, setOriginalCalories] = useState<number | null>(null);
  const { toast } = useToast();
  const { foods: frequentFoods, loading: loadingFrequent } = useFrequentFoods(userId, open ? mealType : null);

  // Fetch custom foods when dialog opens
  useEffect(() => {
    if (open && userId) {
      fetchCustomFoods();
    }
  }, [open, userId]);

  const fetchCustomFoods = async () => {
    if (!userId) return;
    
    setLoadingCustomFoods(true);
    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setCustomFoods(data || []);
    } catch (error) {
      console.error('Error fetching custom foods:', error);
    } finally {
      setLoadingCustomFoods(false);
    }
  };

  const handleLookupCalories = async () => {
    if (!name.trim()) {
      toast({
        title: "Hata",
        description: "Önce yiyecek adını girin",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUp(true);
    setLookupInfo(null);
    setOriginalCalories(null);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-calories', {
        body: { foodName: name.trim() },
      });

      if (error) {
        // data still contains the function's JSON response body even on non-2xx
        const actualError = data?.error || error.message;
        throw new Error(actualError);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.calories) {
        setCalories(data.calories.toString());
        setOriginalCalories(data.calories);
        setLookupInfo({
          portion: data.portion,
          confidence: data.confidence,
          source: data.source,
          cached: data.cached,
        });
        const sourceLabel = data.cached ? '(önbellekten)' : '(AI)';
        toast({
          title: "Kalori bulundu",
          description: `${name} için: ${data.calories} kcal ${sourceLabel}${data.portion ? ` - ${data.portion}` : ''}`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Kalori arama hatası:', error);
      toast({
        title: "Kalori bulunamadı",
        description: error instanceof Error ? error.message : "Kalori araması başarısız oldu",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mealType && name && calories) {
      const cal = parseInt(calories);
      // If user changed the AI value, save correction to cache
      if (originalCalories && cal !== originalCalories && userId) {
        try {
          await supabase.functions.invoke('lookup-calories', {
            body: { foodName: name.trim(), correctedCalories: cal },
          });
        } catch (err) {
          console.error('Failed to save correction:', err);
        }
      }
      onAddFood(mealType, { name, calories: cal });
      setName('');
      setCalories('');
      setLookupInfo(null);
      setOriginalCalories(null);
      onOpenChange(false);
    }
  };

  const handleQuickAdd = (food: { name: string; calories: number }) => {
    if (mealType) {
      onAddFood(mealType, food);
      onOpenChange(false);
    }
  };

  if (!mealType) return null;

  const hasCustomFoods = customFoods.length > 0 || loadingCustomFoods;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span className="text-2xl">{mealTypeIcons[mealType]}</span>
            {mealTypeLabels[mealType]} - Yiyecek Ekle
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Sık kullanılanlar */}
          {(frequentFoods.length > 0 || loadingFrequent) && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sık Kullandıkların</span>
              </div>
              {loadingFrequent ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {frequentFoods.map((food) => (
                    <button
                      key={food.name}
                      onClick={() => handleQuickAdd({ name: food.name, calories: food.calories })}
                      className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors flex items-center gap-1.5"
                      title={`${food.calories} kcal · ${food.count}x kullanıldı`}
                    >
                      {food.name}
                      <span className="text-xs opacity-60">{food.calories}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick add section with tabs */}
          <Tabs defaultValue="custom" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3">
              <TabsTrigger value="custom">Listem</TabsTrigger>
              <TabsTrigger value="default">Genel</TabsTrigger>
              <TabsTrigger value="photo" className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Foto
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1">
                <Mic className="h-3 w-3" />
                Ses
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="custom" className="mt-0">
              <Label className="text-muted-foreground text-sm">Bu öğün için yiyecekler</Label>
              <ScrollArea className="h-32 mt-2">
                {loadingCustomFoods ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (() => {
                  // Filter foods by meal type
                  const filteredFoods = customFoods.filter(
                    (food) => food.meal_type === mealType || food.meal_type === null
                  );
                  const mealSpecificFoods = customFoods.filter(
                    (food) => food.meal_type === mealType
                  );
                  const unassignedFoods = customFoods.filter(
                    (food) => food.meal_type === null
                  );
                  
                  return mealSpecificFoods.length > 0 || unassignedFoods.length > 0 ? (
                    <div className="space-y-3 pr-4">
                      {mealSpecificFoods.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {mealSpecificFoods.map((food) => (
                            <button
                              key={food.id}
                              onClick={() => handleQuickAdd({ name: food.name, calories: food.calories })}
                              className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                              title={`${food.calories} kcal`}
                            >
                              {food.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {unassignedFoods.length > 0 && mealSpecificFoods.length > 0 && (
                        <div className="text-xs text-muted-foreground pt-2 border-t border-border">Diğer yiyecekler</div>
                      )}
                      {unassignedFoods.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {unassignedFoods.map((food) => (
                            <button
                              key={food.id}
                              onClick={() => handleQuickAdd({ name: food.name, calories: food.calories })}
                              className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full transition-colors"
                              title={`${food.calories} kcal`}
                            >
                              {food.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm">
                      <FileText className="h-6 w-6 mb-2 opacity-50" />
                      <p>Bu öğün için yiyecek yok</p>
                      <p className="text-xs">Ana sayfadan PDF yükleyin</p>
                    </div>
                  );
                })()}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="default" className="mt-0">
              <Label className="text-muted-foreground text-sm">Hızlı Ekle</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaultQuickFoods.map((food) => (
                  <button
                    key={food.name}
                    onClick={() => handleQuickAdd(food)}
                    className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full transition-colors"
                  >
                    {food.name}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="photo" className="mt-0">
              <Label className="text-muted-foreground text-sm">Yemeğin fotoğrafını çekin veya galeriden seçin</Label>
              <div className="mt-2">
                <PhotoFoodRecognizer
                  onAddFood={(food) => {
                    if (mealType) {
                      onAddFood(mealType, food);
                    }
                  }}
                  onAddAllFoods={(foods) => {
                    if (mealType) {
                      foods.forEach(food => onAddFood(mealType, food));
                      onOpenChange(false);
                    }
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="voice" className="mt-0">
              <VoiceFoodInput
                onAddFood={(food) => {
                  if (mealType) {
                    onAddFood(mealType, food);
                    onOpenChange(false);
                  }
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          {/* Custom food form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Yiyecek Adı</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="örn: Tavuk sote"
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories" className="text-foreground">Kalori (kcal)</Label>
              <div className="flex gap-2">
                <Input
                  id="calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="örn: 250"
                  className="bg-background border-input flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleLookupCalories}
                  disabled={isLookingUp || !name.trim()}
                  title="Kaloriyi otomatik bul"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {lookupInfo && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {lookupInfo.confidence === 'high' && (
                      <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" /> Yüksek güven</span>
                    )}
                    {lookupInfo.confidence === 'medium' && (
                      <span className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="h-3 w-3" /> Orta güven</span>
                    )}
                    {lookupInfo.confidence === 'low' && (
                      <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" /> Düşük güven</span>
                    )}
                    {lookupInfo.cached && (
                      <span className="text-muted-foreground">• Önbellekten</span>
                    )}
                    {lookupInfo.source === 'user' && (
                      <span className="text-muted-foreground">• Doğrulanmış</span>
                    )}
                  </div>
                  {lookupInfo.portion && (
                    <p className="text-xs text-muted-foreground">Porsiyon: {lookupInfo.portion}</p>
                  )}
                  {originalCalories && parseInt(calories) !== originalCalories && (
                    <p className="text-xs text-primary">
                      ✓ Değeri düzelttiniz ({originalCalories} → {calories}). Ekle'ye basınca kaydedilecek.
                    </p>
                  )}
                </div>
              )}
              {!lookupInfo && (
                <p className="text-xs text-muted-foreground">
                  Yiyecek adını girdikten sonra 🔍 butonuna tıklayarak kaloriyi otomatik bulabilirsiniz
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              disabled={!name || !calories}
            >
              Ekle
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
