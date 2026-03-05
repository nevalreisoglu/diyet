import { useState, useEffect } from 'react';
import { Home, History, Dna, Settings, BookOpen, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BUBBLE_KEY = 'diyet_guide_bubble_seen';

const navItems = [
  { path: '/', icon: Home, label: 'Ana Sayfa' },
  { path: '/history', icon: History, label: 'Geçmiş' },
  { path: '/metabolic-twin', icon: Dna, label: 'Metabolik' },
  { path: '/guide', icon: BookOpen, label: 'Rehber' },
  { path: '/settings', icon: Settings, label: 'Ayarlar' },
];

// "Rehber" kaçıncı sırada? (0-indexed)
const GUIDE_INDEX = navItems.findIndex((i) => i.path === '/guide');

export const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    // Her uygulama açılışında (sessionStorage sıfırlandığında) göster
    if (sessionStorage.getItem(BUBBLE_KEY) !== 'true') {
      // Nav bar render olduktan kısa süre sonra göster
      const t = setTimeout(() => setShowBubble(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!showBubble) return;
    // 6 saniye sonra otomatik kapat
    const t = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(t);
  }, [showBubble]);

  const dismiss = () => {
    sessionStorage.setItem(BUBBLE_KEY, 'true');
    setShowBubble(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border bottom-nav-safe">
      <div className="relative flex items-center justify-around px-2 pt-2 pb-1">

        {/* Konuşma balonu */}
        {showBubble && (
          <div
            className="absolute bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ left: `calc(${GUIDE_INDEX} * 20% + 10% - 72px)` }}
          >
            <div className="relative bg-primary text-primary-foreground text-xs rounded-xl px-3 py-2 shadow-lg w-40 text-center leading-relaxed">
              <button
                onClick={dismiss}
                className="absolute -top-1.5 -right-1.5 bg-primary-foreground text-primary rounded-full h-4 w-4 flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              Rehbere göz at, tüm özellikleri keşfet! 📖
              {/* Ok */}
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 rounded-sm" />
            </div>
          </div>
        )}

        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { if (path === '/guide') dismiss(); navigate(path); }}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 touch-target min-w-[60px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/10'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              </div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
