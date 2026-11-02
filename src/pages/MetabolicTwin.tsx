import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useMetabolicProfile } from '@/hooks/useMetabolicProfile';
import { MetabolicProfileCard } from '@/components/metabolic/MetabolicProfileCard';
import { MetabolicScoreCard } from '@/components/metabolic/MetabolicScoreCard';
import { WhatIfSimulator } from '@/components/metabolic/WhatIfSimulator';
import { MetabolicInsights } from '@/components/metabolic/MetabolicInsights';
import { Loader2, Dna } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PremiumGate } from '@/components/PremiumGate';

const MetabolicTwin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, recentMetrics, loading } = useMetabolicProfile(user?.id);
  const { isPremium, createCheckout } = useSubscriptionContext();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Metabolik profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-safe space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Dna className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Metabolik İkiz</h1>
            <p className="text-sm text-muted-foreground">Dijital metabolizma simülasyonunuz</p>
          </div>
        </div>

        <PremiumGate
          isPremium={isPremium}
          createCheckout={createCheckout}
          featureLabel="Metabolik İkiz"
          bullets={[
            'BMR ve TDEE hesaplamaları',
            'Metabolik skor takibi (kalori, su, spor, kafein)',
            'What-if senaryoları ("500 kcal azaltsam?")',
            'Kişiselleştirilmiş metabolik içgörüler',
          ]}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="score">Skor</TabsTrigger>
              <TabsTrigger value="whatif">What-If</TabsTrigger>
              <TabsTrigger value="insights">Analiz</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <MetabolicProfileCard profile={profile} />
            </TabsContent>

            <TabsContent value="score">
              <MetabolicScoreCard profile={profile} recentMetrics={recentMetrics} />
            </TabsContent>

            <TabsContent value="whatif">
              <WhatIfSimulator profile={profile} recentMetrics={recentMetrics} userId={user.id} />
            </TabsContent>

            <TabsContent value="insights">
              <MetabolicInsights profile={profile} recentMetrics={recentMetrics} />
            </TabsContent>
          </Tabs>
        </PremiumGate>
      </main>
    </div>
  );
};

export default MetabolicTwin;
