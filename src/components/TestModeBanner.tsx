import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlaskConical, CreditCard, ExternalLink } from 'lucide-react';

// sessionStorage kullanıyoruz: sekme/uygulama her kapanıp açıldığında dialog tekrar gösterilir
const LS_KEY = 'diyet_test_mode_seen';

const TEST_CARDS = [
  { label: 'Visa',               number: '4242 4242 4242 4242' },
  { label: 'Mastercard',         number: '5555 5555 5555 4444' },
  { label: 'American Express',   number: '3782 822463 10005' },
  { label: 'Yetersiz bakiye',    number: '4000 0000 0000 9995' },
  { label: 'Süresi dolmuş kart', number: '4000 0000 0000 0069' },
  { label: '3D Secure',          number: '4000 0027 6000 3184' },
];

export function TestModeBanner() {
  const [open, setOpen] = useState(() => sessionStorage.getItem(LS_KEY) !== 'true');

  const dismiss = () => {
    sessionStorage.setItem(LS_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            Test Modu Aktif
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Ödeme sistemi şu an <span className="font-semibold text-amber-500">test modunda</span> çalışıyor.
            Gerçek para tahsil edilmez. Premium özellikleri denemek için aşağıdaki sahte kart numaralarından
            birini kullanabilirsin.
          </p>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <CreditCard className="h-3.5 w-3.5" />
              Test Kart Numaraları
            </div>
            <div className="divide-y divide-border">
              {TEST_CARDS.map(({ label, number }) => (
                <div key={number} className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground select-all">
                    {number}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Son kullanma tarihi ve CVV için herhangi bir gelecek tarih ve 3 haneli rakam girilebilir.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Button className="flex-1" onClick={dismiss}>
              Anladım, Devam Et
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a
                href="https://docs.lemonsqueezy.com/help/getting-started/test-mode"
                target="_blank"
                rel="noopener noreferrer"
                title="LemonSqueezy Test Modu Belgesi"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Premium'a geçmek istemiyorsan bu adımı atlayabilirsin.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
