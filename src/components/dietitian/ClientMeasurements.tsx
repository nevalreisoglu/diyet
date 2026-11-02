import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchBodyMeasurements, BodyMeasurement } from '@/hooks/useBodyMeasurements';
import { MeasurementHistory } from '@/components/metabolic/MeasurementHistory';
import { todayStr } from '@/lib/dates';

interface Props {
  clientId: string;
}

const fields: { key: string; label: string; unit: string }[] = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Yağ', unit: '%' },
  { key: 'muscle_mass_kg', label: 'Kas', unit: 'kg' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'visceral_fat_level', label: 'İç yağ', unit: '' },
];

export const ClientMeasurements = ({ clientId }: Props) => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [values, setValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    try {
      setMeasurements(await fetchBodyMeasurements(clientId));
    } catch (e) {
      console.error('Client measurements error:', e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const save = async () => {
    const row: Record<string, unknown> = { user_id: clientId, measured_at: date, source: 'dietitian' };
    let any = false;
    for (const f of fields) {
      const n = parseFloat((values[f.key] ?? '').replace(',', '.'));
      if (Number.isFinite(n)) { row[f.key] = n; any = true; }
    }
    if (!any) {
      toast({ title: 'Değer girin', description: 'En az bir ölçüm alanı doldurulmalı.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('body_measurements').upsert(row as any, { onConflict: 'user_id,measured_at' });
      if (error) throw error;
      if (typeof row.weight_kg === 'number' && date >= (measurements[0]?.measured_at ?? '')) {
        await supabase.from('profiles').update({ current_weight_kg: row.weight_kg }).eq('user_id', clientId);
      }
      toast({ title: 'Ölçüm kaydedildi' });
      setValues({});
      setOpen(false);
      await refetch();
    } catch (e) {
      console.error('Save measurement error:', e);
      toast({ title: 'Hata', description: 'Ölçüm kaydedilemedi.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ölçüm gir
            {!open && (
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Yeni ölçüm</Button>
            )}
          </CardTitle>
        </CardHeader>
        {open && (
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tarih</Label>
              <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}{f.unit && ` (${f.unit})`}</Label>
                  <Input inputMode="decimal" value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="h-8" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <MeasurementHistory measurements={measurements} />
      )}
    </div>
  );
};
