import { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { round1 } from '@/lib/macros';
import type { NewFood } from '@/hooks/useNutritionData';

interface BarcodeFoodInputProps {
  onAddFood: (food: NewFood) => void;
}

interface Product {
  barcode: string;
  name: string;
  brand: string | null;
  per100g: { calories: number; protein: number | null; carbs: number | null; fat: number | null };
  servingGrams: number | null;
}

// Tarayıcı destekliyorsa canlı tarama; desteklemiyorsa (ör. iOS Safari) numara elle girilir
const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

const fetchProduct = async (barcode: string): Promise<Product | null> => {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_tr,brands,nutriments,serving_quantity`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== null ? Math.round(num(n['energy_100g'])! / 4.184) : null);
  if (kcal === null) return null;
  return {
    barcode,
    name: p.product_name_tr || p.product_name || 'Ürün',
    brand: p.brands || null,
    per100g: { calories: kcal, protein: num(n.proteins_100g), carbs: num(n.carbohydrates_100g), fat: num(n.fat_100g) },
    servingGrams: num(p.serving_quantity),
  };
};

export const BarcodeFoodInput = ({ onAddFood }: BarcodeFoodInputProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState('100');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const lookup = async (barcode: string) => {
    const clean = barcode.replace(/\D/g, '');
    if (clean.length < 8) {
      setError('Barkod en az 8 haneli olmalı.');
      return;
    }
    setLoading(true);
    setError(null);
    setProduct(null);
    try {
      const found = await fetchProduct(clean);
      if (!found) {
        setError('Ürün veri tabanında bulunamadı. Adını yazarak ekleyebilirsiniz.');
        return;
      }
      setProduct(found);
      setGrams(String(found.servingGrams ?? 100));
    } catch {
      setError('Ürün bilgisi alınamadı. Bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let timer: number | undefined;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const value = String(codes[0].rawValue);
              setCode(value);
              stopScan();
              lookup(value);
              return;
            }
          } catch {
            // kare henüz hazır değil; sonraki denemede devam
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError('Kameraya erişilemedi. Barkod numarasını elle girin.');
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const gramsNum = parseFloat(grams.replace(',', '.'));
  const factor = Number.isFinite(gramsNum) && gramsNum > 0 ? gramsNum / 100 : 0;
  const scaled = product
    ? {
        calories: Math.round(product.per100g.calories * factor),
        protein: product.per100g.protein === null ? null : round1(product.per100g.protein * factor),
        carbs: product.per100g.carbs === null ? null : round1(product.per100g.carbs * factor),
        fat: product.per100g.fat === null ? null : round1(product.per100g.fat * factor),
      }
    : null;

  const handleAdd = () => {
    if (!product || !scaled || factor === 0) return;
    onAddFood({
      name: `${product.name}${product.brand ? ` (${product.brand.split(',')[0].trim()})` : ''} ${Math.round(gramsNum)} g`,
      ...scaled,
    });
  };

  return (
    <div className="space-y-3">
      {scanning ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-16 border-2 border-primary/80 rounded-lg pointer-events-none" />
          <Button type="button" size="icon" variant="secondary" onClick={stopScan} className="absolute top-2 right-2 h-8 w-8" aria-label="Taramayı kapat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                lookup(code);
              }
            }}
            inputMode="numeric"
            placeholder="Barkod numarası (ör. 8690504012345)"
            className="bg-background border-input"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => lookup(code)} disabled={loading} aria-label="Ürünü bul">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {hasBarcodeDetector && (
            <Button type="button" variant="outline" size="icon" onClick={() => { setError(null); setScanning(true); }} aria-label="Kamerayla tara">
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {!hasBarcodeDetector && !product && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Barcode className="h-3.5 w-3.5" />
          Bu tarayıcıda kamerayla tarama desteklenmiyor; paketin altındaki numarayı yazın.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {product && scaled && (
        <div className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{product.name}</p>
            {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
            <p className="text-xs text-muted-foreground">
              100 g: {product.per100g.calories} kcal
              {product.per100g.protein !== null && ` · P ${product.per100g.protein} g`}
              {product.per100g.carbs !== null && ` · K ${product.per100g.carbs} g`}
              {product.per100g.fat !== null && ` · Y ${product.per100g.fat} g`}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Miktar (g)</Label>
              <Input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="bg-background border-input" />
            </div>
            <div className="text-right pb-2">
              <p className="text-base font-semibold text-foreground">{scaled.calories} kcal</p>
              <p className="text-[11px] text-muted-foreground">
                {scaled.protein !== null && `P ${scaled.protein}`}
                {scaled.carbs !== null && ` · K ${scaled.carbs}`}
                {scaled.fat !== null && ` · Y ${scaled.fat}`}
              </p>
            </div>
          </div>
          <Button type="button" onClick={handleAdd} disabled={factor === 0} className="w-full gradient-primary text-primary-foreground hover:opacity-90">
            Ekle
          </Button>
          <p className="text-[10px] text-muted-foreground">Kaynak: Open Food Facts</p>
        </div>
      )}
    </div>
  );
};
