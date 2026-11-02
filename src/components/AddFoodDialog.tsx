import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { Search, Loader2, Check, AlertTriangle, Camera, Mic, TrendingUp, Sparkles, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhotoFoodRecognizer } from '@/components/PhotoFoodRecognizer';
import { VoiceFoodInput } from '@/components/VoiceFoodInput';
import { useFrequentFoods } from '@/hooks/useFrequentFoods';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PremiumGate } from '@/components/PremiumGate';

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType | null;
  onAddFood: (mealType: MealType, food: { name: string; calories: number }) => void;
  userId?: string;
}

type Mode = 'search' | 'photo' | 'voice';

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

const MAX_SUGGESTIONS = 10;
const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

export const AddFoodDialog = ({
  open,
  onOpenChange,
  mealType,
  onAddFood,
  userId,
}: AddFoodDialogProps) => {
  const [mode, setMode] = useState<Mode>('search');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{ portion?: string; confidence?: string; source?: string; cached?: boolean } | null>(null);
  const [originalCalories, setOriginalCalories] = useState<number | null>(null);
  const { toast } = useToast();
  const { foods: frequentFoods, loading: loadingFrequent } = useFrequentFoods(userId, open ? mealType : null);
  const { isPremium, createCheckout } = useSubscriptionContext();

  useEffect(() => {
    if (!open) {
      setMode('search');
      setName('');
      setCalories('');
      setLookupInfo(null);
      setOriginalCalories(null);
    }
  }, [open]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const all: { name: string; calories: number; frequent: boolean }[] = [];
    for (const f of frequentFoods) {
      const key = normalize(f.name);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ name: f.name, calories: f.calories, frequent: true });
    }
    for (const f of defaultQuickFoods) {
      const key = normalize(f.name);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ ...f, frequent: false });
    }
    const query = normalize(name);
    const filtered = query ? all.filter((f) => normalize(f.name).includes(query)) : all;
    return filtered.slice(0, MAX_SUGGESTIONS);
  }, [frequentFoods, name]);

  const handleLookupCalories = async () => {
    if (!name.trim()) return;

    setIsLookingUp(true);
    setLookupInfo(null);
    setOriginalCalories(null);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-calories', {
        body: { foodName: name.trim() },
      });

      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.calories) {
        setCalories(data.calories.toString());
        setOriginalCalories(data.calories);
        setLookupInfo({
          portion: data.portion,
          confidence: data.confidence,
          source: data.source,
          cached: data.cached,
        });
      }
    } catch (error) {
      console.error('Kalori arama hatası:', error);
      toast({
        title: 'Kalori bulunamadı',
        description: error instanceof Error ? error.message : 'Kalori araması başarısız oldu',
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!mealType || !name.trim() || !calories) return;

    const cal = parseInt(calories);
    if (originalCalories && cal !== originalCalories && userId) {
      try {
        await supabase.functions.invoke('lookup-calories', {
          body: { foodName: name.trim(), correctedCalories: cal },
        });
      } catch (err) {
        console.error('Failed to save correction:', err);
      }
    }
    onAddFood(mealType, { name: name.trim(), calories: cal });
    onOpenChange(false);
  };

  const handleQuickAdd = (food: { name: string; calories: number }) => {
    if (!mealType) return;
    onAddFood(mealType, food);
    onOpenChange(false);
  };

  if (!mealType) return null;

  const toggleMode = (target: Mode) => setMode((m) => (m === target ? 'search' : target));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span className="text-2xl">{mealTypeIcons[mealType]}</span>
            {mealTypeLabels[mealType]}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setLookupInfo(null);
                  setOriginalCalories(null);
                }}
                onFocus={() => setMode('search')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (calories) handleSubmit();
                  else handleLookupCalories();
                }}
                placeholder="Yiyecek ara veya yaz…"
                autoFocus
                className="pl-9 bg-background border-input"
              />
            </div>
            <Button
              type="button"
              variant={mode === 'photo' ? 'default' : 'outline'}
              size="icon"
              onClick={() => toggleMode('photo')}
              title="Fotoğraftan tanı"
              aria-label="Fotoğraftan tanı"
            >
              {isPremium ? <Camera className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant={mode === 'voice' ? 'default' : 'outline'}
              size="icon"
              onClick={() => toggleMode('voice')}
              title="Sesle söyle"
              aria-label="Sesle söyle"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>

          {mode === 'photo' && (
            <PremiumGate
              isPremium={isPremium}
              createCheckout={createCheckout}
              featureLabel="AI Fotoğraf Tanıma"
              compact
              bullets={[
                'Yemek fotoğrafından otomatik kalori tespiti',
                'Protein, karb ve yağ analizi',
                'Çoklu yemek tanıma',
              ]}
            >
              <PhotoFoodRecognizer
                onAddFood={(food) => onAddFood(mealType, food)}
                onAddAllFoods={(foods) => {
                  foods.forEach((food) => onAddFood(mealType, food));
                  onOpenChange(false);
                }}
              />
            </PremiumGate>
          )}

          {mode === 'voice' && (
            <VoiceFoodInput
              onAddFood={(food) => {
                onAddFood(mealType, food);
                onOpenChange(false);
              }}
            />
          )}

          {mode === 'search' && (
            <>
              {loadingFrequent && !name && (
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((food) => (
                    <button
                      key={food.name}
                      type="button"
                      onClick={() => handleQuickAdd({ name: food.name, calories: food.calories })}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 ${
                        food.frequent
                          ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                          : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                      }`}
                      title={food.frequent ? 'Sık kullandığınız' : undefined}
                    >
                      {food.frequent && <TrendingUp className="h-3 w-3" />}
                      {food.name}
                      <span className="text-xs opacity-60">{food.calories}</span>
                    </button>
                  ))}
                </div>
              )}

              {name.trim() && (
                <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{name.trim()}</span> için kalori
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="kcal"
                      className="bg-background border-input flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLookupCalories}
                      disabled={isLookingUp}
                      className="gap-1.5 shrink-0"
                    >
                      {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Bul
                    </Button>
                  </div>
                  {lookupInfo && (
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {lookupInfo.confidence === 'high' && (
                        <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" /> Yüksek güven</span>
                      )}
                      {lookupInfo.confidence === 'medium' && (
                        <span className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="h-3 w-3" /> Orta güven</span>
                      )}
                      {lookupInfo.confidence === 'low' && (
                        <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" /> Düşük güven</span>
                      )}
                      {lookupInfo.portion && <span>Porsiyon: {lookupInfo.portion}</span>}
                      {lookupInfo.cached && <span>Önbellekten</span>}
                      {lookupInfo.source === 'user' && <span>Doğrulanmış</span>}
                      {originalCalories && calories && parseInt(calories) !== originalCalories && (
                        <span className="text-primary">Düzelttiniz: {originalCalories} → {calories}</span>
                      )}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                    disabled={!calories}
                  >
                    Ekle
                  </Button>
                </form>
              )}

              {!name.trim() && !loadingFrequent && suggestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Yiyecek adını yazın</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
