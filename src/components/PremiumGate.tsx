import { useState } from 'react';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeDialog } from '@/components/UpgradeDialog';

interface PremiumGateProps {
  isPremium: boolean;
  createCheckout: () => Promise<string>;
  children: React.ReactNode;
  featureLabel: string;
  bullets?: string[];
  /** Kompakt mod: sekme/kutu içi küçük kilit */
  compact?: boolean;
}

export function PremiumGate({
  isPremium,
  createCheckout,
  children,
  featureLabel,
  bullets,
  compact = false,
}: PremiumGateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isPremium) return <>{children}</>;

  const openDialog = () => setDialogOpen(true);

  return (
    <>
      {compact ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{featureLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bu özellik Premium&apos;a özeldir</p>
          </div>
          <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5" onClick={openDialog}>
            <Crown className="h-3.5 w-3.5" />
            Premium&apos;a Geç
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-4 border border-primary/20">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Premium Özellik</span>
            </div>
            <p className="font-semibold text-foreground text-lg">{featureLabel}</p>
          </div>
          {bullets && bullets.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-1 text-left w-full max-w-xs">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          <Button
            className="gradient-primary text-primary-foreground gap-2 w-full max-w-xs"
            onClick={openDialog}
          >
            <Crown className="h-4 w-4" />
            Premium&apos;a Geç — $4.99/ay
          </Button>
        </div>
      )}

      <UpgradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        createCheckout={createCheckout}
      />
    </>
  );
}
