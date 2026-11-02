import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PlanEditor } from '@/components/dietitian/PlanEditor';
import { ClientTracking } from '@/components/dietitian/ClientTracking';
import { ClientMeasurements } from '@/components/dietitian/ClientMeasurements';
import { todayStr } from '@/lib/dates';

interface ClientProfile {
  display_name: string | null;
  target_calories: number | null;
  target_water_ml: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
}

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isDietitian, loading: roleLoading } = useRole(user?.id);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [planDate, setPlanDate] = useState(todayStr());

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!roleLoading && user && !isDietitian) navigate('/');
  }, [user, authLoading, roleLoading, isDietitian, navigate]);

  useEffect(() => {
    if (!clientId || !user) return;
    supabase
      .from('profiles')
      .select('display_name, target_calories, target_water_ml, current_weight_kg, target_weight_kg')
      .eq('user_id', clientId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile((data as ClientProfile | null) ?? null);
        setLoading(false);
      });
  }, [clientId, user]);

  if (authLoading || roleLoading || loading || !user || !clientId) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background gradient-hero">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 pt-8 pb-safe space-y-4">
          <p className="text-muted-foreground">Bu danışana erişiminiz yok ya da bağlantı kaldırılmış.</p>
          <Button variant="outline" onClick={() => navigate('/dietitian')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Danışanlara dön</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-safe space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dietitian')} aria-label="Geri"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile.display_name ?? 'İsimsiz danışan'}</h1>
            <p className="text-xs text-muted-foreground">
              {profile.current_weight_kg !== null ? `${Number(profile.current_weight_kg)} kg` : 'Kilo girilmemiş'}
              {profile.target_weight_kg !== null ? ` → hedef ${Number(profile.target_weight_kg)} kg` : ''}
              {profile.target_calories ? ` · ${profile.target_calories} kcal/gün` : ''}
            </p>
          </div>
        </div>

        <Tabs defaultValue="plan" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="tracking">Takip</TabsTrigger>
            <TabsTrigger value="measurements">Ölçümler</TabsTrigger>
          </TabsList>
          <TabsContent value="plan">
            <PlanEditor dietitianId={user.id} clientId={clientId} date={planDate} onDateChange={setPlanDate} />
          </TabsContent>
          <TabsContent value="tracking">
            <ClientTracking clientId={clientId} targetCalories={profile.target_calories ?? 2000} targetWaterMl={profile.target_water_ml ?? 2000} />
          </TabsContent>
          <TabsContent value="measurements">
            <ClientMeasurements clientId={clientId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDetail;
