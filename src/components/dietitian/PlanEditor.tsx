import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, X, CopyPlus, ListPlus, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { usePlanDay, NewPlanItem } from '@/hooks/usePlanDay';
import { addDays, formatDateLong, todayStr } from '@/lib/dates';

const mealTypes: MealType[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];

interface Props {
  dietitianId: string;
  clientId: string;
  date: string;
  onDateChange: (date: string) => void;
}

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const PlanEditor = ({ dietitianId, clientId, date, onDateChange }: Props) => {
  const plan = usePlanDay(dietitianId, clientId, date);
  const [note, setNote] = useState('');
  const [addingFor, setAddingFor] = useState<MealType | null>(null);
  const [draft, setDraft] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [copyDate, setCopyDate] = useState(addDays(date, 1));

  useEffect(() => {
    setNote(plan.day?.note ?? '');
  }, [plan.day?.note, date]);

  const submitDraft = async () => {
    if (!addingFor || !draft.name.trim()) return;
    const item: NewPlanItem = {
      meal_type: addingFor,
      name: draft.name.trim(),
      calories: Math.round(parseNum(draft.calories) ?? 0),
      protein: parseNum(draft.protein),
      carbs: parseNum(draft.carbs),
      fat: parseNum(draft.fat),
    };
    await plan.addItems([item]);
    setDraft({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const totalCalories = plan.items.reduce((s, i) => s + i.calories, 0);
  const isToday = date === todayStr();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(date, -1))} aria-label="Önceki gün">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <Input type="date" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} className="h-8 text-center w-40 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1 capitalize">{formatDateLong(date)}{isToday ? ' · bugün' : ''}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(date, 1))} aria-label="Sonraki gün">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={plan.importClientList} disabled={plan.saving} className="gap-1.5">
          <ListPlus className="h-4 w-4" /> Danışanın listesinden al
        </Button>
        {plan.items.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => plan.copyToNextDays(7)} disabled={plan.saving} className="gap-1.5">
              <CopyPlus className="h-4 w-4" /> Sonraki 7 güne kopyala
            </Button>
            <div className="flex items-center gap-1">
              <Input type="date" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} className="h-8 w-36" />
              <Button variant="outline" size="sm" onClick={() => copyDate && plan.copyTo([copyDate])} disabled={plan.saving || !copyDate}>
                Bu güne kopyala
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.confirm('Bu günün planı silinsin mi?') && plan.clearDay()} disabled={plan.saving} className="gap-1.5 text-destructive hover:text-destructive ml-auto">
              <Trash2 className="h-4 w-4" /> Günü temizle
            </Button>
          </>
        )}
      </div>

      {plan.loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mealTypes.map((mealType) => {
            const items = plan.items.filter((i) => i.meal_type === mealType);
            const mealCal = items.reduce((s, i) => s + i.calories, 0);
            const open = addingFor === mealType;
            return (
              <Card key={mealType}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{mealTypeIcons[mealType]} {mealTypeLabels[mealType]}</span>
                    <span className="text-xs font-normal text-muted-foreground">{mealCal} kcal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg px-2.5 py-1.5">
                      <span className="flex-1 min-w-0 truncate text-foreground">{it.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{it.calories} kcal</span>
                      <button type="button" onClick={() => plan.removeItem(it.id)} className="p-0.5 rounded hover:text-destructive" aria-label="Sil">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {open ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); submitDraft(); }}
                      className="space-y-2 rounded-lg border border-border p-2"
                    >
                      <Input autoFocus placeholder="Yiyecek (örn. Haşlanmış yumurta (2 adet))" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8" />
                      <div className="grid grid-cols-4 gap-1.5">
                        <Input placeholder="kcal" inputMode="numeric" value={draft.calories} onChange={(e) => setDraft({ ...draft, calories: e.target.value })} className="h-8 text-xs" />
                        <Input placeholder="P g" inputMode="decimal" value={draft.protein} onChange={(e) => setDraft({ ...draft, protein: e.target.value })} className="h-8 text-xs" />
                        <Input placeholder="K g" inputMode="decimal" value={draft.carbs} onChange={(e) => setDraft({ ...draft, carbs: e.target.value })} className="h-8 text-xs" />
                        <Input placeholder="Y g" inputMode="decimal" value={draft.fat} onChange={(e) => setDraft({ ...draft, fat: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={plan.saving || !draft.name.trim()} className="flex-1">Ekle</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setAddingFor(null)}>Kapat</Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingFor(mealType)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Yiyecek ekle
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-primary" /> Güne not</span>
            <span className="text-xs font-normal text-muted-foreground">Toplam {totalCalories} kcal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Danışanın ana sayfasında görünür. Örn: Bugün su hedefini 2,5 L'ye çıkar."
            rows={2}
          />
          <Button size="sm" variant="outline" onClick={() => plan.saveNote(note)} disabled={plan.saving || note === (plan.day?.note ?? '')}>
            Notu kaydet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
