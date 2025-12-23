import { CalendarDays, Leaf } from 'lucide-react';

export const Header = () => {
  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Beslenme Günlüğü</h1>
              <p className="text-xs text-muted-foreground">Sağlıklı yaşam takibi</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-2 rounded-xl">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{today}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
