import { useState } from 'react';
import { Mic, MicOff, Loader2, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceFoodInputProps {
  onAddFood: (food: { name: string; calories: number }) => void;
}

interface LookupResult {
  name: string;
  calories: number;
  portion?: string;
  confidence?: string;
}

export function VoiceFoodInput({ onAddFood }: VoiceFoodInputProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const { toast } = useToast();

  const handleVoiceResult = async (text: string) => {
    setResult(null);
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-calories', {
        body: { foodName: text },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      if (data?.calories) {
        setResult({ name: text, calories: data.calories, portion: data.portion, confidence: data.confidence });
      }
    } catch {
      toast({
        title: 'Kalori bulunamadı',
        description: `"${text}" için kalori bilgisi alınamadı`,
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const { isListening, interimTranscript, isSupported, startListening, stopListening, reset } =
    useVoiceInput({ onResult: handleVoiceResult });

  const handleReset = () => {
    reset();
    setResult(null);
  };

  const handleAdd = () => {
    if (result) {
      onAddFood({ name: result.name, calories: result.calories });
      handleReset();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <MicOff className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Ses tanıma bu tarayıcıda desteklenmiyor</p>
        <p className="text-xs mt-1">Chrome veya Safari kullanmayı deneyin</p>
      </div>
    );
  }

  const statusText = () => {
    if (isListening) return 'Dinleniyor...';
    if (isLookingUp) return 'Kalori aranıyor...';
    if (interimTranscript && !result) return interimTranscript;
    if (!result) return 'Mikrofona dokunun ve yemeği söyleyin';
    return interimTranscript;
  };

  return (
    <div className="flex flex-col items-center py-4 gap-5">
      {/* Mic button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isLookingUp}
        aria-label={isListening ? 'Dinlemeyi durdur' : 'Dinlemeye başla'}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all focus:outline-none disabled:opacity-50 ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
        }`}
      >
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
            <span className="absolute inset-[-8px] rounded-full bg-red-300 animate-ping opacity-30 animation-delay-150" />
          </>
        )}
        <Mic className="h-9 w-9 relative z-10" />
      </button>

      {/* Status */}
      <p
        className={`text-sm text-center px-4 transition-colors ${
          isListening ? 'text-red-500 font-medium' : 'text-muted-foreground'
        }`}
      >
        {statusText()}
      </p>

      {/* Looking up spinner */}
      {isLookingUp && <Loader2 className="h-5 w-5 animate-spin text-primary" />}

      {/* Result card */}
      {result && !isLookingUp && (
        <div className="w-full bg-muted/60 rounded-xl p-4 space-y-3">
          <div>
            <p className="font-semibold capitalize">{result.name}</p>
            <p className="text-sm text-muted-foreground">
              {result.calories} kcal
              {result.portion ? ` · ${result.portion}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Tekrar
            </Button>
            <Button size="sm" onClick={handleAdd} className="flex-1 gradient-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ekle
            </Button>
          </div>
        </div>
      )}

      {/* Hint */}
      {!isListening && !isLookingUp && !result && (
        <p className="text-xs text-muted-foreground text-center px-6">
          Örn: "elma", "100 gram pilav", "bir kase yoğurt"
        </p>
      )}
    </div>
  );
}
