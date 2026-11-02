import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BodyMeasurement } from '@/hooks/useBodyMeasurements';
import { ClipboardList, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  measurements: BodyMeasurement[];
}

type NumericKey = 'weight_kg' | 'body_fat_pct' | 'muscle_mass_kg' | 'visceral_fat_level' | 'waist_cm' | 'hip_cm' | 'bmr_kcal';

const columns: { key: NumericKey; label: string; unit: string; lowerIsBetter: boolean }[] = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg', lowerIsBetter: true },
  { key: 'body_fat_pct', label: 'Yağ', unit: '%', lowerIsBetter: true },
  { key: 'muscle_mass_kg', label: 'Kas', unit: 'kg', lowerIsBetter: false },
  { key: 'visceral_fat_level', label: 'İç yağ', unit: '', lowerIsBetter: true },
  { key: 'waist_cm', label: 'Bel', unit: 'cm', lowerIsBetter: true },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm', lowerIsBetter: true },
  { key: 'bmr_kcal', label: 'BMR', unit: 'kcal', lowerIsBetter: false },
];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });

const formatDelta = (delta: number) => {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
};

export const MeasurementHistory = ({ measurements }: Props) => {
  const navigate = useNavigate();

  if (measurements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Ölçüm Geçmişi
          </CardTitle>
          <CardDescription>
            Henüz ölçüm yok. InBody/tartı raporunuzu yükleyin; her ölçüm burada kaydedilir ve ikiziniz güncellenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/settings')} className="w-full">Ayarlar'dan Ölçüm Yükle</Button>
        </CardContent>
      </Card>
    );
  }

  const visibleColumns = columns.filter((c) => measurements.some((m) => m[c.key] !== null));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Ölçüm Geçmişi
        </CardTitle>
        <CardDescription>{measurements.length} kayıt · değişimler bir önceki ölçüme göre</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-4 sm:px-2 py-2">Tarih</th>
                {visibleColumns.map((c) => (
                  <th key={c.key} className="text-right font-medium px-2 py-2 whitespace-nowrap">
                    {c.label}{c.unit && c.unit !== '%' ? ` (${c.unit})` : c.unit === '%' ? ' (%)' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => {
                const prev = measurements[i + 1];
                return (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 sm:px-2 py-2 whitespace-nowrap text-foreground">{formatDate(m.measured_at)}</td>
                    {visibleColumns.map((c) => {
                      const value = m[c.key];
                      const prevValue = prev?.[c.key] ?? null;
                      const delta = value !== null && prevValue !== null ? value - prevValue : null;
                      const improved = delta !== null && delta !== 0 && (c.lowerIsBetter ? delta < 0 : delta > 0);
                      return (
                        <td key={c.key} className="px-2 py-2 text-right whitespace-nowrap">
                          {value === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="font-medium text-foreground">{value}</span>
                              {delta !== null && Math.abs(delta) >= 0.05 && (
                                <span className={`inline-flex items-center gap-0.5 text-[11px] ${improved ? 'text-green-600' : 'text-red-500'}`}>
                                  {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                  {formatDelta(delta)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {measurements[0].notes && (
          <p className="text-xs text-muted-foreground px-4 sm:px-0 pt-3">Son ölçüm notu: {measurements[0].notes}</p>
        )}
      </CardContent>
    </Card>
  );
};
