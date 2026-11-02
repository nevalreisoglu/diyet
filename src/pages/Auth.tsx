import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Mail, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'client' | 'dietitian'>('client');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) throw error;

      toast({
        title: 'E-posta gönderildi!',
        description: 'Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.',
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      const msg = error?.message?.toLowerCase() || '';
      let errorMessage = 'Bir hata oluştu.';
      if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        errorMessage = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.';
      } else if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
        errorMessage = 'Geçerli bir e-posta adresi girin.';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            toast({
              title: 'E-posta onaylanmamış',
              description: 'Lütfen e-posta kutunuzu kontrol edin ve onay linkine tıklayın.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        toast({
          title: 'Hoş geldiniz!',
          description: 'Başarıyla giriş yaptınız.',
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: displayName,
              role,
            },
          },
        });

        if (error) throw error;

        // E-posta onayı gerekiyorsa kullanıcıyı bilgilendir
        if (data.session === null && data.user?.email_confirmed_at === null) {
          toast({
            title: 'Hesap oluşturuldu!',
            description: 'E-posta adresinize bir onay linki gönderdik. Lütfen e-postanızı kontrol edin.',
          });
        } else {
          toast({
            title: 'Hesap oluşturuldu!',
            description: 'Başarıyla kayıt oldunuz.',
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      console.log('Full error details:', JSON.stringify(error, null, 2));
      let errorMessage = 'Bir hata oluştu.';
      
      const msg = error?.message?.toLowerCase() || '';
      const code = error?.code || '';
      
      // Check for specific error conditions based on actual error message/code
      if (msg.includes('email not confirmed')) {
        errorMessage = 'E-postanız onaylanmamış. Lütfen e-posta kutunuzu kontrol edin.';
      } else if (msg.includes('invalid login credentials') || code === 'invalid_credentials') {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (
        msg.includes('user already registered') || 
        msg.includes('already been registered') || 
        code === 'user_already_exists' ||
        code === 'email_exists'
      ) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.';
      } else if (msg.includes('password should be at least') || msg.includes('password') || code === 'weak_password') {
        errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      } else if (msg.includes('invalid email') || msg.includes('unable to validate email') || code === 'validation_failed') {
        errorMessage = 'Geçerli bir e-posta adresi girin.';
      } else if (msg.includes('signup is disabled') || code === 'signup_disabled') {
        errorMessage = 'Kayıt şu anda devre dışı.';
      } else if (msg.includes('email rate limit') || code === 'over_email_send_rate_limit') {
        errorMessage = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.';
      } else if (error?.message) {
        // Show the actual error message for debugging
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
          <p className="text-muted-foreground mt-2">
            {isForgotPassword
              ? 'Şifrenizi sıfırlayın'
              : isLogin
              ? 'Hesabınıza giriş yapın'
              : 'Yeni hesap oluşturun'}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-card animate-slide-up">
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                disabled={loading}
              >
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-foreground">Hesap türü</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'client', label: 'Danışanım', desc: 'Beslenmemi takip edeceğim' },
                      { value: 'dietitian', label: 'Diyetisyenim', desc: 'Danışanlarımı yöneteceğim' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          role === opt.value ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-secondary/50'
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-foreground">
                    Ad Soyad
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Adınız Soyadınız"
                      className="pl-10 bg-background border-input"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">
                    Şifre
                  </Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Şifremi Unuttum
                    </button>
                  )}
                </div>
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

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                disabled={loading}
              >
                {loading ? 'Yükleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-primary hover:underline"
              >
                Giriş sayfasına dön
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin
                  ? 'Hesabınız yok mu? Kayıt olun'
                  : 'Zaten hesabınız var mı? Giriş yapın'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
