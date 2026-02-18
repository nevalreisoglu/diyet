import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecognizedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'low';
}

interface RecognitionResult {
  foods: RecognizedFood[];
  totalCalories: number;
  mealDescription: string;
}

export const useMealRecognition = () => {
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const { toast } = useToast();

  const recognizeFromImage = useCallback(async (file: File) => {
    setRecognizing(true);
    setResult(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen bir fotoğraf seçin');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Fotoğraf boyutu 10MB\'dan küçük olmalı');
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const base64Data = dataUrl.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('recognize-meal', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw new Error(error.message);

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data.foods?.length > 0) {
        const recognitionResult: RecognitionResult = {
          foods: data.foods,
          totalCalories: data.totalCalories,
          mealDescription: data.mealDescription,
        };
        setResult(recognitionResult);
        toast({
          title: 'Yemek tanındı!',
          description: `${data.count} yiyecek bulundu (toplam ${data.totalCalories} kcal)`,
        });
        return recognitionResult;
      } else {
        toast({
          title: 'Yiyecek bulunamadı',
          description: 'Fotoğrafta yiyecek tanınamadı. Daha net bir fotoğraf deneyin.',
          variant: 'destructive',
        });
        return null;
      }
    } catch (error) {
      console.error('Meal recognition error:', error);
      toast({
        title: 'Tanıma hatası',
        description: error instanceof Error ? error.message : 'Fotoğraf analiz edilemedi',
        variant: 'destructive',
      });
      return null;
    } finally {
      setRecognizing(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    recognizing,
    result,
    recognizeFromImage,
    reset,
  };
};
