import { useState } from 'react';
import { Stethoscope, Loader2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMyDietitian } from '@/hooks/useDietitianLink';

interface Props {
  userId?: string;
}

export const MyDietitianCard = ({ userId }: Props) => {
  const { dietitian, loading, working, linkWithCode, unlink } = useMyDietitian(userId);
  const [code, setCode] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Diyetisyenim
        </CardTitle>
        <CardDescription>
          Diyetisyeninizin verdiği davet kodunu girin; gün gün planınızı o hazırlar, kayıtlarınızı ve ölçümlerinizi takip eder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : dietitian ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{dietitian.displayName ?? 'Diyetisyeniniz'}</p>
              <p className="text-xs text-muted-foreground">Bağlı. Planınızı ve takibinizi görebilir.</p>
            </div>
            <Button variant="outline" size="sm" onClick={unlink} disabled={working} className="gap-2 text-destructive hover:text-destructive">
              <Unlink className="h-4 w-4" />
              Bağlantıyı kaldır
            </Button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await linkWithCode(code)) setCode('');
            }}
            className="flex gap-2"
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Davet kodu (örn. 3F9A1C7B)"
              className="max-w-xs font-mono tracking-wider"
              maxLength={12}
            />
            <Button type="submit" disabled={working || code.trim().length < 6} className="gap-2">
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Bağlan
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
