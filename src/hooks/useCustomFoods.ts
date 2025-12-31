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

export const useCustomFoods = (userId: string | undefined) => {
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
      // Read PDF as text using FileReader
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Convert to base64 for sending to edge function
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          uint8Array.forEach((byte) => {
            binary += String.fromCharCode(byte);
          });
          // For PDF, we'll extract text content
          // Since we can't parse PDF in browser easily, we'll send raw text
          // The AI will handle extracting meaningful content
          const base64 = btoa(binary);
          
          // Try to extract any visible text from the PDF
          const textContent = await extractTextFromPdf(arrayBuffer);
          resolve(textContent || `[PDF içeriği - base64: ${base64.substring(0, 1000)}...]`);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-food-pdf', {
        body: { pdfText: text },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Başarılı',
          description: `${data.count} yiyecek listeden eklendi.`,
        });
        fetchCustomFoods();
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
  }, [userId, toast, fetchCustomFoods]);

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

// Simple text extraction from PDF
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    // Try to find readable text in PDF
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      return textMatches
        .map(m => m.slice(1, -1))
        .filter(t => t.length > 2 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(t))
        .join(' ');
    }
    
    // Fallback: return any readable characters
    return text.replace(/[^\x20-\x7EğüşöçıİĞÜŞÖÇ\n]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}
