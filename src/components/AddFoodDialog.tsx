import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType | null;
  onAddFood: (mealType: MealType, food: { name: string; calories: number }) => void;
}

const quickFoods = [
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
}: AddFoodDialogProps) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span className="text-2xl">{mealTypeIcons[mealType]}</span>
            {mealTypeLabels[mealType]} - Yiyecek Ekle
          </DialogTitle>
        </DialogHeader>

        {/* Quick add section */}
        <div className="space-y-3">
          <Label className="text-muted-foreground">Hızlı Ekle</Label>
          <div className="flex flex-wrap gap-2">
            {quickFoods.map((food) => (
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
      </DialogContent>
    </Dialog>
  );
};
