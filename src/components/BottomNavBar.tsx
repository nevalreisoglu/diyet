import { Home, History, Dna, Settings, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Ana Sayfa' },
  { path: '/history', icon: History, label: 'Geçmiş' },
  { path: '/metabolic-twin', icon: Dna, label: 'Metabolik' },
  { path: '/guide', icon: BookOpen, label: 'Rehber' },
  { path: '/settings', icon: Settings, label: 'Ayarlar' },
];

export const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border bottom-nav-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
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
