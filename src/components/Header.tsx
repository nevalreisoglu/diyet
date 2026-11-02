import { CalendarDays, Leaf, LogOut, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PAYMENTS_ENABLED } from '@/config/features';

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-50">
      {PAYMENTS_ENABLED && (
      <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400">
        <div className="container max-w-2xl mx-auto px-4 py-1.5 flex items-center gap-2 text-xs">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Test Modu:</span>
          <span>Gerçek ödeme alınmaz.</span>
          <span className="hidden sm:inline">Kart: <code className="font-mono bg-amber-500/20 px-1 rounded">4242 4242 4242 4242</code></span>
          <a
            href="https://docs.lemonsqueezy.com/help/getting-started/test-mode"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto underline underline-offset-2 whitespace-nowrap hover:text-amber-600"
          >
            Tüm test kartları →
          </a>
        </div>
      </div>
      )}

      <div className="bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Beslenme Günlüğü</h1>
              <p className="text-xs text-muted-foreground">Sağlıklı yaşam takibi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-2 rounded-xl">
              <CalendarDays className="h-4 w-4" />
              <span className="capitalize">{today}</span>
            </div>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                title="Çıkış Yap"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </header>
  );
};
