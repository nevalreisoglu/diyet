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
import { Loader2, Save, Target, Droplets } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [targetCalories, setTargetCalories] = useState(1500);
  const [targetWaterMl, setTargetWaterMl] = useState(2000);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          .select('target_calories, target_water_ml, display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setTargetCalories(data.target_calories ?? 1500);
          setTargetWaterMl(data.target_water_ml ?? 2000);
          setDisplayName(data.display_name ?? '');
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

      <main className="container max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
          <p className="text-muted-foreground">Profil ve hedef ayarlarınızı yönetin</p>
        </div>

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
