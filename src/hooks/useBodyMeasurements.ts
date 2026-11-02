import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { prepareFilePayload } from '@/lib/filePayload';

export interface BodyMeasurement {
  id: string;
  measured_at: string;
  source: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  visceral_fat_level: number | null;
  body_water_pct: number | null;
  bone_mass_kg: number | null;
  bmr_kcal: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  raw: { extra?: { label: string; value: number; unit?: string }[] } | null;
  created_at: string;
}

const toMeasurement = (row: any): BodyMeasurement => ({
  ...row,
  weight_kg: row.weight_kg === null ? null : Number(row.weight_kg),
  body_fat_pct: row.body_fat_pct === null ? null : Number(row.body_fat_pct),
  muscle_mass_kg: row.muscle_mass_kg === null ? null : Number(row.muscle_mass_kg),
  bmi: row.bmi === null ? null : Number(row.bmi),
  visceral_fat_level: row.visceral_fat_level === null ? null : Number(row.visceral_fat_level),
  body_water_pct: row.body_water_pct === null ? null : Number(row.body_water_pct),
  bone_mass_kg: row.bone_mass_kg === null ? null : Number(row.bone_mass_kg),
  waist_cm: row.waist_cm === null ? null : Number(row.waist_cm),
  hip_cm: row.hip_cm === null ? null : Number(row.hip_cm),
  chest_cm: row.chest_cm === null ? null : Number(row.chest_cm),
  arm_cm: row.arm_cm === null ? null : Number(row.arm_cm),
  thigh_cm: row.thigh_cm === null ? null : Number(row.thigh_cm),
});

export const fetchBodyMeasurements = async (userId: string, limit = 50): Promise<BodyMeasurement[]> => {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(toMeasurement);
};

export const useBodyMeasurements = (userId: string | undefined, onChanged?: () => void) => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      setMeasurements(await fetchBodyMeasurements(userId));
    } catch (error) {
      console.error('Error fetching body measurements:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const uploadFile = useCallback(async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const payload = await prepareFilePayload(file);
      const { data, error } = await supabase.functions.invoke('parse-measurements', { body: payload });
      if (error) throw new Error(data?.error || error.message);
      if (!data?.success) throw new Error(data?.error || 'Dosya işlenemedi');

      const m = toMeasurement(data.measurement);
      const parts = [
        m.weight_kg !== null && `${m.weight_kg} kg`,
        m.body_fat_pct !== null && `%${m.body_fat_pct} yağ`,
        m.muscle_mass_kg !== null && `${m.muscle_mass_kg} kg kas`,
      ].filter(Boolean);
      toast({
        title: 'Ölçüm kaydedildi',
        description: parts.length > 0 ? parts.join(' · ') : 'Ölçüm değerleri alındı.',
      });
      await refetch();
      onChanged?.();
    } catch (error) {
      console.error('Error uploading measurements:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [userId, toast, refetch, onChanged]);

  const deleteMeasurement = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('body_measurements').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Silindi', description: 'Ölçüm kaydı kaldırıldı.' });
      await refetch();
      onChanged?.();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      toast({ title: 'Hata', description: 'Ölçüm silinirken bir hata oluştu.', variant: 'destructive' });
    }
  }, [toast, refetch, onChanged]);

  return { measurements, latest: measurements[0] ?? null, loading, uploading, uploadFile, deleteMeasurement, refetch };
};
