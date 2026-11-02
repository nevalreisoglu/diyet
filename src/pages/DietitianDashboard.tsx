import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useDietitianClients } from '@/hooks/useDietitianLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, KeyRound, Copy, Check, ChevronRight, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DietitianDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isDietitian, loading: roleLoading } = useRole(user?.id);
  const { clients, inviteCode, loading, createInvite, removeClient } = useDietitianClients(user?.id);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!roleLoading && user && role === 'client') navigate('/', { replace: true });
  }, [user, authLoading, roleLoading, role, navigate]);

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Kod', description: inviteCode });
    }
  };

  if (authLoading || roleLoading || !user || !isDietitian) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-safe space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Danışanlarım</h1>
          <p className="text-muted-foreground">Planları hazırlayın, takibi tek yerden yapın</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Davet Kodu
            </CardTitle>
            <CardDescription>Danışanınız bu kodu Ayarlar → Diyetisyenim bölümüne girerek size bağlanır.</CardDescription>
          </CardHeader>
          <CardContent>
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono tracking-widest bg-secondary px-3 py-1.5 rounded-lg text-foreground">{inviteCode}</code>
                <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </Button>
              </div>
            ) : (
              <Button onClick={createInvite} className="gap-2">
                <KeyRound className="h-4 w-4" />
                Kod oluştur
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Danışanlar {clients.length > 0 && <span className="text-muted-foreground font-normal">({clients.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz danışan yok. Davet kodunuzu paylaşın.</p>
            ) : (
              <div className="divide-y divide-border">
                {clients.map((c) => (
                  <div key={c.linkId} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/dietitian/client/${c.clientId}`)}
                      className="flex-1 flex items-center justify-between text-left min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.displayName ?? 'İsimsiz danışan'}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.currentWeightKg !== null ? `${c.currentWeightKg} kg` : 'Kilo girilmemiş'}
                          {c.targetCalories ? ` · hedef ${c.targetCalories} kcal` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`${c.displayName ?? 'Bu danışan'} listeden kaldırılsın mı? Planlara erişiminiz kapanır.`)) removeClient(c.linkId);
                      }}
                      aria-label="Danışanı kaldır"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DietitianDashboard;
