import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, X, CopyPlus, ListPlus, Trash2, StickyNote, Sparkles, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import { usePlanDay } from '@/hooks/usePlanDay';
import { usePlanSuggestions } from '@/hooks/usePlanSuggestions';
import { addDays, formatDateLong, todayStr } from '@/lib/dates';

const mealTypes: MealType[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];

interface Props {
  dietitianId: string;
  clientId: string;
  date: string;
  onDateChange: (date: string) => void;
}

const splitEntries = (value: string) =>
  value.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

export const PlanEditor = ({ dietitianId, clientId, date, onDateChange }: Props) => {
  const plan = usePlanDay(dietitianId, clientId, date);
  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState<Partial<Record<MealType, string>>>({});
  const [copyDate, setCopyDate] = useState(addDays(date, 1));
  const [textOpen, setTextOpen] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [editingCal, setEditingCal] = useState<{ id: string; value: string } | null>(null);
  const listId = useId();
  const suggestions = usePlanSuggestions(clientId, plan.items.length);

  useEffect(() => {
    setNote(plan.day?.note ?? '');
  }, [plan.day?.note, date]);

  const addDraft = async (mealType: MealType) => {
    const names = splitEntries(drafts[mealType] ?? '');
    if (names.length === 0) return;
    await plan.addItems(names.map((name) => ({ meal_type: mealType, name, calories: 0 })));
    setDrafts((d) => ({ ...d, [mealType]: '' }));
  };

  const missingCount = plan.items.filter((i) => !i.calories).length;
  const totalCalories = plan.items.reduce((s, i) => s + i.calories, 0);
  const isToday = date === todayStr();

  return (
    <div className="space-y-4">
      <datalist id={listId}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>

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
        <Button variant={textOpen ? 'default' : 'outline'} size="sm" onClick={() => setTextOpen((v) => !v)} className="gap-1.5">
          <FileText className="h-4 w-4" /> Günü yazarak gir
        </Button>
        <Button variant="outline" size="sm" onClick={plan.importClientList} disabled={plan.saving} className="gap-1.5">
          <ListPlus className="h-4 w-4" /> Danışanın listesinden al
        </Button>
        {missingCount > 0 && (
          <Button size="sm" onClick={plan.estimateMissing} disabled={plan.saving} className="gap-1.5">
            {plan.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Kalorileri hesapla ({missingCount})
          </Button>
        )}
      </div>

      {textOpen && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Günün planını serbest yazın; AI öğünlere dağıtır ve kalorileri hesaplar. Örn: <span className="italic">Kahvaltı: 2 yumurta, peynir, domates · Ara: 1 elma · Öğle: ızgara tavuk 150 g, bulgur 4 kaşık</span>
            </p>
            <Textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={5} placeholder={'Kahvaltı: ...\nAra öğün: ...\nÖğle: ...'} />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={plan.saving || !freeText.trim()}
                onClick={async () => {
                  await plan.parseText(freeText);
                  setFreeText('');
                  setTextOpen(false);
                }}
                className="gap-1.5"
              >
                {plan.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Öğünlere dağıt
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTextOpen(false)}>Kapat</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mealTypes.map((mealType) => {
            const items = plan.items.filter((i) => i.meal_type === mealType);
            const mealCal = items.reduce((s, i) => s + i.calories, 0);
            return (
              <Card key={mealType}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{mealTypeIcons[mealType]} {mealTypeLabels[mealType]}</span>
                    <span className="text-xs font-normal text-muted-foreground">{mealCal > 0 ? `${mealCal} kcal` : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg px-2.5 py-1.5">
                      <span className="flex-1 min-w-0 truncate text-foreground">{it.name}</span>
                      {editingCal?.id === it.id ? (
                        <Input
                          autoFocus
                          inputMode="numeric"
                          value={editingCal.value}
                          onChange={(e) => setEditingCal({ id: it.id, value: e.target.value })}
                          onBlur={() => {
                            const n = parseInt(editingCal.value, 10);
                            if (Number.isFinite(n) && n !== it.calories) plan.updateCalories(it.id, n);
                            setEditingCal(null);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingCal(null); }}
                          className="h-6 w-16 text-xs text-right px-1"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCal({ id: it.id, value: it.calories ? String(it.calories) : '' })}
                          className={`text-xs shrink-0 tabular-nums hover:underline ${it.calories ? 'text-muted-foreground' : 'text-amber-600'}`}
                          title="Kaloriyi düzenle"
                        >
                          {it.calories ? `${it.calories} kcal` : '— kcal'}
                        </button>
                      )}
                      <button type="button" onClick={() => plan.removeItem(it.id)} className="p-0.5 rounded hover:text-destructive" aria-label="Sil">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <form
                    onSubmit={(e) => { e.preventDefault(); addDraft(mealType); }}
                    className="flex gap-1.5"
                  >
                    <Input
                      list={listId}
                      value={drafts[mealType] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [mealType]: e.target.value }))}
                      placeholder="Yiyecek yaz, Enter'a bas (virgülle birden çok)"
                      className="h-8 text-sm"
                    />
                    <Button type="submit" size="icon" variant="outline" className="h-8 w-8 shrink-0" disabled={plan.saving || !(drafts[mealType] ?? '').trim()} aria-label="Ekle">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {plan.items.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
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
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-primary" /> Güne not</span>
            <span className="text-xs font-normal text-muted-foreground">Toplam {totalCalories} kcal{missingCount > 0 ? ` · ${missingCount} satır hesaplanmadı` : ''}</span>
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
