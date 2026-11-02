import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Target, Droplets, Scale, Calendar, Ruler, User, Crown, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PAYMENTS_ENABLED } from '@/config/features';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { FoodListUploader } from '@/components/FoodListUploader';
import { MeasurementUploader } from '@/components/MeasurementUploader';
import { ReminderSettings } from '@/components/ReminderSettings';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [targetCalories, setTargetCalories] = useState(1500);
  const [targetWaterMl, setTargetWaterMl] = useState(2000);
  const [displayName, setDisplayName] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [weightGoalWeeks, setWeightGoalWeeks] = useState(12);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { isPremium, subscription, createCheckout, syncSubscription } = useSubscriptionContext();

  // LemonSqueezy ödeme sonrası yönlendirme algılama
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      syncSubscription().then(() => {
        toast({ title: 'Premium\'a hoş geldiniz! 🎉', description: 'Tüm özellikler artık aktif.' });
      });
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('target_calories, target_water_ml, display_name, current_weight_kg, target_weight_kg, weight_goal_weeks, height_cm, gender, age')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setTargetCalories(data.target_calories ?? 1500);
          setTargetWaterMl(data.target_water_ml ?? 2000);
          setDisplayName(data.display_name ?? '');
          setCurrentWeight(data.current_weight_kg ?? null);
          setTargetWeight(data.target_weight_kg ?? null);
          setWeightGoalWeeks(data.weight_goal_weeks ?? 12);
          setHeightCm(data.height_cm ? Number(data.height_cm) : null);
          setGender(data.gender ?? null);
          setAge(data.age ?? null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          target_calories: targetCalories,
          target_water_ml: targetWaterMl,
          display_name: displayName || null,
          current_weight_kg: currentWeight,
          target_weight_kg: targetWeight,
          weight_goal_weeks: weightGoalWeeks,
          height_cm: heightCm,
          gender: gender,
          age: age,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Kaydedildi',
        description: 'Ayarlarınız başarıyla güncellendi.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Hata',
        description: 'Ayarlar kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-safe space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
          <p className="text-muted-foreground">Profil ve hedef ayarlarınızı yönetin</p>
        </div>

        {PAYMENTS_ENABLED && (<>
        <Card className={isPremium ? 'border-yellow-500/40 bg-yellow-500/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              {isPremium ? 'Premium Plan' : 'Ücretsiz Plan'}
            </CardTitle>
            <CardDescription>
              {isPremium
                ? subscription?.current_period_end
                  ? `Yenileme tarihi: ${new Date(subscription.current_period_end).toLocaleDateString('tr-TR')}`
                  : 'Tüm premium özellikler aktif.'
                : 'AI fotoğraf tanıma, metabolik ikiz ve daha fazlası için Premium\'a geçin.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPremium ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['Yemek kaydı', 'Kalori takibi', 'AI fotoğraf tanıma', 'Haftalık grafikler', 'Metabolik ikiz', 'Kilo tahmini (AI)', 'Başarı rozetleri'].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                {subscription?.customer_portal_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-muted-foreground"
                    onClick={() => window.open(subscription.customer_portal_url!, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Aboneliği Yönet
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setUpgradeOpen(true)}>
                  <Crown className="h-4 w-4" />
                  Premium&apos;a Geç — $4.99/ay
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground gap-2"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      await syncSubscription();
                      toast({ title: 'Abonelik kontrol edildi', description: 'Durum güncellendi.' });
                    } catch {
                      toast({ title: 'Hata', description: 'Senkronizasyon başarısız.', variant: 'destructive' });
                    } finally {
                      setSyncing(false);
                    }
                  }}
                >
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Zaten ödedim, yenile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} createCheckout={createCheckout} />
        </>)}

        <FoodListUploader userId={user.id} />

        <MeasurementUploader userId={user.id} />

        <ReminderSettings userId={user.id} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Günlük Hedefler
            </CardTitle>
            <CardDescription>
              Günlük kalori ve su tüketim hedeflerinizi belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="targetCalories" className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                Kalori Hedefi (kcal)
              </Label>
              <Input
                id="targetCalories"
                type="number"
                min={500}
                max={10000}
                value={targetCalories}
                onChange={(e) => setTargetCalories(parseInt(e.target.value) || 1500)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Günlük almak istediğiniz kalori miktarı
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWaterMl" className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                Su Hedefi (ml)
              </Label>
              <Input
                id="targetWaterMl"
                type="number"
                min={500}
                max={10000}
                step={250}
                value={targetWaterMl}
                onChange={(e) => setTargetWaterMl(parseInt(e.target.value) || 2000)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Günlük içmek istediğiniz su miktarı (ml cinsinden)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Kilo Bilgileri
            </CardTitle>
            <CardDescription>
              Mevcut kilonuzu ve hedef kilonuzu girin (AI tahminleri için kullanılır)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentWeight">Mevcut Kilo (kg)</Label>
              <Input
                id="currentWeight"
                type="number"
                min={30}
                max={300}
                step={0.1}
                placeholder="Örn: 75.5"
                value={currentWeight ?? ''}
                onChange={(e) => setCurrentWeight(e.target.value ? parseFloat(e.target.value) : null)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Şu anki kilonuz
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWeight">Hedef Kilo (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                min={30}
                max={300}
                step={0.1}
                placeholder="Örn: 70.0"
                value={targetWeight ?? ''}
                onChange={(e) => setTargetWeight(e.target.value ? parseFloat(e.target.value) : null)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Ulaşmak istediğiniz kilo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightGoalWeeks" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Hedef Süre
              </Label>
              <Select
                value={weightGoalWeeks.toString()}
                onValueChange={(value) => setWeightGoalWeeks(parseInt(value))}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Süre seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">1 Ay (4 hafta)</SelectItem>
                  <SelectItem value="8">2 Ay (8 hafta)</SelectItem>
                  <SelectItem value="12">3 Ay (12 hafta)</SelectItem>
                  <SelectItem value="16">4 Ay (16 hafta)</SelectItem>
                  <SelectItem value="24">6 Ay (24 hafta)</SelectItem>
                  <SelectItem value="52">1 Yıl (52 hafta)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Hedefinize ulaşmak istediğiniz süre (AI önerileri için kullanılır)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Fiziksel Bilgiler
            </CardTitle>
            <CardDescription>
              Metabolik hesaplamalar için gerekli (BMR, TDEE, BMI)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="heightCm" className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                Boy (cm)
              </Label>
              <Input
                id="heightCm"
                type="number"
                min={100}
                max={250}
                placeholder="Örn: 175"
                value={heightCm ?? ''}
                onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : null)}
                className="max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Yaş</Label>
              <Input
                id="age"
                type="number"
                min={10}
                max={120}
                placeholder="Örn: 30"
                value={age ?? ''}
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : null)}
                className="max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Cinsiyet</Label>
              <Select
                value={gender || ''}
                onValueChange={(value) => setGender(value || null)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Cinsiyet seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkek</SelectItem>
                  <SelectItem value="female">Kadın</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil Bilgileri</CardTitle>
            <CardDescription>
              Görünen adınızı değiştirin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Görünen Ad</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Adınız"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </>
          )}
        </Button>
      </main>
    </div>
  );
};

export default Settings;
