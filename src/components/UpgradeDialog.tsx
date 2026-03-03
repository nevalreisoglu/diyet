import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createCheckout: () => Promise<string>;
}

const features: { label: string; free: boolean | string; premium: boolean | string }[] = [
  { label: 'Yemek kaydı',         free: true,  premium: true },
  { label: 'Kalori takibi',       free: true,  premium: true },
  { label: 'AI fotoğraf tanıma',  free: false, premium: true },
  { label: 'Haftalık grafikler',  free: false, premium: true },
  { label: 'Metabolik ikiz',      free: false, premium: true },
  { label: 'Kilo tahmini (AI)',   free: false, premium: true },
  { label: 'Başarı rozetleri',    free: false, premium: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)  return <Check className="h-4 w-4 text-green-500 mx-auto" />;
  if (value === false) return <X    className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function UpgradeDialog({ open, onOpenChange, createCheckout }: UpgradeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckout();
      // Aynı pencerede yönlendir (PWA home screen ile uyumlu)
      window.location.href = url;
    } catch (e) {
      console.error('Checkout error:', e);
      toast({
        title: 'Hata',
        description: e instanceof Error ? e.message : 'Ödeme sayfası açılamadı.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Crown className="h-5 w-5 text-yellow-500" />
            Premium&apos;a Geç
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fiyat */}
          <div className="text-center py-3 bg-primary/10 rounded-xl">
            <p className="text-3xl font-bold text-primary">
              $4.99<span className="text-sm font-normal text-muted-foreground">/ay</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">İstediğiniz zaman iptal edin</p>
          </div>

          {/* Özellik tablosu */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase">
                <th className="text-left pb-2 font-medium">Özellik</th>
                <th className="pb-2 font-medium w-16">Ücretsiz</th>
                <th className="pb-2 font-medium w-16 text-primary">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {features.map((f) => (
                <tr key={f.label}>
                  <td className="py-2 text-foreground">{f.label}</td>
                  <td className="py-2 text-center"><Cell value={f.free} /></td>
                  <td className="py-2 text-center"><Cell value={f.premium} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button
            className="w-full gradient-primary text-primary-foreground gap-2"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Yönlendiriliyor...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Premium&apos;a Geç — $4.99/ay</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
