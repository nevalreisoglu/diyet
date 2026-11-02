import { useState, useEffect, useRef } from 'react';
import { Home, History, Dna, Settings, BookOpen, X, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BUBBLE_KEY = 'diyet_guide_bubble_seen';

const clientNavItems = [
  { path: '/', icon: Home, label: 'Ana Sayfa' },
  { path: '/history', icon: History, label: 'Geçmiş' },
  { path: '/metabolic-twin', icon: Dna, label: 'Metabolik' },
  { path: '/guide', icon: BookOpen, label: 'Rehber' },
  { path: '/settings', icon: Settings, label: 'Ayarlar' },
];

const dietitianNavItems = [
  { path: '/dietitian', icon: Users, label: 'Danışanlar' },
  { path: '/guide', icon: BookOpen, label: 'Rehber' },
  { path: '/settings', icon: Settings, label: 'Ayarlar' },
];

interface BottomNavBarProps {
  isDietitian?: boolean;
}

export const BottomNavBar = ({ isDietitian = false }: BottomNavBarProps) => {
  const navItems = isDietitian ? dietitianNavItems : clientNavItems;
  const navigate = useNavigate();
  const location = useLocation();
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleLeft, setBubbleLeft] = useState(0);
  const guideRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(BUBBLE_KEY) === 'true') return;

    const t = setTimeout(() => {
      // Rehber butonunun ekrandaki konumunu al
      if (guideRef.current) {
        const rect = guideRef.current.getBoundingClientRect();
        // Balonun ortası butonun ortasına hizalanır (balon genişliği 160px)
        setBubbleLeft(rect.left + rect.width / 2 - 80);
      }
      setShowBubble(true);
    }, 900);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showBubble) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [showBubble]);

  const dismiss = () => {
    sessionStorage.setItem(BUBBLE_KEY, 'true');
    setShowBubble(false);
  };

  return (
    <>
      {/* Konuşma balonu — fixed, nav'ın dışında render edilir */}
      {showBubble && (
        <div
          className="fixed z-[60] w-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', left: bubbleLeft }}
        >
          <div className="relative bg-primary text-primary-foreground text-xs rounded-xl px-3 py-2.5 shadow-xl text-center leading-relaxed">
            <button
              onClick={dismiss}
              className="absolute -top-2 -right-2 bg-card border border-border text-muted-foreground rounded-full h-5 w-5 flex items-center justify-center shadow"
            >
              <X className="h-3 w-3" />
            </button>
            Rehbere göz at, tüm özellikleri keşfet! 📖
            {/* Ok — aşağıya doğru */}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 rounded-sm" />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border bottom-nav-safe">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/dietitian' ? location.pathname.startsWith('/dietitian') : location.pathname === path;
            const isGuide = path === '/guide';
            return (
              <button
                key={path}
                ref={isGuide ? guideRef : undefined}
                onClick={() => { if (isGuide) dismiss(); navigate(path); }}
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
    </>
  );
};
