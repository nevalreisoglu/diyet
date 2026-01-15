import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
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

  const uploadPdf = useCallback(async (file: File) => {
    if (!userId) return;

    setUploading(true);
    try {
      // Read PDF as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          // Extract base64 part from data URL
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-food-pdf', {
        body: { pdfBase64: base64 },
      });

      if (error) throw error;

      if (data.success) {
        const message = data.count > 0 
          ? `${data.count} yiyecek listeden eklendi.`
          : 'Öğün saatleri güncellendi.';
        toast({
          title: 'Başarılı',
          description: message,
        });
        fetchCustomFoods();
        // Notify parent that schedules may have been updated
        onSchedulesUpdated?.();
      } else {
        throw new Error(data.error || 'PDF işlenemedi');
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: 'Hata',
        description: 'PDF yüklenirken bir hata oluştu.',
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

  return {
    customFoods,
    loading,
    uploading,
    uploadPdf,
    deleteCustomFood,
    refetch: fetchCustomFoods,
  };
};

