import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase, şifre sıfırlama linkine tıklandığında PASSWORD_RECOVERY eventi gönderir
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Eğer zaten oturum açıksa ve PASSWORD_RECOVERY değilse ana sayfaya yönlendir
        // Bu durumu PASSWORD_RECOVERY'den önce yakalamaktan kaçınmak için
        // isReady false ise yönlendirme yapmıyoruz
      }
    });

    // Mevcut session kontrol et - recovery token ile gelindiyse session zaten set edilmiş olabilir
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Şifreler eşleşmiyor.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Hata',
        description: 'Şifre en az 6 karakter olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: 'Şifre güncellendi!',
        description: 'Şifreniz başarıyla değiştirildi. Yönlendiriliyorsunuz...',
      });

      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      const msg = error?.message?.toLowerCase() || '';
      let errorMessage = 'Bir hata oluştu.';
      if (msg.includes('password should be at least') || msg.includes('weak_password')) {
        errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      } else if (msg.includes('same password')) {
        errorMessage = 'Yeni şifre mevcut şifrenizden farklı olmalıdır.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Beslenme Günlüğü</h1>
          <p className="text-muted-foreground mt-2">Yeni şifrenizi belirleyin</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-card animate-slide-up">
          {!isReady ? (
            <div className="text-center py-4 text-muted-foreground">
              Yükleniyor...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Yeni Şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Yeni Şifre (Tekrar)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                disabled={loading}
              >
                {loading ? 'Güncelleniyor...' : 'Şifremi Güncelle'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
