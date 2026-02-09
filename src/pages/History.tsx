import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useHistoryData } from '@/hooks/useHistoryData';
import { useHistoryMutations } from '@/hooks/useHistoryMutations';
import { WeeklyCharts } from '@/components/WeeklyCharts';
import { AddFoodDialog } from '@/components/AddFoodDialog';
import { Loader2, ChevronDown, ChevronUp, Droplets, Flame, Dumbbell, ArrowLeft, Plus, Minus, X, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { mealTypeLabels, mealTypeIcons, MealType } from '@/types/nutrition';
import { exportHistoryToExcel } from '@/utils/exportToExcel';

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { history, loading, refetch } = useHistoryData(user?.id, 14);
  const { addFoodToDate, removeFoodFromDate, addWaterToDate, removeWaterFromDate } = useHistoryMutations(user?.id, refetch);
  
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addFoodDialogOpen, setAddFoodDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'Bugün';
    if (dateStr === yesterday) return 'Dün';

    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleOpenAddFood = (date: string, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setAddFoodDialogOpen(true);
  };

  const handleAddFood = (mealType: MealType, food: { name: string; calories: number }) => {
    if (selectedDate) {
      addFoodToDate(selectedDate, mealType, food);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-9 w-9 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-foreground">Geçmiş</h2>
              <p className="text-sm text-muted-foreground">Son 14 günün detaylı görünümü</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportHistoryToExcel(history)}
            disabled={loading || history.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Weekly Charts */}
            <WeeklyCharts data={history} />

            <h3 className="text-lg font-semibold text-foreground pt-4">Günlük Detaylar</h3>
            <div className="space-y-3">
            {history.map((day) => {
              const isExpanded = expandedDays.has(day.date);
              const caloriePercentage = Math.min(100, (day.totalCalories / day.targetCalories) * 100);
              const waterPercentage = Math.min(100, (day.totalWater / day.targetWater) * 100);
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={day.date}
                  className={`bg-card rounded-2xl border border-border overflow-hidden ${
                    isToday ? 'ring-2 ring-primary/50' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground capitalize">
                          {formatDate(day.date)}
                        </h3>
                        {isToday && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Bugün
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-muted-foreground">
                            {day.totalCalories} / {day.targetCalories} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-muted-foreground">
                            {day.totalWater} / {day.targetWater} ml
                          </span>
                        </div>
                        {day.totalExercise > 0 && (
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">
                              {day.totalExercise} dk
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Progress value={caloriePercentage} className="h-1.5 flex-1 bg-secondary" />
                        <Progress value={waterPercentage} className="h-1.5 flex-1 bg-secondary [&>div]:bg-blue-500" />
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground ml-4" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground ml-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {/* Meal sections with add buttons */}
                      {(['breakfast', 'lunch', 'dinner', 'snack1', 'snack2', 'snack3'] as MealType[]).map((mealType) => {
                        const mealData = day.meals.find((m) => m.type === mealType);
                        const hasFoods = mealData && mealData.foods.length > 0;

                        return (
                          <div key={mealType} className="bg-secondary/30 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{mealTypeIcons[mealType]}</span>
                                <span className="font-medium text-foreground">
                                  {mealTypeLabels[mealType]}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasFoods && (
                                  <span className="text-sm font-medium text-primary">
                                    {mealData.calories} kcal
                                  </span>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                  onClick={() => handleOpenAddFood(day.date, mealType)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {hasFoods ? (
                              <div className="space-y-1">
                                {mealData.foods.map((food) => (
                                  <div
                                    key={food.id}
                                    className="flex items-center justify-between text-sm group"
                                  >
                                    <span className="text-muted-foreground">{food.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{food.calories} kcal</span>
                                      <button
                                        onClick={() => removeFoodFromDate(food.id)}
                                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Kayıt yok</p>
                            )}
                          </div>
                        );
                      })}

                      {/* Water section with add/remove buttons */}
                      <div className="bg-blue-500/10 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-5 w-5 text-blue-500" />
                            <span className="font-medium text-foreground">Su Tüketimi</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-500">
                              {day.totalWater} ml ({Math.floor(day.totalWater / 250)} bardak)
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                                onClick={() => removeWaterFromDate(day.date)}
                                disabled={day.totalWater <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                                onClick={() => addWaterToDate(day.date)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </>
        )}
      </main>

      {/* Add Food Dialog */}
      <AddFoodDialog
        open={addFoodDialogOpen}
        onOpenChange={setAddFoodDialogOpen}
        mealType={selectedMealType}
        onAddFood={handleAddFood}
        userId={user?.id}
      />
    </div>
  );
};

export default History;
