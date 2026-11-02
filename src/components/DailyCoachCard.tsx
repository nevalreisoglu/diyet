import { Sparkles, RefreshCw, Loader2, PartyPopper, AlertTriangle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DailySummary, COACH_REFRESH_MINUTES } from '@/hooks/useDailyCoach';

interface DailyCoachCardProps {
  summary: DailySummary | null;
  loading: boolean;
  generating: boolean;
  canRefresh: boolean;
  minutesSinceUpdate: number | null;
  onGenerate: () => void;
}

const toneStyles = {
  celebrate: { icon: PartyPopper, badge: 'bg-green-500/15 text-green-700 dark:text-green-400', border: 'border-green-500/30' },
  nudge: { icon: Sparkles, badge: 'bg-primary/15 text-primary', border: 'border-primary/30' },
  warn: { icon: AlertTriangle, badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', border: 'border-amber-500/30' },
};

export const DailyCoachCard = ({ summary, loading, generating, canRefresh, minutesSinceUpdate, onGenerate }: DailyCoachCardProps) => {
  if (loading) {
    return <div className="bg-card rounded-2xl border border-border p-4 h-24 animate-pulse" />;
  }

  if (!summary) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Günün koç özeti</p>
            <p className="text-sm text-muted-foreground">Bugünkü kayıtlarına göre kısa bir değerlendirme ve tek bir odak önerisi.</p>
          </div>
        </div>
        <Button onClick={onGenerate} disabled={generating} className="gap-2 shrink-0">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Hazırlanıyor...' : 'Özet oluştur'}
        </Button>
      </div>
    );
  }

  const style = toneStyles[summary.tone] ?? toneStyles.nudge;
  const ToneIcon = style.icon;
  const waitMinutes = minutesSinceUpdate === null ? 0 : Math.max(COACH_REFRESH_MINUTES - minutesSinceUpdate, 0);
  const updatedLabel = new Date(summary.updated_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`bg-card rounded-2xl border p-4 space-y-3 animate-slide-up ${style.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.badge}`}>
            <ToneIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-tight">{summary.headline}</p>
            <p className="text-[11px] text-muted-foreground">Koç özeti · {updatedLabel}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          disabled={generating || !canRefresh}
          className="gap-1.5 text-muted-foreground shrink-0"
          title={canRefresh ? 'Güncel verilerle yenile' : `${waitMinutes} dk sonra yenilenebilir`}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {canRefresh ? 'Yenile' : `${waitMinutes} dk`}
        </Button>
      </div>

      <p className="text-sm text-foreground/90">{summary.message}</p>

      {summary.focus && (
        <div className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{summary.focus}</p>
        </div>
      )}
    </div>
  );
};
