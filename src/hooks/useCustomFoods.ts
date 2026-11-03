import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { prepareFilePayload } from '@/lib/filePayload';

export interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  meal_type: string | null;
  day_label?: string | null;
  day_index?: number | null;
  created_at?: string;
}

export const useCustomFoods = (userId: string | undefined, onSchedulesUpdated?: () => void) => {
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchCustomFoods = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCustomFoods();
  }, [fetchCustomFoods]);

  const uploadFile = useCallback(async (file: File) => {
    if (!userId) return;

    setUploading(true);
    try {
      const payload = await prepareFilePayload(file);

      const { data, error } = await supabase.functions.invoke('parse-food-pdf', { body: payload });

      if (error) throw error;

      if (data?.success) {
        const message = data.count > 0
          ? `${data.count} yiyecek listeye eklendi${data.dayCount > 1 ? ` (${data.dayCount} güne ayrıldı)` : ''}.`
          : 'Dosyada yiyecek bulunamadı.';
        toast({ title: 'Liste yüklendi', description: message });
        fetchCustomFoods();
        onSchedulesUpdated?.();
      } else {
        throw new Error(data?.error || 'Dosya işlenemedi');
      }
    } catch (error) {
      console.error('Error uploading food list:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [userId, toast, fetchCustomFoods, onSchedulesUpdated]);

  const deleteCustomFood = useCallback(async (foodId: string) => {
    try {
      const { error } = await supabase
        .from('custom_foods')
        .delete()
        .eq('id', foodId);

      if (error) throw error;

      toast({
        title: 'Silindi',
        description: 'Yiyecek listeden kaldırıldı.',
      });
      fetchCustomFoods();
    } catch (error) {
      console.error('Error deleting custom food:', error);
      toast({
        title: 'Hata',
        description: 'Yiyecek silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }, [toast, fetchCustomFoods]);

  const deleteAllCustomFoods = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('custom_foods')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Tümü Silindi',
        description: 'Tüm yiyecekler listeden kaldırıldı.',
      });
      fetchCustomFoods();
    } catch (error) {
      console.error('Error deleting all custom foods:', error);
      toast({
        title: 'Hata',
        description: 'Yiyecekler silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }, [userId, toast, fetchCustomFoods]);

  return {
    customFoods,
    loading,
    uploading,
    uploadFile,
    deleteCustomFood,
    deleteAllCustomFoods,
    refetch: fetchCustomFoods,
  };
};

