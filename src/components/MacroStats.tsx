import { MacroTotals, macroTargetsFromCalories, round1 } from '@/lib/macros';

interface MacroStatsProps {
  totals: MacroTotals;
  targetCalories: number;
  itemsWithoutMacros: number;
}

const tiles: { key: keyof MacroTotals; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Karbonhidrat' },
  { key: 'fat', label: 'Yağ' },
];

export const MacroStats = ({ totals, targetCalories, itemsWithoutMacros }: MacroStatsProps) => {
  const targets = macroTargetsFromCalories(targetCalories);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card animate-fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Makrolar</h2>
        <span className="text-[11px] text-muted-foreground">hedef: kalori hedefinin %30 / %40 / %30'u</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => {
          const value = round1(totals[t.key]);
          const target = targets[t.key];
          const ratio = target > 0 ? value / target : 0;
          const pct = Math.min(ratio * 100, 100);
          const over = ratio > 1.1;
          return (
            <div key={t.key} className="space-y-1.5" role="group" aria-label={`${t.label}: ${value} / ${target} g`}>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-base font-semibold text-foreground leading-none">
                {value}
                <span className="text-xs font-normal text-muted-foreground"> / {target} g</span>
              </p>
              <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${over ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {itemsWithoutMacros > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {itemsWithoutMacros} kayıtta makro bilgisi yok (elle girilen yiyecekler). Liste, fotoğraf ve barkodla eklenenlerde makrolar otomatik gelir.
        </p>
      )}
    </div>
  );
};
