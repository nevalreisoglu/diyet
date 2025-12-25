import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const { toast } = useToast();

  // Fetch custom foods when dialog opens
  useEffect(() => {
    if (open && userId) {
      fetchCustomFoods();
    }
  }, [open, userId]);

  const fetchCustomFoods = async () => {
    if (!userId) return;
    
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
    try {
      const { data, error } = await supabase.functions.invoke('lookup-calories', {
        body: { foodName: name.trim() },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.calories) {
        setCalories(data.calories.toString());
        toast({
          title: "Kalori bulundu",
          description: `${name} için tahmini kalori: ${data.calories} kcal`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mealType && name && calories) {
      onAddFood(mealType, { name, calories: parseInt(calories) });
      setName('');
      setCalories('');
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

  const hasCustomFoods = customFoods.length > 0;

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
          {/* Quick add section with tabs if user has custom foods */}
          {hasCustomFoods ? (
            <Tabs defaultValue="custom" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="custom">Listem</TabsTrigger>
                <TabsTrigger value="default">Genel</TabsTrigger>
              </TabsList>
              
              <TabsContent value="custom" className="mt-0">
                <Label className="text-muted-foreground text-sm">PDF'den yüklenen yiyecekler</Label>
                <ScrollArea className="h-32 mt-2">
                  <div className="flex flex-wrap gap-2 pr-4">
                    {customFoods.map((food) => (
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
            </Tabs>
          ) : (
            <div className="space-y-3">
              <Label className="text-muted-foreground">Hızlı Ekle</Label>
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}

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
              <p className="text-xs text-muted-foreground">
                Yiyecek adını girdikten sonra 🔍 butonuna tıklayarak kaloriyi otomatik bulabilirsiniz
              </p>
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
