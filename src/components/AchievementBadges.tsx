import { Trophy } from 'lucide-react';
import { achievementConfigs, AchievementType } from '@/hooks/useAchievements';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AchievementBadgesProps {
  earnedTypes: AchievementType[];
}

export const AchievementBadges = ({ earnedTypes }: AchievementBadgesProps) => {
  if (earnedTypes.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-medium text-foreground">Günlük Ödüller</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-2">
          Henüz ödül kazanmadınız. Hedeflerinize ulaşarak rozetler kazanın! 🎯
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {achievementConfigs.map((config) => (
            <TooltipProvider key={config.type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center opacity-40 grayscale">
                    <span className="text-lg">{config.icon}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-medium text-foreground">Günlük Ödüller</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {earnedTypes.length} / {achievementConfigs.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {achievementConfigs.map((config) => {
          const isEarned = earnedTypes.includes(config.type);
          
          return (
            <TooltipProvider key={config.type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isEarned
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 animate-pulse'
                        : 'bg-muted opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-lg">{config.icon}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  {isEarned && (
                    <p className="text-xs text-primary mt-1">✓ Bugün kazanıldı!</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
